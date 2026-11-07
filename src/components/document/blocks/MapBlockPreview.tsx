/**
 * StoryMap — Bloc Carte intégrée avec vue MapLibre GL & liaisons narratives (P2 / P3)
 */

import React, { useEffect, useRef } from 'react';
import { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Block, ProjectMap } from '../../../types/project';
import { useStory } from '../../../context/StoryContext';
import { resolveMapStyle } from '../../../types/map';
import { createDefaultProjectMap } from '../../../core/mapScene';
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

  // Résolution de la scène ProjectMap
  const maps: ProjectMap[] = story?.maps && story.maps.length > 0 ? story.maps : [createDefaultProjectMap()];
  const targetMap = maps.find((m) => m.id === binding?.mapId) || maps.find((m) => m.id === (block.data.mapId as string)) || maps[0];

  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapContainerRef.current.innerHTML = '';

    const center = targetMap.view?.center || [2.3522, 48.8566];
    const zoom = targetMap.view?.zoom || 11;

    const map = new MLMap({
      container: mapContainerRef.current,
      style: resolveMapStyle(targetMap.mapStyle),
      center,
      zoom,
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

  // Synchronisation des objets et focus de liaison narrative
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    let focusedCoords: [number, number] | null = null;

    (targetMap.layers || []).forEach((layer) => {
      if (!layer.visible) return;
      (layer.features || []).forEach((f) => {
        const coords = Array.isArray(f.coordinates[0]) ? (f.coordinates as any)[0] : f.coordinates;
        const pt = Array.isArray(coords[0]) ? coords[0] : coords;
        if (typeof pt[0] === 'number' && typeof pt[1] === 'number') {
          const isTarget = binding?.targetFeatureId === f.id;
          const color = isTarget ? '#e11d48' : f.color || layer.color || '#0b7fb0';
          const marker = new Marker({ color }).setLngLat([pt[0], pt[1]]).addTo(map);
          markersRef.current.push(marker);
          if (isTarget) focusedCoords = [pt[0], pt[1]];
        }
      });
    });

    if (focusedCoords && binding?.action === 'zoom') {
      map.flyTo({ center: focusedCoords, zoom: 14, essential: true });
    }
  }, [targetMap.layers, binding?.targetFeatureId, binding?.action]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', borderRadius: 'var(--r)' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: '120px' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
        {binding && (
          <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(11, 127, 176, 0.92)', color: '#fff', padding: '3px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, zIndex: 10 }}>
            <Link2 size={11} /> <span>{binding.action || 'focus'}</span>
          </div>
        )}
      </div>

      {isEditable && (
        <div style={{ padding: '6px 8px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
          <input
            type="text" className="input" value={mapTitle} placeholder="Titre de la carte…"
            onChange={(e) => onChange({ title: e.target.value })}
            style={{ width: '45%', fontSize: '11px', height: '24px' }}
          />
          <input
            type="text" className="input" value={caption} placeholder="Légende / source…"
            onChange={(e) => onChange({ caption: e.target.value })}
            style={{ flex: 1, fontSize: '11px', height: '24px' }}
          />
        </div>
      )}
    </div>
  );
};
