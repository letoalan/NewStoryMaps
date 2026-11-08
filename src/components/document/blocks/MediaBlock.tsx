/**
 * StoryMap — Blocs médias (Image, Galerie/Carrousel et Planche contact Brochure — V09)
 */

import React, { useState } from 'react';
import { Block } from '../../../types/project';
import { ResolvedVisualStyle } from '../../../types/theme';
import { Image as ImageIcon, ChevronLeft, ChevronRight, Upload } from 'lucide-react';

interface MediaBlockProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
  visualStyle?: ResolvedVisualStyle;
}

export const MediaBlock: React.FC<MediaBlockProps> = ({ block, onChange, isEditable = true, visualStyle }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const rawItems = Array.isArray(block.data.items) ? (block.data.items as Array<{ url: string; caption?: string }>) : [];
  const rawImages = Array.isArray(block.data.images) ? (block.data.images as string[]) : [];
  const contactItems = Array.isArray(block.data.contactSheetItems)
    ? (block.data.contactSheetItems as Array<{ url: string; caption?: string }>)
    : [];

  const images: string[] = rawImages.length > 0
    ? rawImages
    : rawItems.length > 0
      ? rawItems.map((it) => it.url)
      : block.data.url
        ? [block.data.url as string]
        : [];
  const caption = (block.data.caption as string) || '';
  const isContactSheet = Boolean(block.data.isContactSheet && contactItems.length > 0);

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      const updated = block.type === 'gallery' ? [...images, url] : [url];
      onChange({ images: updated, items: updated.map((u) => ({ url: u })), url: updated[0] });
    };
    reader.readAsDataURL(file);
  };

  const currentImg = images[activeIdx] || images[0];

  const radiusCss = visualStyle?.radiusCss ?? 'var(--r)';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', borderRadius: radiusCss }}>
      {isContactSheet ? (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, contactItems.length))}, 1fr)`, gap: '6px', padding: '6px', overflow: 'auto', background: 'var(--surface-2)' }}>
          {contactItems.map((item, idx) => (
            <figure key={idx} style={{ margin: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRadius: radiusCss, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img src={item.url} alt={item.caption || `Vue ${idx + 1}`} style={{ width: '100%', height: '84px', objectFit: 'cover', display: 'block' }} />
              <figcaption style={{ fontSize: '10px', padding: '3px 6px', color: 'var(--text-2)' }}>
                {item.caption || `Photo ${idx + 1}`}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : currentImg ? (
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <img
            src={currentImg}
            alt={caption || 'Média du récit'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {block.type === 'gallery' && images.length > 1 && (
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.65)', padding: '2px 6px', borderRadius: '999px', alignItems: 'center' }}>
              <button
                type="button"
                data-carousel-control="true"
                aria-label="Image précédente de la galerie"
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
                data-carousel-control="true"
                aria-label="Image suivante de la galerie"
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
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: 'var(--surface-3)', border: '1px dashed var(--border)', borderRadius: radiusCss }}>
          <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
            <ImageIcon size={32} opacity={0.5} style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '12px' }}>{block.type === 'gallery' ? 'Galerie vide' : 'Image vide'}</div>
          </div>
        </div>
      )}

      {isEditable && (
        <div style={{ padding: '4px 6px', background: 'rgba(15, 23, 42, 0.08)', borderTop: '1px solid rgba(148, 163, 184, 0.25)', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <label className="btn btn-ghost btn-xs" style={{ cursor: 'pointer', color: visualStyle?.textColor || 'inherit' }}>
            <Upload size={12} />
            <span>{images.length > 0 ? (block.type === 'gallery' ? 'Ajouter photo' : 'Remplacer') : 'Choisir image'}</span>
            <input type="file" accept="image/*" onChange={handleAddImage} style={{ display: 'none' }} />
          </label>
          <input
            type="text"
            value={caption}
            placeholder="Légende de la photo…"
            onChange={(e) => onChange({ caption: e.target.value })}
            style={{ flex: 1, fontSize: '11px', height: '22px', background: 'rgba(255,255,255,0.2)', color: visualStyle?.textColor || 'inherit', border: '1px solid rgba(148,163,184,0.35)', borderRadius: '4px', padding: '0 6px', outline: 'none' }}
          />
        </div>
      )}
    </div>
  );
};
