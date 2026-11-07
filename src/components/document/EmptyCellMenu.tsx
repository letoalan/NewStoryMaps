/**
 * StoryMap — Menu d'insertion de bloc sur cellule vide (+ central, G03)
 */

import React from 'react';
import { BlockType } from '../../types/project';
import { Type, Heading, Quote, Image, Layers, Table, Map, BookOpen, Bookmark, LucideIcon } from 'lucide-react';

interface EmptyCellMenuProps {
  x: number;
  y: number;
  onSelectType: (type: BlockType) => void;
  onClose: () => void;
}

const INSERT_ITEMS: Array<{ type: BlockType; label: string; icon: LucideIcon }> = [
  { type: 'text', label: 'Texte', icon: Type },
  { type: 'title', label: 'Titre', icon: Heading },
  { type: 'callout', label: 'Encadré', icon: Quote },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'gallery', label: 'Galerie', icon: Layers },
  { type: 'table', label: 'Tableau', icon: Table },
  { type: 'map', label: 'Carte', icon: Map },
  { type: 'legend', label: 'Légende', icon: BookOpen },
  { type: 'source', label: 'Source', icon: Bookmark },
];

export const EmptyCellMenu: React.FC<EmptyCellMenuProps> = ({ x, y, onSelectType, onClose }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: 'var(--surface)',
        border: '2px solid var(--accent)',
        borderRadius: 'var(--r)',
        boxShadow: 'var(--shadow-lg)',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>
          Ajouter bloc ({x + 1}, {y + 1})
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-icon"
          onClick={onClose}
          style={{ height: '18px', width: '18px', fontSize: '11px' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', flex: 1, overflowY: 'auto' }}>
        {INSERT_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.type}
              type="button"
              className="btn btn-ghost"
              style={{
                flexDirection: 'column',
                height: 'auto',
                padding: '6px 2px',
                fontSize: '10px',
                fontWeight: 600,
                gap: '2px',
                borderRadius: 'var(--r-sm)',
              }}
              onClick={() => onSelectType(item.type)}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
