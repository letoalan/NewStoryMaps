/**
 * StoryMap — Planificateur de vol à rythme constant et zoom adaptatif (zoom.md Z02-Z06)
 */

import { computeSegmentBearing, normalizeLng, shortestDeltaLng, computeAdaptiveFlightDurationMs } from './routeInterpolation';

export type FlightPace = 'slow' | 'normal' | 'fast';
export type ClimbProfile = 'subtle' | 'balanced' | 'ample';

export interface FlightCameraKeyframe {
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface FlightViewport {
  width: number;
  height: number;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
}

export interface FlightPlanSample {
  coordinates: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  progress: number;
  distanceTraveled: number;
  speedPxPerSec: number;
}

export interface FlightPlan {
  totalDistanceDeg: number;
  estimatedDurationMs: number;
  cruiseZoom: number;
  startCamera: FlightCameraKeyframe;
  endCamera: FlightCameraKeyframe;
  pace: FlightPace;
  climbProfile: ClimbProfile;
  timeTable: Array<{ timeMs: number; progress: number; distDeg: number }>;
  sampleAtProgress: (t: number) => FlightPlanSample;
  sampleAtTime: (timeMs: number) => FlightPlanSample;
}

const PACE_SCREEN_FRACTION: Record<FlightPace, number> = { slow: 0.18, normal: 0.35, fast: 0.58 };
const CLIMB_DIP: Record<ClimbProfile, number> = { subtle: -0.4, balanced: 0, ample: 0.7 };

export function shortestAngularDistance(fromDeg: number, toDeg: number): number {
  let diff = (toDeg - fromDeg) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

export function computeFlightCruiseZoom(startZoom: number, endZoom: number, distDeg: number, climb: ClimbProfile = 'balanced', viewportWidth = 1024): number {
  const minEnd = Math.min(startZoom, endZoom);
  if (distDeg < 0.05) return minEnd;
  const vpBonus = Math.max(-1, Math.min(1.5, Math.log2(viewportWidth / 1024)));
  const vScreen = Math.max(100, (viewportWidth || 1024) * (PACE_SCREEN_FRACTION.normal || 0.35));
  const durSec = computeAdaptiveFlightDurationMs(distDeg, 4.8) / 1000;
  const targetCruise = Math.log2((360 * vScreen * durSec) / (256 * Math.max(0.01, distDeg))) + vpBonus;
  // Dézoom plus franc d'au moins 2 à 2.5 niveaux sur trajets interurbains pour sécuriser les tuiles
  const maxClimbZoom = distDeg > 0.8 ? minEnd - 2.0 : minEnd - 0.75;
  return Number(Math.max(1.8, Math.min(maxClimbZoom, targetCruise - (CLIMB_DIP[climb] || 0))).toFixed(2));
}

function sampleZoomProfile(startZ: number, cruiseZ: number, endZ: number, t: number): number {
  if (t <= 0) return startZ;
  if (t >= 1) return endZ;
  const minZ = Math.min(cruiseZ, Math.min(startZ, endZ));
  const dipDepth = Math.max(0, startZ + (endZ - startZ) * t - minZ);
  return startZ + (endZ - startZ) * t - dipDepth * Math.sin(t * Math.PI);
}

export function createFlightPlan(
  coords: Array<[number, number]>,
  startCam: FlightCameraKeyframe,
  endCam: FlightCameraKeyframe,
  viewport: FlightViewport = { width: 1024, height: 768 },
  pace: FlightPace = 'normal',
  climb: ClimbProfile = 'balanced'
): FlightPlan {
  const clean = (coords || []).filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]));
  const pts: Array<[number, number]> = clean.length > 0 ? clean : [startCam.center, endCam.center];
  const segDists: number[] = [];
  let totalDist = 0;

  for (let i = 0; i < pts.length - 1; i++) {
    const dLng = shortestDeltaLng(pts[i][0], pts[i + 1][0]), dLat = pts[i + 1][1] - pts[i][1];
    const meanLatRad = (((pts[i][1] + pts[i + 1][1]) / 2) * Math.PI) / 180;
    const len = Math.hypot(dLng * Math.cos(meanLatRad), dLat);
    segDists.push(len); totalDist += len;
  }

  const cruiseZoom = computeFlightCruiseZoom(startCam.zoom, endCam.zoom, totalDist, climb, viewport.width);
  const pad = viewport.padding || {};
  const usefulWidth = Math.max(320, viewport.width - ((pad.left || 0) + (pad.right || 0)));
  const vScreenPx = Math.max(80, usefulWidth * (PACE_SCREEN_FRACTION[pace] || 0.35));
  const baseDurSec = pace === 'fast' ? 3.6 : pace === 'slow' ? 6.0 : 4.8;
  const estimatedDurationMs = computeAdaptiveFlightDurationMs(totalDist, baseDurSec);

  const STEPS = 64;
  const timeTable: Array<{ timeMs: number; progress: number; distDeg: number }> = [{ timeMs: 0, progress: 0, distDeg: 0 }];
  for (let step = 1; step <= STEPS; step++) {
    const prog = step / STEPS;
    timeTable.push({ timeMs: Math.round(prog * estimatedDurationMs), progress: prog, distDeg: prog * totalDist });
  }

  const sampleAtProgress = (t: number): FlightPlanSample => {
    const p = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
    const zoom = sampleZoomProfile(startCam.zoom, cruiseZoom, endCam.zoom, p);
    const pitch = (startCam.pitch || 0) + ((endCam.pitch || 0) - (startCam.pitch || 0)) * p;
    const targetDist = p * totalDist;
    let accum = 0, coordsSample: [number, number] = pts[0], bearing = endCam.bearing ?? startCam.bearing ?? 0;

    for (let i = 0; i < segDists.length; i++) {
      const segLen = segDists[i];
      if (accum + segLen >= targetDist || i === segDists.length - 1) {
        const localT = segLen > 0 ? Math.max(0, Math.min(1, (targetDist - accum) / segLen)) : 0;
        const dLng = shortestDeltaLng(pts[i][0], pts[i + 1][0]);
        coordsSample = [Number(normalizeLng(pts[i][0] + dLng * localT).toFixed(6)), Number((pts[i][1] + (pts[i + 1][1] - pts[i][1]) * localT).toFixed(6))];
        bearing = computeSegmentBearing(pts[i], pts[i + 1]);
        break;
      }
      accum += segLen;
    }

    if (p >= 0.98 && endCam.bearing !== undefined) {
      bearing = (bearing + shortestAngularDistance(bearing, endCam.bearing) * ((p - 0.98) / 0.02) + 360) % 360;
    }

    return {
      coordinates: coordsSample,
      zoom: Number(zoom.toFixed(2)),
      bearing: Number(bearing.toFixed(1)),
      pitch: Number(pitch.toFixed(1)),
      progress: p,
      distanceTraveled: Number(targetDist.toFixed(6)),
      speedPxPerSec: Math.round(vScreenPx),
    };
  };

  const sampleAtTime = (timeMs: number): FlightPlanSample => {
    if (timeMs <= 0) return sampleAtProgress(0);
    if (timeMs >= estimatedDurationMs) return sampleAtProgress(1);
    for (let i = 0; i < timeTable.length - 1; i++) {
      if (timeMs >= timeTable[i].timeMs && timeMs <= timeTable[i + 1].timeMs) {
        const dt = timeTable[i + 1].timeMs - timeTable[i].timeMs;
        const frac = dt > 0 ? (timeMs - timeTable[i].timeMs) / dt : 0;
        return sampleAtProgress(timeTable[i].progress + (timeTable[i + 1].progress - timeTable[i].progress) * frac);
      }
    }
    return sampleAtProgress(1);
  };

  return { totalDistanceDeg: Number(totalDist.toFixed(6)), estimatedDurationMs, cruiseZoom, startCamera: startCam, endCamera: endCam, pace, climbProfile: climb, timeTable, sampleAtProgress, sampleAtTime };
}
