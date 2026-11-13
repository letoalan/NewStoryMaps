/**
 * StoryMap — Chemin caméra/véhicule d'un déplacement entre deux étapes (Mode 1).
 *
 * Modèle de van Wijk & Nuij (« Smooth and efficient zooming and panning », celui de flyTo) :
 * la durée est proportionnelle à la longueur S du chemin dans l'espace (position, échelle),
 * qui combine la distance parcourue ET le changement d'échelle. Position du véhicule et zoom
 * dépendent de la même abscisse s : la caméra reste centrée sur le véhicule, carte orientée Nord.
 *
 * IMPORTANT : la fonction est autonome (aucune dépendance externe) car sa source est injectée
 * telle quelle dans l'export HTML autonome (publish.ts) via Function.prototype.toString().
 */

export type StoryLegPace = 'slow' | 'normal' | 'fast';

export interface StoryLegCamera {
  center: [number, number];
  zoom: number;
  pitch?: number;
}

export interface StoryLegSample {
  coordinates: [number, number];
  zoom: number;
  /** Cap écran du véhicule (degrés, 0 = Nord) — carte toujours orientée Nord. */
  heading: number;
  pitch: number;
  progress: number;
}

export interface StoryLegPath {
  durationMs: number;
  pathLength: number;
  cruiseZoom: number;
  sampleAtProgress: (t: number) => StoryLegSample;
}

export function createStoryLegPath(
  route: Array<[number, number]>,
  startCam: StoryLegCamera,
  endCam: StoryLegCamera,
  viewportWidth: number,
  pace?: string
): StoryLegPath {
  const RHO = 1.42, RHO2 = RHO * RHO, TILE = 256, MIN_ZOOM = 1.5;
  const SPEED = pace === 'slow' ? 0.6 : pace === 'fast' ? 1.3 : 0.9; // unités de chemin S par seconde
  const MIN_MS = 1500, MAX_MS = 14000;
  const toRad = Math.PI / 180;
  const finite = (c: any) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]);
  const dLng = (a: number, b: number) => { let d = (b - a) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
  const project = (lng: number, lat: number): [number, number] => {
    const s = Math.sin(Math.max(-85.05, Math.min(85.05, lat)) * toRad);
    return [((lng + 180) / 360) * TILE, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE];
  };
  const unproject = (x: number, y: number): [number, number] => {
    let lng = (x / TILE) * 360 - 180;
    lng = ((((lng + 180) % 360) + 360) % 360) - 180;
    const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / TILE))) / toRad;
    return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
  };

  // Tracé projeté en Mercator (longitudes déroulées pour franchir l'antiméridien)
  const raw = (route || []).filter(finite);
  const pts: Array<[number, number]> = raw.length >= 2 ? raw : [startCam.center, endCam.center];
  const proj: Array<[number, number]> = [];
  let lngAcc = pts[0][0];
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) lngAcc += dLng(pts[i - 1][0], pts[i][0]);
    proj.push(project(lngAcc, pts[i][1]));
  }
  const segLen: number[] = [];
  let u1 = 0;
  for (let i = 0; i < proj.length - 1; i++) {
    const l = Math.hypot(proj[i + 1][0] - proj[i][0], proj[i + 1][1] - proj[i][1]);
    segLen.push(l); u1 += l;
  }

  const vw = Math.max(320, viewportWidth || 1024);
  const z0 = Number.isFinite(startCam.zoom) ? startCam.zoom : 10, z1 = Number.isFinite(endCam.zoom) ? endCam.zoom : z0;
  const w0 = vw / Math.pow(2, z0), w1 = vw / Math.pow(2, z1);

  let S = 0;
  let wAt = (s: number) => w0 * Math.exp((w1 < w0 ? -1 : 1) * RHO * s);
  let uAt = (_s: number) => 0;
  const zoomOnly = u1 / Math.max(w0, w1) < 1e-6;
  if (zoomOnly) {
    S = Math.abs(Math.log(w1 / w0)) / RHO;
  } else {
    const b = (i: number) => (w1 * w1 - w0 * w0 + (i ? -1 : 1) * RHO2 * RHO2 * u1 * u1) / (2 * (i ? w1 : w0) * RHO2 * u1);
    const r = (i: number) => { const bi = b(i); return Math.log(Math.sqrt(bi * bi + 1) - bi); };
    const r0 = r(0);
    S = (r(1) - r0) / RHO;
    wAt = (s: number) => (w0 * Math.cosh(r0)) / Math.cosh(r0 + RHO * s);
    uAt = (s: number) => (w0 * (Math.cosh(r0) * Math.tanh(r0 + RHO * s) - Math.sinh(r0))) / RHO2;
    if (!Number.isFinite(S)) { S = Math.abs(Math.log(w1 / w0)) / RHO + u1 / Math.max(w0, w1); uAt = (s: number) => (S > 0 ? (s / S) * u1 : 0); wAt = () => Math.max(w0, w1); }
  }
  const durationMs = Math.round(Math.max(MIN_MS, Math.min(MAX_MS, (1000 * S) / SPEED)));
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const p0 = startCam.pitch || 0, p1 = endCam.pitch || 0;

  const sampleAtProgress = (t: number): StoryLegSample => {
    const p = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
    const s = S * ease(p);
    const frac = p >= 1 ? 1 : zoomOnly || u1 <= 0 ? ease(p) : Math.max(0, Math.min(1, uAt(s) / u1));
    let target = frac * u1, idx = 0;
    while (idx < segLen.length - 1 && target > segLen[idx]) { target -= segLen[idx]; idx++; }
    const a = proj[idx], c = proj[Math.min(idx + 1, proj.length - 1)];
    const lt = segLen[idx] > 0 ? Math.max(0, Math.min(1, target / segLen[idx])) : 0;
    const x = a[0] + (c[0] - a[0]) * lt, y = a[1] + (c[1] - a[1]) * lt;
    const heading = (Math.atan2(c[0] - a[0], -(c[1] - a[1])) / toRad + 360) % 360;
    const zoom = p <= 0 ? z0 : p >= 1 ? z1 : Math.max(Math.min(MIN_ZOOM, z0, z1), Math.log2(vw / wAt(s)));
    return {
      coordinates: p >= 1 ? [endCam.center[0], endCam.center[1]] : unproject(x, y),
      zoom: Number(zoom.toFixed(3)),
      heading: Number(heading.toFixed(1)),
      pitch: p0 + (p1 - p0) * p,
      progress: p,
    };
  };

  const cruise = zoomOnly ? Math.min(z0, z1) : Math.log2(vw / Math.max(wAt(S / 2), w0, w1));
  return { durationMs, pathLength: Number(S.toFixed(4)), cruiseZoom: Number(cruise.toFixed(2)), sampleAtProgress };
}

