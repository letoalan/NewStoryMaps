/**
 * StoryMap — Blocs médias (Image simple et Galerie / Carrousel)
 */

import React, { useState } from 'react';
import { Block } from '../../../types/project';
import { Image as ImageIcon, ChevronLeft, ChevronRight, Upload } from 'lucide-react';

interface MediaBlockProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
}

export const MediaBlock: React.FC<MediaBlockProps> = ({ block, onChange, isEditable = true }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const images = (block.data.images as string[]) || (block.data.url ? [block.data.url as string] : []);
  const caption = (block.data.caption as string) || '';

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      const updated = block.type === 'gallery' ? [...images, url] : [url];
      onChange({ images: updated, url: updated[0] });
    };
    reader.readAsDataURL(file);
  };

  const currentImg = images[activeIdx] || images[0];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', borderRadius: 'var(--r)' }}>
      {currentImg ? (
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <img
            src={currentImg}
            alt={caption || 'Média du récit'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {block.type === 'gallery' && images.length > 1 && (
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '999px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-icon btn-xs"
                style={{ color: '#fff', border: 0, background: 'none' }}
                onClick={() => setActiveIdx((activeIdx - 1 + images.length) % images.length)}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}>
                {activeIdx + 1}/{images.length}
              </span>
              <button
                type="button"
                className="btn btn-icon btn-xs"
                style={{ color: '#fff', border: 0, background: 'none' }}
                onClick={() => setActiveIdx((activeIdx + 1) % images.length)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: 'var(--surface-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r)' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
            <ImageIcon size={32} opacity={0.5} style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '12px' }}>{block.type === 'gallery' ? 'Galerie vide' : 'Image vide'}</div>
          </div>
        </div>
      )}

      {isEditable && (
        <div style={{ padding: '6px 8px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label className="btn btn-ghost btn-xs" style={{ cursor: 'pointer' }}>
            <Upload size={12} />
            <span>{images.length > 0 ? (block.type === 'gallery' ? 'Ajouter photo' : 'Remplacer') : 'Choisir image'}</span>
            <input type="file" accept="image/*" onChange={handleAddImage} style={{ display: 'none' }} />
          </label>
          <input
            type="text"
            className="input"
            value={caption}
            placeholder="Légende de la photo…"
            onChange={(e) => onChange({ caption: e.target.value })}
            style={{ flex: 1, fontSize: '11px', height: '24px' }}
          />
        </div>
      )}
    </div>
  );
};

