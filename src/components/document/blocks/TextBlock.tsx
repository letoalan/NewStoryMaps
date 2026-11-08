/**
 * StoryMap — Blocs textuels (Titre, Texte riche, Encadré, Source, Légende) isolés du thème UI (N2.11)
 */

import React from 'react';
import { Block } from '../../../types/project';
import { ResolvedVisualStyle, HeroConfig } from '../../../types/theme';
import { DEFAULT_HERO_PHOTO } from '../../../core/heroRenderer';
import { parseVideoEmbedUrl } from '../../../core/videoEmbed';
import { hexToRgba } from '../../../core/themeResolver';
import { Link2, Upload } from 'lucide-react';

interface TextBlockProps {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  isEditable?: boolean;
  visualStyle?: ResolvedVisualStyle;
  hero?: HeroConfig | null;
  onUpdateHero?: (patch: Partial<HeroConfig>) => void;
  subtitle?: string;
}

export const TextBlock: React.FC<TextBlockProps> = ({ block, onChange, isEditable = true, visualStyle, hero, onUpdateHero, subtitle }) => {
  const content = (block.data.text as string) || '';
  const level = (block.data.level as number) || 2;
  const binding = block.binding;

  const txtColor = visualStyle?.textColor || 'inherit';
  const mutedColor = visualStyle?.mutedTextColor || txtColor;
  const accentColor = visualStyle?.accentColor || 'var(--accent)';
  const headingFont = visualStyle?.headingFont || 'inherit';
  const bodyFont = visualStyle?.bodyFont || 'inherit';

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChange({ text: e.target.value });
  };

  const renderBindingBadge = () => {
    if (!binding) return null;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', alignSelf: 'flex-start', background: 'rgba(15, 23, 42, 0.72)', color: '#ffffff', border: `1px solid ${accentColor}`, padding: '1px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 600, marginBottom: '4px' }}>
        <Link2 size={10} />
        <span>{binding.numberIndex ? `#${binding.numberIndex} ` : ''}{binding.action || 'focus'}</span>
      </div>
    );
  };

  const inlineFieldBase: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    color: txtColor,
    fontFamily: bodyFont,
    border: '1px solid transparent',
    borderRadius: '4px',
    outline: 'none',
    padding: '2px 4px',
  };

  if (block.type === 'title') {
    if (hero?.enabled) {
      const parsedVid = parseVideoEmbedUrl(hero.mediaUrl);
      const isVid = Boolean(hero.mediaUrl && (hero.mediaType === 'video' || parsedVid.isEmbed || hero.mediaUrl.startsWith('data:video/') || /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(hero.mediaUrl)));
      const bgImg = hero.mediaUrl || hero.posterUrl || DEFAULT_HERO_PHOTO;
      const charterColor = (hero.veilColor && hero.veilColor !== '#0f172a') ? hero.veilColor : (visualStyle?.primaryColor || '#0f172a');
      const vOpacity = Math.max(0, Math.min(1, hero.veilOpacity ?? 0.45));
      const veil = hero.veilStyle === 'solid' ? hexToRgba(charterColor, vOpacity) : `linear-gradient(135deg, ${hexToRgba(charterColor, Math.min(0.95, vOpacity * 1.35))} 0%, ${hexToRgba(charterColor, Math.max(0.12, vOpacity * 0.45))} 100%)`;
      const playVideo = (el: HTMLVideoElement | null) => {
        if (!el) return;
        el.defaultMuted = true; el.muted = true; el.playsInline = true;
        const p = el.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            const retry = () => { el.muted = true; el.play().catch(() => {}); window.removeEventListener('click', retry); };
            window.addEventListener('click', retry, { once: true });
          });
        }
      };
      const handleMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f || !onUpdateHero) return;
        const isVidFile = (f.type && f.type.startsWith('video/')) || /\.(mp4|webm|ogg|mov|m4v)$/i.test(f.name);
        const r = new FileReader();
        r.onload = () => onUpdateHero({ enabled: true, mediaType: isVidFile ? 'video' : 'photo', mediaUrl: String(r.result || ''), posterUrl: isVidFile ? DEFAULT_HERO_PHOTO : undefined });
        r.readAsDataURL(f);
      };
      return (
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '64px', overflow: 'hidden', borderRadius: visualStyle?.radiusCss, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '14px 18px', color: '#ffffff' }}>
          {isVid ? (
            parsedVid.isEmbed ? (
              <iframe
                src={parsedVid.embedUrl}
                title="Vidéo de fond"
                allow="autoplay; fullscreen; picture-in-picture"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'max(100%, 178vh)', height: 'max(100%, 56.25vw, 540px)', minWidth: '100%', minHeight: '100%', border: 'none', pointerEvents: 'none', zIndex: 1 }}
              />
            ) : (
              <video
                ref={playVideo} src={hero.mediaUrl} poster={hero.posterUrl || DEFAULT_HERO_PHOTO} autoPlay loop muted playsInline
                onLoadedMetadata={(e) => { e.currentTarget.defaultMuted = true; e.currentTarget.muted = true; e.currentTarget.play().catch(() => {}); }}
                onCanPlay={(e) => { e.currentTarget.defaultMuted = true; e.currentTarget.muted = true; e.currentTarget.play().catch(() => {}); }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: hero.fit || 'cover', zIndex: 1 }}
              />
            )
          ) : (
            <img src={bgImg} alt="Couverture" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: hero.fit || 'cover', zIndex: 1 }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: veil, zIndex: 2, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {renderBindingBadge()}
            {isEditable ? (
              <input type="text" value={content} placeholder="Nouveau Document" onChange={handleChange} style={{ ...inlineFieldBase, fontFamily: headingFont, fontSize: '20px', fontWeight: 700, color: '#ffffff', textShadow: '0 2px 6px rgba(0,0,0,0.6)' }} />
            ) : (
              <h1 style={{ margin: 0, fontFamily: headingFont, fontSize: '22px', fontWeight: 700, color: '#ffffff', textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>{content || 'Nouveau Document'}</h1>
            )}
            {(hero.subtitle || subtitle) && <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{hero.subtitle || subtitle}</p>}
          </div>
          {isEditable && onUpdateHero && (
            <label style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 4, background: 'rgba(15,23,42,0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '999px', padding: '2px 8px', fontSize: '10.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Upload size={11} /> <span>Photo/Vidéo</span><input type="file" accept="image/*,video/mp4,video/webm" onChange={handleMedia} style={{ display: 'none' }} />
            </label>
          )}
        </div>
      );
    }
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4px 6px', color: txtColor }}>
        {renderBindingBadge()}
        {isEditable ? (
          <input
            type="text" value={content} placeholder={`Titre (Niveau ${level})…`}
            onChange={handleChange}
            style={{ ...inlineFieldBase, fontFamily: headingFont, fontSize: level === 1 ? '22px' : '18px', fontWeight: 700 }}
          />
        ) : (
          <h2 style={{ margin: 0, fontFamily: headingFont, fontSize: level === 1 ? '24px' : '20px', fontWeight: 700, color: txtColor }}>
            {content || 'Titre vide'}
          </h2>
        )}
      </div>
    );
  }

  if (block.type === 'callout') {
    return (
      <div style={{ height: '100%', padding: '8px 10px', background: 'rgba(255, 255, 255, 0.14)', borderLeft: `4px solid ${accentColor}`, borderRadius: visualStyle?.radiusCss ?? '6px', display: 'flex', flexDirection: 'column', color: txtColor }}>
        {renderBindingBadge()}
        {isEditable ? (
          <textarea
            value={content} placeholder="Texte de l’encadré mis en avant…"
            onChange={handleChange}
            style={{ ...inlineFieldBase, height: '100%', minHeight: '42px', resize: 'none', fontStyle: 'italic', fontSize: '13px', lineHeight: 1.45 }}
          />
        ) : (
          <p style={{ margin: 0, fontStyle: 'italic', color: txtColor, lineHeight: 1.45 }}>{content}</p>
        )}
      </div>
    );
  }

  if (block.type === 'source' || block.type === 'legend') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '4px 6px', fontSize: '11.5px', color: mutedColor }}>
        {isEditable ? (
          <input
            type="text" value={content}
            placeholder={block.type === 'source' ? 'Source : OpenStreetMap…' : 'Légende : Figure 1…'}
            onChange={handleChange}
            style={{ ...inlineFieldBase, color: mutedColor, fontSize: '11.5px' }}
          />
        ) : (
          <span style={{ color: mutedColor }}>{content}</span>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', padding: '4px 6px', display: 'flex', flexDirection: 'column', color: txtColor }}>
      {renderBindingBadge()}
      {isEditable ? (
        <textarea
          value={content} placeholder="Rédigez votre paragraphe de récit…"
          onChange={handleChange}
          style={{ ...inlineFieldBase, height: '100%', resize: 'none', lineHeight: 1.55, fontSize: '13.5px' }}
        />
      ) : (
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: '14px', color: txtColor }}>{content}</p>
      )}
    </div>
  );
};
