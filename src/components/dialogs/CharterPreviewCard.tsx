/**
 * StoryMap — Carte d'aperçu d'une variante de charte graphique (Claire / Sombre / Coloré)
 */

import React from 'react';
import type { GraphicCharterDoc, CharterContextType } from '../../types/graphicCharter';
import { Upload, Edit3, CheckCircle2 } from 'lucide-react';

interface CharterPreviewCardProps {
  contextType: CharterContextType;
  label: string;
  icon: string;
  doc: GraphicCharterDoc | null;
  isActive: boolean;
  onSelect: () => void;
  onFileUpload: (file: File) => void;
}

export const CharterPreviewCard: React.FC<CharterPreviewCardProps> = ({
  label, icon, doc, isActive, onSelect, onFileUpload,
}) => {
  const colors = doc?.colors;
  const typo = doc?.typography;
  const isLoaded = Boolean(doc);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileUpload(f);
  };

  return (
    <div
      style={{
        border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 'var(--r)',
        background: colors?.background || 'var(--surface-2)',
        color: colors?.text || 'inherit',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isActive ? 'var(--shadow-md)' : 'none',
      }}
      onClick={onSelect}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(128,128,128,0.2)', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}>
          <span>{icon}</span>
          <span>{label}</span>
          {isLoaded && <CheckCircle2 size={13} color={colors?.primary || 'var(--accent)'} />}
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <label className="btn btn-ghost btn-xs" style={{ padding: '2px 5px', fontSize: '10px', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()} title="Remplacer le fichier JSON">
            <Upload size={10} /> <span>Fichier</span>
            <input type="file" accept=".json,application/json" onChange={handleInput} style={{ display: 'none' }} />
          </label>
          <button type="button" className="btn btn-ghost btn-xs" style={{ padding: '2px 5px', fontSize: '10px' }} onClick={(e) => { e.stopPropagation(); onSelect(); }} title="Modifier le code JSON">
            <Edit3 size={10} />
          </button>
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: '13px', fontFamily: typo?.heading?.family || 'inherit', color: colors?.primary || 'inherit' }}>
          {doc?.project?.name || 'Non défini'}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {doc?.project?.values || doc?.project?.description || 'En attente de fichier JSON'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: 'auto' }}>
        {[
          ['P', colors?.primary || '#999'],
          ['S', colors?.secondary || '#aaa'],
          ['F', colors?.background || '#fff'],
          ['Surf', colors?.surface || '#eee'],
        ].map(([k, val]) => (
          <div key={k} style={{ width: '16px', height: '16px', borderRadius: '3px', background: val, border: '1px solid rgba(0,0,0,0.18)' }} title={`${k}: ${val}`} />
        ))}
        <span style={{ fontSize: '9.5px', marginLeft: 'auto', opacity: 0.7 }}>
          {typo?.heading?.family || 'Nunito'} / {typo?.body?.family || 'Roboto'}
        </span>
      </div>
    </div>
  );
};

