/**
 * StoryMap — Bloc Carte intégrée avec liaisons narratives (P2 / P3)
 */

import React from 'react';
import { Block } from '../../../types/project';
import { Map, Link2 } from 'lucide-react';

interface MapBlockPreviewProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
}

export const MapBlockPreview: React.FC<MapBlockPreviewProps> = ({ block, onChange, isEditable = true }) => {
  const mapTitle = (block.data.title as string) || 'Carte interactive';
  const caption = (block.data.caption as string) || '';
  const binding = block.binding;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', borderRadius: 'var(--r)' }}>
      <div style={{ flex: 1, background: '#1e293b', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <Map size={36} opacity={0.6} style={{ marginBottom: '8px' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{mapTitle}</span>
        <span style={{ fontSize: '11px', color: '#64748b' }}>Vue MapLibre GL intégrée</span>

        {binding && (
          <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(11, 127, 176, 0.9)', color: '#fff', padding: '3px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600 }}>
            <Link2 size={12} />
            <span>Liaison : {binding.action || 'focus'}</span>
          </div>
        )}
      </div>

      {isEditable && (
        <div style={{ padding: '6px 8px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="input"
            value={mapTitle}
            placeholder="Titre de la carte…"
            onChange={(e) => onChange({ title: e.target.value })}
            style={{ width: '45%', fontSize: '11px', height: '24px' }}
          />
          <input
            type="text"
            className="input"
            value={caption}
            placeholder="Légende / source cartographique…"
            onChange={(e) => onChange({ caption: e.target.value })}
            style={{ flex: 1, fontSize: '11px', height: '24px' }}
          />
        </div>
      )}
    </div>
  );
};

