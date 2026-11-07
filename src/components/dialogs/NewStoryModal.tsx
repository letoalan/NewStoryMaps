/**
 * StoryMap — Modal de création d'un nouveau récit avec modèle
 */

import React, { useState } from 'react';
import { X, Sparkles, Compass, MapPin } from 'lucide-react';

interface NewStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, template: 'blank' | 'city' | 'nature') => void;
}

export const NewStoryModal: React.FC<NewStoryModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<'blank' | 'city' | 'nature'>('blank');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(title.trim() || 'Nouvelle StoryMap', template);
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
          maxWidth: '500px',
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
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Créer un nouveau récit</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
              Titre du récit
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%' }}
              placeholder="Ex: Les secrets de la capitale…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              Modèle de départ
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div
                style={{
                  border: template === 'blank' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  padding: '12px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: template === 'blank' ? 'var(--accent-soft)' : 'var(--surface-2)',
                }}
                onClick={() => setTemplate('blank')}
              >
                <Sparkles size={20} style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '12px', fontWeight: 600 }}>Vierge</div>
              </div>
              <div
                style={{
                  border: template === 'city' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  padding: '12px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: template === 'city' ? 'var(--accent-soft)' : 'var(--surface-2)',
                }}
                onClick={() => setTemplate('city')}
              >
                <MapPin size={20} style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '12px', fontWeight: 600 }}>Urbain</div>
              </div>
              <div
                style={{
                  border: template === 'nature' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  padding: '12px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: template === 'nature' ? 'var(--accent-soft)' : 'var(--surface-2)',
                }}
                onClick={() => setTemplate('nature')}
              >
                <Compass size={20} style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '12px', fontWeight: 600 }}>Nature</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Commencer le récit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

