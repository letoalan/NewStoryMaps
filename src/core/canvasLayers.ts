/**
 * StoryMap — Installation et synchronisation des tracés et marqueurs sur la carte MapLibre (Canvas & Player)
 */

import { Map as MLMap, Marker, GeoJSONSource } from 'maplibre-gl';
import { createRouteGeoJSON, getRouteLayerConfig } from './route';
import { getRouteIconSVG, registerRouteIcon } from './mapIcons';
import { createMarkerElement } from '../components/common/markerElement';

export async function syncRouteLayer(map: MLMap, steps: any[], appearance: any, sourceId = 'story-route'): Promise<void> {
  if ((map as any)._removed || !map.getCanvas()) return;
  const rStyle = appearance?.routeStyle || 'dashed';
  const rColor = appearance?.routeColor || appearance?.accentColor || '#0b7fb0';
  const routeData = createRouteGeoJSON(steps, { style: rStyle, color: rColor });
  const cfg = getRouteLayerConfig(rStyle, rColor);

  const src = map.getSource(sourceId) as GeoJSONSource;
  if (src) {
    src.setData(routeData);
  } else if (rStyle !== 'none') {
    map.addSource(sourceId, { type: 'geojson', data: routeData });
  }

  const lineLayerId = `${sourceId}-line`;
  const symbolLayerId = `${sourceId}-symbols`;

  if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
  if (rStyle !== 'none' && !(map as any)._removed && map.getSource(sourceId)) {
    map.addLayer({ id: lineLayerId, type: 'line', source: sourceId, paint: cfg.paint as any, layout: (cfg.layout || {}) as any });
  }

  if (map.getLayer(symbolLayerId)) map.removeLayer(symbolLayerId);
  const iconSvg = getRouteIconSVG(rStyle, rColor);
  if (iconSvg && rStyle !== 'none') {
    const iconId = `icon-${sourceId}-${rStyle}-${rColor.replace('#', '')}`;
    await registerRouteIcon(map, iconId, iconSvg);
    if (!(map as any)._removed && !map.getLayer(symbolLayerId) && map.getSource(sourceId)) {
      map.addLayer({
        id: symbolLayerId, type: 'symbol', source: sourceId,
        layout: {
          'symbol-placement': 'line', 'symbol-spacing': rStyle === 'airplane' || rStyle === 'ship' ? 120 : 65,
          'icon-image': iconId, 'icon-size': rStyle === 'airplane' || rStyle === 'ship' ? 0.8 : 0.6,
          'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-rotation-alignment': 'map', 'icon-keep-upright': false,
        },
      });
    }
  }
}

export function syncCanvasMarkers(
  map: MLMap,
  steps: any[],
  activeIndex: number,
  appearance: any,
  onSelect: (idx: number) => void,
  onDragEnd?: (lngLat: [number, number]) => void
): Marker[] {
  const col = appearance?.accentColor || '#0b7fb0';
  const shape = appearance?.markerShape || 'pin';
  const showAll = appearance?.showAllMarkers ?? true;
  const markers: Marker[] = [];

  steps.forEach((step, idx) => {
    const isActive = idx === activeIndex;
    if (!showAll && !isActive) return;

    const el = createMarkerElement({ shape, color: col, index: idx, isActive });
    const marker = new Marker({ element: el, draggable: isActive && Boolean(onDragEnd) }).setLngLat(step.camera.center).addTo(map);

    if (isActive && onDragEnd) {
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        onDragEnd([lngLat.lng, lngLat.lat]);
      });
    } else {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect(idx);
      });
    }
    markers.push(marker);
  });
  return markers;
}

