/**
 * StoryMap — Tracé de parcours multi-styles, courbes géodésiques et animations (Indiana Jones / Navire)
 */

import { Step } from '../types/step';
import { RouteLineStyle } from '../types/story';

export interface RouteOptions {
  style?: RouteLineStyle;
  color?: string;
}

// Calcul de points intermédiaires incurvés (arc de cercle / Bézier)
function interpolateCurvedPoints(p1: [number, number], p2: [number, number], segments = 16): [number, number][] {
  const [lng1, lat1] = p1;
  const [lng2, lat2] = p2;
  const midLng = (lng1 + lng2) / 2;
  const midLat = (lat1 + lat2) / 2;

  // Déflexion perpendiculaire pour donner un arc élégant
  const dLng = lng2 - lng1;
  const dLat = lat2 - lat1;
  const distance = Math.hypot(dLng, dLat);
  if (distance < 0.001) return [p1, p2];

  const curvature = 0.18;
  const ctrlLng = midLng - dLat * curvature;
  const ctrlLat = midLat + dLng * curvature;

  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Bézier quadratique B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const curLng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * ctrlLng + t * t * lng2;
    const curLat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * ctrlLat + t * t * lat2;
    points.push([curLng, curLat]);
  }
  return points;
}

export function createRouteGeoJSON(steps: Step[], options?: RouteOptions): GeoJSON.FeatureCollection {
  const style = options?.style || 'dashed';
  if (style === 'none') {
    return { type: 'FeatureCollection', features: [] };
  }

  const baseCoords = steps
    .filter((s) => !s.hidden && s.camera?.center)
    .map((s) => s.camera.center);

  if (baseCoords.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  const isCurved = style === 'curved' || style === 'airplane' || style === 'ship';
  let coordinates: [number, number][] = [];

  if (isCurved) {
    for (let i = 0; i < baseCoords.length - 1; i++) {
      const arc = interpolateCurvedPoints(baseCoords[i], baseCoords[i + 1]);
      if (i > 0) arc.shift(); // éviter les doublons au raccordement
      coordinates.push(...arc);
    }
  } else {
    coordinates = baseCoords;
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { style },
        geometry: {
          type: 'LineString',
          coordinates,
        },
      },
    ],
  };
}

export interface RouteLayerConfig {
  paint: Record<string, unknown>;
  layout: Record<string, unknown>;
}

export function getRouteLayerConfig(style: RouteLineStyle = 'dashed', color = '#0b7fb0'): RouteLayerConfig {
  const defaultPaint: Record<string, unknown> = {
    'line-color': color,
    'line-width': 3,
    'line-opacity': 0.85,
  };
  const defaultLayout: Record<string, unknown> = {
    'line-join': 'round',
    'line-cap': 'round',
  };

  switch (style) {
    case 'solid':
      return { paint: defaultPaint, layout: defaultLayout };
    case 'dotted':
      return {
        paint: { ...defaultPaint, 'line-width': 4, 'line-dasharray': [1, 2] },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      };
    case 'arrow':
      return {
        paint: { ...defaultPaint, 'line-width': 3.5, 'line-dasharray': [4, 3] },
        layout: { 'line-join': 'round' },
      };
    case 'double-arrow':
      return {
        paint: { ...defaultPaint, 'line-width': 4, 'line-dasharray': [2, 2, 6, 2] },
        layout: defaultLayout,
      };
    case 'airplane':
      // Style Indiana Jones : tracé pointillé rouge brique dynamique
      return {
        paint: {
          'line-color': color === '#0b7fb0' ? '#dc2626' : color,
          'line-width': 3.5,
          'line-dasharray': [4, 2],
        },
        layout: defaultLayout,
      };
    case 'ship':
      // Style Croisière : tracé maritime cyan / outremer
      return {
        paint: {
          'line-color': color === '#0b7fb0' ? '#0284c7' : color,
          'line-width': 3,
          'line-dasharray': [5, 3],
        },
        layout: defaultLayout,
      };
    case 'curved':
      return {
        paint: { ...defaultPaint, 'line-width': 3, 'line-dasharray': [3, 2] },
        layout: defaultLayout,
      };
    case 'dashed':
    default:
      return {
        paint: { ...defaultPaint, 'line-dasharray': [4, 2] },
        layout: defaultLayout,
      };
  }
}
