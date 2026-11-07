/**
 * StoryMap — Modal de partage et d'exportation
 */

import React, { useState } from 'react';
import { useStory } from '../../context/StoryContext';
import { exportStoryToJSON, exportStoryToStandaloneHTML } from '../../core/io';
import { X, Copy, Check, Download, FileCode } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { story } = useStory();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !story) return null;

  const handleCopyJSON = async () => {
    await navigator.clipboard.writeText(JSON.stringify(story, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          maxWidth: '520px',
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
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Partager & Exporter</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Page HTML autonome (Offline)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '8px' }}>
              Génère un fichier HTML complet incluant vos récits et le visualiseur cartographique,
              consultable directement sans serveur.
            </p>
            <button className="btn btn-primary" onClick={() => exportStoryToStandaloneHTML(story)}>
              <FileCode size={16} /> Télécharger le HTML autonome
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />

          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Données JSON</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '8px' }}>
              Sauvegardez vos données brutes pour les réimporter ultérieurement.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={() => exportStoryToJSON(story)}>
                <Download size={16} /> Exporter JSON
              </button>
              <button className="btn btn-ghost" onClick={handleCopyJSON}>
                {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                <span>{copied ? 'Copié !' : 'Copier JSON'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

