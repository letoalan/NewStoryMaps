/**
 * StoryMap — Interpolation géométrique basée sur la distance et orientation (N4.04 à N4.06)
 *
 * Calcule les distances cumulées d'une polyligne [lng, lat], gère les points doublons,
 * les lignes de longueur nulle, le passage de l'antiméridien (±180°) et l'orientation (cap).
 */

export interface PathSegmentMetric {
  from: [number, number];
  to: [number, number];
  length: number;
  cumulativeStart: number;
  cumulativeEnd: number;
  bearing: number;
}

export interface PathMetrics {
  cleanCoords: Array<[number, number]>;
  segments: PathSegmentMetric[];
  totalLength: number;
}

export interface PathSamplePoint {
  coordinates: [number, number];
  bearing: number;
  progress: number;
  segmentIndex: number;
  distanceTraveled: number;
}

/**
 * Normalise un écart de longitude pour traverser proprement l'antiméridien (±180°).
 */
export function shortestDeltaLng(lng1: number, lng2: number): number {
  let d = lng2 - lng1;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export function normalizeLng(lng: number): number {
  let res = lng;
  while (res > 180) res -= 360;
  while (res < -180) res += 360;
  return res;
}

/**
 * Calcule le cap en degrés [0, 360[ entre deux points [lng, lat] (0° = Nord, 90° = Est).
 */
export function computeSegmentBearing(from: [number, number], to: [number, number]): number {
  const dLng = shortestDeltaLng(from[0], to[0]);
  const dLat = to[1] - from[1];
  if (Math.abs(dLng) < 1e-9 && Math.abs(dLat) < 1e-9) return 0;
  const meanLatRad = (((from[1] + to[1]) / 2) * Math.PI) / 180;
  const x = dLng * Math.cos(meanLatRad);
  const y = dLat;
  const angleRad = Math.atan2(x, y);
  const deg = (angleRad * 180) / Math.PI;
  return Number(((deg + 360) % 360).toFixed(2));
}

/**
 * Précalcule les métriques de distance cumulée d'une polyligne en filtrant les doublons consécutifs.
 */
export function computePathMetrics(rawCoords: Array<[number, number]>): PathMetrics {
  const valid = (rawCoords || []).filter(
    (c) => Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
  );
  if (valid.length === 0) {
    return { cleanCoords: [[0, 0]], segments: [], totalLength: 0 };
  }

  const cleanCoords: Array<[number, number]> = [valid[0]];
  for (let i = 1; i < valid.length; i++) {
    const prev = cleanCoords[cleanCoords.length - 1];
    const cur = valid[i];
    const dLng = shortestDeltaLng(prev[0], cur[0]);
    const dLat = cur[1] - prev[1];
    if (Math.hypot(dLng, dLat) > 1e-7) {
      cleanCoords.push(cur);
    }
  }

  const segments: PathSegmentMetric[] = [];
  let cumulative = 0;

  for (let i = 0; i < cleanCoords.length - 1; i++) {
    const from = cleanCoords[i];
    const to = cleanCoords[i + 1];
    const dLng = shortestDeltaLng(from[0], to[0]);
    const dLat = to[1] - from[1];
    const meanLatRad = (((from[1] + to[1]) / 2) * Math.PI) / 180;
    const len = Math.hypot(dLng * Math.cos(meanLatRad), dLat);
    if (len <= 1e-9) continue;
    const bearing = computeSegmentBearing(from, to);
    segments.push({
      from,
      to,
      length: len,
      cumulativeStart: cumulative,
      cumulativeEnd: cumulative + len,
      bearing,
    });
    cumulative += len;
  }

  return {
    cleanCoords,
    segments,
    totalLength: cumulative,
  };
}

/**
 * Échantillonne la position exacte et le cap à une progression `progress` dans [0, 1] basée sur la distance.
 */
export function interpolateAlongPath(metrics: PathMetrics, progress: number): PathSamplePoint {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  if (metrics.segments.length === 0 || metrics.totalLength <= 0) {
    const pt = metrics.cleanCoords[0] || [0, 0];
    return { coordinates: [pt[0], pt[1]], bearing: 0, progress: clamped, segmentIndex: 0, distanceTraveled: 0 };
  }

  const targetDist = clamped * metrics.totalLength;
  const seg =
    metrics.segments.find((s) => targetDist <= s.cumulativeEnd + 1e-9) ||
    metrics.segments[metrics.segments.length - 1];
  const segIdx = metrics.segments.indexOf(seg);
  const localT = seg.length > 0 ? Math.max(0, Math.min(1, (targetDist - seg.cumulativeStart) / seg.length)) : 0;

  const dLng = shortestDeltaLng(seg.from[0], seg.to[0]);
  const lng = normalizeLng(seg.from[0] + dLng * localT);
  const lat = seg.from[1] + (seg.to[1] - seg.from[1]) * localT;

  return {
    coordinates: [Number(lng.toFixed(6)), Number(lat.toFixed(6))],
    bearing: seg.bearing,
    progress: clamped,
    segmentIndex: Math.max(0, segIdx),
    distanceTraveled: Number(targetDist.toFixed(6)),
  };
}

/**
 * Découpe la polyligne de 0 jusqu'à `progress` pour la révélation progressive du tracé (N4.09).
 */
export function slicePathByProgress(metrics: PathMetrics, progress: number): Array<[number, number]> {
  const sample = interpolateAlongPath(metrics, progress);
  if (metrics.segments.length === 0) return [sample.coordinates];
  const coords: Array<[number, number]> = [metrics.segments[0].from];
  for (let i = 0; i < sample.segmentIndex; i++) {
    coords.push(metrics.segments[i].to);
  }
  coords.push(sample.coordinates);
  return coords;
}

