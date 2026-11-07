/**
 * StoryMap — Génération du tracé de parcours (GeoJSON) reliant les étapes
 */

import { Step } from '../types/step';

export function createRouteGeoJSON(steps: Step[]): GeoJSON.FeatureCollection {
  const coordinates = steps
    .filter((s) => !s.hidden && s.camera?.center)
    .map((s) => s.camera.center);

  if (coordinates.length < 2) {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      },
    ],
  };
}

