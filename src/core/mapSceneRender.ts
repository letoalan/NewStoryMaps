/**
 * StoryMap — Rendu GeoJSON (Point, LineString, Polygon) des scènes cartographiques (V02 / V03)
 */

import { Map as MLMap, Marker, GeoJSONSource } from 'maplibre-gl';
import type { MapFeature, ProjectMap } from '../types/project';
import type { RouteLineStyle } from '../types/story';
import { expandRouteCoordsByStyle } from './route';

export interface SceneGeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: unknown;
  };
  properties: {
    id: string;
    name: string;
    color: string;
    highlighted: boolean;
    numberIndex: number;
  };
}

export interface SceneFeatureCollection {
  type: 'FeatureCollection';
  features: SceneGeoJSONFeature[];
}

/** Calcule le centre géographique [lng, lat] d'une entité Point, LineString ou Polygon */
export function getFeatureCenter(f: MapFeature): [number, number] | null {
  const c = f.coordinates as any;
  if (!Array.isArray(c) || c.length === 0) return null;

  if (f.geometryType === 'Point') {
    if (typeof c[0] === 'number' && typeof c[1] === 'number') return [c[0], c[1]];
    return null;
  }

  if (f.geometryType === 'LineString') {
    const pts = Array.isArray(c[0]) ? c : [];
    if (pts.length === 0) return null;
    const mid = pts[Math.floor(pts.length / 2)];
    return typeof mid?.[0] === 'number' && typeof mid?.[1] === 'number' ? [mid[0], mid[1]] : null;
  }

  if (f.geometryType === 'Polygon') {
    const ring = Array.isArray(c[0]) && Array.isArray(c[0][0]) ? c[0] : Array.isArray(c[0]) ? c : [];
    if (ring.length === 0) return null;
    let sumLng = 0;
    let sumLat = 0;
    let count = 0;
    for (const pt of ring) {
      if (typeof pt?.[0] === 'number' && typeof pt?.[1] === 'number') {
        sumLng += pt[0];
        sumLat += pt[1];
        count++;
      }
    }
    return count > 0 ? [sumLng / count, sumLat / count] : null;
  }
  return null;
}

/** Construit la FeatureCollection GeoJSON des lignes et polygones visibles d'une scène */
export function buildSceneGeoJSON(
  projectMap: ProjectMap,
  highlightedFeatureId?: string,
  routeStyle?: RouteLineStyle
): SceneFeatureCollection {
  const features: SceneGeoJSONFeature[] = [];

  for (const layer of projectMap.layers || []) {
    if (!layer.visible) continue;
    for (const f of layer.features || []) {
      const isHighlighted = Boolean(highlightedFeatureId && f.id === highlightedFeatureId);
      const color = isHighlighted ? '#e11d48' : f.color || layer.color || '#0b7fb0';
      const coords = f.geometryType === 'LineString' && Array.isArray(f.coordinates)
        ? expandRouteCoordsByStyle(f.coordinates as Array<[number, number]>, routeStyle)
        : f.coordinates;
      features.push({
        type: 'Feature',
        geometry: {
          type: f.geometryType,
          coordinates: coords,
        },
        properties: {
          id: f.id,
          name: f.name,
          color,
          highlighted: isHighlighted,
          numberIndex: f.numberIndex || 1,
        },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

/** Affiche les couches LineString, Polygon et marqueurs Point sur une carte MapLibre */
export function renderSceneLayersOnMap(
  map: MLMap,
  projectMap: ProjectMap,
  highlightedFeatureId?: string,
  draftVertices?: [number, number][],
  routeStyle?: RouteLineStyle
): Marker[] {
  const markers: Marker[] = [];
  const geojson = buildSceneGeoJSON(projectMap, highlightedFeatureId, routeStyle);

  if (draftVertices && draftVertices.length >= 2) {
    geojson.features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: draftVertices },
      properties: { id: 'draft-line', name: 'Tracé en cours', color: '#f59e0b', highlighted: true, numberIndex: 0 },
    });
  }

  const applyLayers = () => {
    if ((map as any)._removed || !map.getCanvas()) return;
    const src = map.getSource('scene-shapes') as GeoJSONSource | undefined;
    if (src) {
      src.setData(geojson as any);
    } else {
      map.addSource('scene-shapes', { type: 'geojson', data: geojson as any });
    }

    if (!map.getLayer('scene-polygons-fill')) {
      map.addLayer({
        id: 'scene-polygons-fill',
        type: 'fill',
        source: 'scene-shapes',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['case', ['boolean', ['get', 'highlighted'], false], 0.45, 0.25],
        },
      });
    }

    if (!map.getLayer('scene-polygons-outline')) {
      map.addLayer({
        id: 'scene-polygons-outline',
        type: 'line',
        source: 'scene-shapes',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['boolean', ['get', 'highlighted'], false], 3.5, 2],
        },
      });
    }

    if (!map.getLayer('scene-lines-layer')) {
      map.addLayer({
        id: 'scene-lines-layer',
        type: 'line',
        source: 'scene-shapes',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['boolean', ['get', 'highlighted'], false], 5, 3.5],
        },
      });
    }
  };

  if (map.isStyleLoaded()) applyLayers();
  else map.once('style.load', applyLayers);

  // Marqueurs DOM numérotés pour les entités Point et centroïdes annotés
  for (const layer of projectMap.layers || []) {
    if (!layer.visible) continue;
    for (const f of layer.features || []) {
      const center = getFeatureCenter(f);
      if (!center) continue;
      const isHighlighted = Boolean(highlightedFeatureId && f.id === highlightedFeatureId);
      const color = isHighlighted ? '#e11d48' : f.color || layer.color || '#0b7fb0';

      const el = document.createElement('div');
      el.style.cssText = `width:${ isHighlighted ? 26 : 22 }px;height:${ isHighlighted ? 26 : 22 }px;border-radius:50%;background:${color};color:#fff;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;`;
      el.textContent = String(f.numberIndex || 1);
      el.title = `${f.name} (${f.geometryType})`;

      markers.push(new Marker({ element: el }).setLngLat(center).addTo(map));
    }
  }

  return markers;
}

