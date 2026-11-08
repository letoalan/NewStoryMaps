/**
 * StoryMap — Bloc Carte intégrée avec rendu GeoJSON complet, caméra synchronisée & crédits (V02/V03)
 */

import React, { useEffect, useRef } from 'react';
import { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Block, ProjectMap } from '../../../types/project';
import { useStory } from '../../../context/StoryContext';
import { resolveMapStyle } from '../../../types/map';
import { createDefaultProjectMap, findFeatureInMap } from '../../../core/mapScene';
import { renderSceneLayersOnMap, getFeatureCenter } from '../../../core/mapSceneRender';
import { Link2 } from 'lucide-react';

interface MapBlockPreviewProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
}

export const MapBlockPreview: React.FC<MapBlockPreviewProps> = ({ block, onChange, isEditable = true }) => {
  const { story } = useStory();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const mapTitle = (block.data.title as string) || 'Carte interactive';
  const caption = (block.data.caption as string) || '';
  const binding = block.binding;

  const maps: ProjectMap[] = story?.maps && story.maps.length > 0 ? story.maps : [createDefaultProjectMap()];
  const targetMap = maps.find((m) => m.id === binding?.mapId) || maps.find((m) => m.id === (block.data.mapId as string)) || maps[0];

  useEffect(() => {
    if (!mapContainerRef.current) return;
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

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [targetMap.id, targetMap.mapStyle]);

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

  // V02 : Rendu des Points, LineStrings, Polygons et focus de liaison narrative
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = renderSceneLayersOnMap(map, targetMap, binding?.targetFeatureId);

    if (binding?.targetFeatureId && binding?.action === 'zoom') {
      const feat = findFeatureInMap(targetMap, binding.targetFeatureId);
      const center = feat ? getFeatureCenter(feat) : null;
      if (center) {
        map.flyTo({ center, zoom: 14, pitch: targetMap.view?.pitch || 0, bearing: targetMap.view?.bearing || 0, essential: true });
      }
    }
  }, [targetMap, binding?.targetFeatureId, binding?.action]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', borderRadius: 'var(--r)' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: '120px' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
        {binding && (
          <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(11, 127, 176, 0.92)', color: '#fff', padding: '3px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, zIndex: 10 }}>
            <Link2 size={11} /> <span>{binding.numberIndex ? `#${binding.numberIndex} ` : ''}{binding.action || 'focus'}</span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: '4px', right: '6px', background: 'rgba(255,255,255,0.85)', color: '#334155', padding: '1px 5px', borderRadius: '3px', fontSize: '9px', zIndex: 10, pointerEvents: 'none' }}>
          {caption ? `${caption} · ` : ''}© OpenStreetMap · © CARTO
        </div>
      </div>

      {isEditable && (
        <div style={{ padding: '6px 8px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
          <input
            type="text" className="input" value={mapTitle} placeholder="Titre de la carte…"
            onChange={(e) => onChange({ title: e.target.value })}
            style={{ width: '45%', fontSize: '11px', height: '24px' }}
          />
          <input
            type="text" className="input" value={caption} placeholder="Légende / crédit cartographique…"
            onChange={(e) => onChange({ caption: e.target.value })}
            style={{ flex: 1, fontSize: '11px', height: '24px' }}
          />
        </div>
      )}
    </div>
  );
};
