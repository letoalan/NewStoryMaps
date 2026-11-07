/**
 * StoryMap — Carte d'un récit dans le tableau de bord
 */

import React from 'react';
import { StoryListItem } from '../../types/story';
import { MapPin, Calendar, Trash2, Edit3, Play } from 'lucide-react';

interface StoryCardProps {
  item: StoryListItem;
  onOpen: (id: string) => void;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({ item, onOpen, onPlay, onDelete }) => {
  const dateFormatted = new Date(item.modified).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const modeLabel = item.mode === 'rich-document' ? 'Document' : item.mode === 'brochure' ? 'Brochure' : 'StoryMap';
  const modeBadgeStyle: React.CSSProperties = item.mode === 'rich-document'
    ? { background: '#7e22ce', color: '#fff', fontWeight: 600 }
    : item.mode === 'brochure'
    ? { background: '#b45309', color: '#fff', fontWeight: 600 }
    : { background: 'var(--accent)', color: '#fff', fontWeight: 600 };

  return (
    <div className="story-card" onClick={() => onOpen(item.id)}>
      <div className="story-thumb">
        {item.coverImage ? (
          <img src={item.coverImage} alt={item.title} />
        ) : (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'var(--surface-3)', color: 'var(--text-3)' }}>
            <MapPin size={36} opacity={0.5} />
          </div>
        )}
        <div className="thumb-badges" style={{ display: 'flex', gap: '6px' }}>
          <span className="badge" style={modeBadgeStyle}>{modeLabel}</span>
          <span className="badge">
            <MapPin size={12} />
            {item.stepCount} {item.stepCount > 1 ? 'étapes' : 'étape'}
          </span>
        </div>
        <div className="thumb-open">
          <span>
            <Edit3 size={14} /> Ouvrir l’éditeur
          </span>
        </div>
      </div>

      <div className="story-info">
        <div className="story-title-row">
          <h3 className="story-title">{item.title || 'Récit sans titre'}</h3>
        </div>
        {item.subtitle && <p className="story-subtitle">{item.subtitle}</p>}
        <div className="story-meta">
          <Calendar size={13} />
          <span>{dateFormatted}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-ghost btn-xs btn-icon"
              title="Lire la storymap"
              onClick={() => onPlay(item.id)}
            >
              <Play size={14} />
            </button>
            <button
              className="btn btn-ghost btn-xs btn-icon"
              title="Supprimer"
              onClick={() => {
                if (confirm(`Supprimer « ${item.title} » ?`)) {
                  onDelete(item.id);
                }
              }}
            >
              <Trash2 size={14} color="var(--danger)" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
