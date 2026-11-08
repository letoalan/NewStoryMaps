/**
 * StoryMap — Modal de sélection du fond de carte
 */

import React from 'react';
import { MAP_STYLES, MapStyleOption, getMapStyleId } from '../../types/map';
import { useStory } from '../../context/StoryContext';
import { X, Check } from 'lucide-react';

interface StylePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StylePickerModal: React.FC<StylePickerModalProps> = ({ isOpen, onClose }) => {
  const { story, updateStory } = useStory();

  if (!isOpen || !story) return null;

  const handleSelect = (option: MapStyleOption) => {
    updateStory({ mapStyle: option.url });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="dialog-box"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--r-lg)',
          width: '100%',
          maxWidth: '560px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Choisir le style du fond de carte
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {MAP_STYLES.map((style) => {
            const isSelected = getMapStyleId(story.mapStyle) === style.id;
            return (
              <div
                key={style.id}
                onClick={() => handleSelect(style)}
                style={{
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  padding: '12px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--accent-soft)' : 'var(--surface-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{style.name}</span>
                  {isSelected && <Check size={16} color="var(--accent)" />}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                  Fournisseur : {style.provider}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

