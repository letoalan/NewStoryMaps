/**
 * StoryMap — Bloc Carte intégrée avec rendu GeoJSON complet, caméra synchronisée & crédits (V02/V03)
 */

import React, { useEffect, useRef } from 'react';
import { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Block, ProjectMap } from '../../../types/project';
import { ResolvedVisualStyle } from '../../../types/theme';
import { isDarkColor } from '../../../core/themeResolver';
import { useStory } from '../../../context/StoryContext';
import { resolveMapStyle } from '../../../types/map';
import { createDefaultProjectMap, findFeatureInMap } from '../../../core/mapScene';
import { renderSceneLayersOnMap, getFeatureCenter } from '../../../core/mapSceneRender';
import { expandRouteCoordsByStyle } from '../../../core/route';
import { computeSegmentBearing, computePathMetrics, computeAdaptiveFlightDurationMs, computeReadableCruiseZoom } from '../../../core/routeInterpolation';
import { createVehicleController, createTwoLevelVehicleDomElement, VehicleController } from '../../../core/vehicleController';
import { Link2 } from 'lucide-react';

interface MapBlockPreviewProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
  visualStyle?: ResolvedVisualStyle;
}

export const MapBlockPreview: React.FC<MapBlockPreviewProps> = ({ block, onChange, isEditable = true, visualStyle }) => {
  const { story } = useStory();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const vehicleCtrlRef = useRef<VehicleController | null>(null);
  const vehicleMarkerRef = useRef<Marker | null>(null);
  const currentStyleRef = useRef<string>(story?.mapStyle || '');

  const mapTitle = (block.data.title as string) || 'Carte interactive';
  const caption = (block.data.caption as string) || '';
  const binding = block.binding;

  const maps: ProjectMap[] = story?.maps && story.maps.length > 0 ? story.maps : [createDefaultProjectMap()];
  const requestedMapId = (binding?.mapId || block.data.mapId) as string | undefined;
  const isMapMissing = !!requestedMapId && !maps.some((m) => m.id === requestedMapId);
  const targetMap: ProjectMap = (!isMapMissing && requestedMapId ? maps.find((m) => m.id === requestedMapId) : maps[0]) || maps[0];
  const isDark = isDarkColor(visualStyle?.surfaceBackground || visualStyle?.pageBackground);

  useEffect(() => {
    if (!mapContainerRef.current || isMapMissing) return;
    mapContainerRef.current.innerHTML = '';

    const v = targetMap.view || { center: [2.3522, 48.8566], zoom: 11, pitch: 0, bearing: 0 };
    const map = new MLMap({
      container: mapContainerRef.current,
      style: resolveMapStyle(targetMap.mapStyle),
      center: v.center,
      zoom: v.zoom,
      pitch: v.pitch || 0,
      bearing: v.bearing || 0,
      interactive: true,
      attributionControl: false,
    });
    currentStyleRef.current = targetMap.mapStyle;
    map.on('dragstart', () => vehicleCtrlRef.current?.notifyUserMapInteraction());
    map.on('zoomstart', () => vehicleCtrlRef.current?.notifyUserMapInteraction());
    mapRef.current = map;

    return () => {
      vehicleCtrlRef.current?.destroy();
      vehicleMarkerRef.current?.remove();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [targetMap.id, isMapMissing]);

  // Synchronisation dynamique du style sans perte de contexte WebGL
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !targetMap.mapStyle || (map as any)._removed) return;
    if (currentStyleRef.current === targetMap.mapStyle) return;
    currentStyleRef.current = targetMap.mapStyle;
    map.setStyle(resolveMapStyle(targetMap.mapStyle));
    const handleStyleLoad = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = renderSceneLayersOnMap(map, targetMap, binding?.targetFeatureId, undefined, story?.appearance?.routeStyle);
    };
    if (map.isStyleLoaded()) handleStyleLoad();
    else map.once('style.load', handleStyleLoad);
  }, [targetMap.mapStyle]);

  // V03 : Synchronisation complète de la vue enregistrée (centre, zoom, pitch, bearing)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !targetMap.view) return;
    if (binding?.targetFeatureId && binding?.action === 'zoom') return;
    map.easeTo({
      center: targetMap.view.center,
      zoom: targetMap.view.zoom,
      pitch: targetMap.view.pitch || 0,
      bearing: targetMap.view.bearing || 0,
      duration: 600,
    });
  }, [targetMap.view?.center?.[0], targetMap.view?.center?.[1], targetMap.view?.zoom, targetMap.view?.pitch, targetMap.view?.bearing]);

  // V02 & N4 : Rendu des Points, LineStrings, Polygons, véhicule centré et focus de liaison narrative
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const rStyle = story?.appearance?.routeStyle;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = renderSceneLayersOnMap(map, targetMap, binding?.targetFeatureId, undefined, rStyle);

    vehicleCtrlRef.current?.destroy();
    vehicleMarkerRef.current?.remove();
    vehicleMarkerRef.current = null;

    const lineFeat = targetMap.layers?.flatMap((l) => (l.visible ? l.features : [])).find((f) => f.geometryType === 'LineString' && Array.isArray(f.coordinates) && f.coordinates.length >= 2);
    const animCfg = lineFeat?.routeAnimation || targetMap.routeAnimation || story?.routeAnimation;
    if (!isEditable && lineFeat && animCfg && animCfg.enabled && animCfg.vehicle !== 'none') {
      const coords = expandRouteCoordsByStyle(lineFeat.coordinates as Array<[number, number]>, rStyle);
      const totalDeg = computePathMetrics(coords).totalLength;
      const adaptiveSec = computeAdaptiveFlightDurationMs(totalDeg, animCfg.durationSec || 4) / 1000;
      const baseZoom = targetMap.view?.zoom || 11;
      const initBrg = coords.length >= 2 ? computeSegmentBearing(coords[0], coords[1]) : 0;
      const { wrapper, innerIcon } = createTwoLevelVehicleDomElement(document, animCfg, lineFeat.color || story?.appearance?.accentColor || '#0b7fb0', initBrg);
      const mk = new Marker({ element: wrapper }).setLngLat(coords[0]).addTo(map);
      vehicleMarkerRef.current = mk;
      if (animCfg.cameraFollow !== false) map.jumpTo({ center: coords[0], zoom: baseZoom });
      const ctrl = createVehicleController({
        coords,
        config: { ...animCfg, durationSec: adaptiveSec, cameraFollow: animCfg.cameraFollow !== false },
        onSample: (sample) => {
          mk.setLngLat(sample.coordinates);
          if (animCfg.orientToRoute !== false) innerIcon.style.transform = `rotate(${sample.bearing}deg)`;
          if (ctrl.isCameraFollowActive()) map.jumpTo({ center: sample.coordinates, zoom: computeReadableCruiseZoom(baseZoom, baseZoom, totalDeg, ctrl.getProgress()) });
        },
      });
      vehicleCtrlRef.current = ctrl;
      ctrl.play();
    } else if (binding?.targetFeatureId && binding?.action === 'zoom') {
      const feat = findFeatureInMap(targetMap, binding.targetFeatureId);
      const center = feat ? getFeatureCenter(feat) : null;
      if (center) {
        map.flyTo({ center, zoom: 14, pitch: targetMap.view?.pitch || 0, bearing: targetMap.view?.bearing || 0, essential: true });
      }
    }
  }, [targetMap, binding?.targetFeatureId, binding?.action, isEditable, story?.routeAnimation, story?.appearance?.routeStyle]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', borderRadius: visualStyle?.radiusCss ?? 'var(--r)' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: '120px' }}>
        {isMapMissing ? (
          <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', color: '#f87171', fontSize: '12px', padding: '12px', textAlign: 'center' }}>
            Scène cartographique &quot;{requestedMapId}&quot; introuvable
          </div>
        ) : (
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
        )}
        {binding && (
          <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(11, 127, 176, 0.92)', color: '#fff', padding: '3px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, zIndex: 10 }}>
            <Link2 size={11} /> <span>{binding.numberIndex ? `#${binding.numberIndex} ` : ''}{binding.action || 'focus'}</span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: '4px', right: '6px', background: isDark ? 'rgba(17,24,39,0.88)' : 'rgba(255,255,255,0.85)', color: isDark ? '#e2e8f0' : '#334155', padding: '1px 5px', borderRadius: '3px', fontSize: '9px', zIndex: 10, pointerEvents: 'none' }}>
          {caption ? `${caption} · ` : ''}© OpenStreetMap · © CARTO
        </div>
      </div>

      {isEditable && (
        <div style={{ padding: '4px 6px', background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.08)', borderTop: `1px solid ${visualStyle?.borderColor || 'rgba(148, 163, 184, 0.25)'}`, display: 'flex', gap: '6px' }}>
          <input
            type="text" value={mapTitle} placeholder="Titre de la carte…" onChange={(e) => onChange({ title: e.target.value })}
            style={{ width: '45%', fontSize: '11px', height: '22px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)', color: visualStyle?.textColor || 'inherit', border: `1px solid ${visualStyle?.borderColor || 'rgba(148,163,184,0.35)'}`, borderRadius: '4px', padding: '0 6px', outline: 'none' }}
          />
          <input
            type="text" value={caption} placeholder="Légende / crédit cartographique…" onChange={(e) => onChange({ caption: e.target.value })}
            style={{ flex: 1, fontSize: '11px', height: '22px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)', color: visualStyle?.textColor || 'inherit', border: `1px solid ${visualStyle?.borderColor || 'rgba(148,163,184,0.35)'}`, borderRadius: '4px', padding: '0 6px', outline: 'none' }}
          />
        </div>
      )}
    </div>
  );
};
