/**
 * StoryMap — Composant de couverture Hero (photo / vidéo / voile / repli statique) (N3)
 */

import React, { useState, useRef, useEffect } from 'react';
import { HeroConfig, OutputProfile } from '../../types/theme';
import { resolveHeroRenderState } from '../../core/heroRenderer';
import { parseVideoEmbedUrl } from '../../core/videoEmbed';
import { sanitizeHTML } from '../../core/sanitize';
import { Play, Pause, Upload } from 'lucide-react';

interface HeroSectionProps {
  hero?: HeroConfig | null;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  fallbackLogo?: string;
  outputProfile?: OutputProfile;
  isEditable?: boolean;
  onUpdateHero?: (patch: Partial<HeroConfig>) => void;
  charterColor?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  hero, fallbackTitle = '', fallbackSubtitle = '', fallbackLogo = '', outputProfile = 'web-interactive', isEditable = false, onUpdateHero, charterColor,
}) => {
  const reducedMotion = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const state = resolveHeroRenderState(hero, fallbackTitle, fallbackSubtitle, fallbackLogo, outputProfile, reducedMotion, charterColor);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(state.autoplay);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    setVideoFailed(false);
    setIsPlaying(state.autoplay);
    const vid = videoRef.current;
    if (vid && state.renderMode === 'video') {
      vid.defaultMuted = true; vid.muted = true; vid.playsInline = true;
      vid.play().then(() => setIsPlaying(true)).catch(() => {
        const retry = () => { vid.muted = true; vid.play().catch(() => {}); window.removeEventListener('click', retry); };
        window.addEventListener('click', retry, { once: true });
      });
    }
  }, [state.mediaUrl, state.renderMode, state.autoplay]);

  useEffect(() => {
    if (state.renderMode !== 'video') return;
    const handleVisibility = () => {
      const vid = videoRef.current;
      if (!vid) return;
      if (document.hidden) { vid.pause(); setIsPlaying(false); }
      else if (state.autoplay && !videoFailed) vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [state.renderMode, state.autoplay, videoFailed]);

  if (!state.enabled) return null;

  const alignItems = state.textAlign === 'left' ? 'flex-start' : state.textAlign === 'right' ? 'flex-end' : 'center';

  const toggleVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    else { vid.pause(); setIsPlaying(false); }
  };

  const showVideoElement = state.renderMode === 'video' && state.mediaUrl && !videoFailed;
  const fallbackImgSrc = state.renderMode === 'static-poster' || videoFailed ? state.posterUrl || state.mediaUrl : state.mediaUrl || state.posterUrl;

  const handleMediaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateHero) return;
    const isVid = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = () => onUpdateHero({ enabled: true, mediaType: isVid ? 'video' : 'photo', mediaUrl: String(reader.result || '') });
    reader.readAsDataURL(file);
  };

  return (
    <header
      className="story-hero-section"
      data-render-mode={videoFailed ? 'static-poster' : state.renderMode}
      style={{
        position: 'relative', width: '100%', minHeight: state.heightCss, background: state.backgroundColor,
        overflow: 'hidden', borderRadius: 'var(--r)', marginBottom: '16px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems, padding: '24px', textAlign: state.textAlign, color: '#ffffff',
      }}
    >
      {showVideoElement ? (
        (() => {
          const parsed = parseVideoEmbedUrl(state.mediaUrl);
          if (parsed.isEmbed) {
            return (
              <iframe
                src={parsed.embedUrl}
                title="Vidéo de couverture"
                allow="autoplay; fullscreen; picture-in-picture"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'max(100%, 178vh)', height: 'max(100%, 56.25vw, 540px)', minWidth: '100%', minHeight: '100%', border: 'none', pointerEvents: 'none', zIndex: 1 }}
              />
            );
          }
          return (
            <>
              <video
                ref={videoRef} src={state.mediaUrl} poster={state.posterUrl || undefined}
                autoPlay={state.autoplay} loop={state.loop} muted playsInline
                onLoadedMetadata={(e) => { e.currentTarget.defaultMuted = true; e.currentTarget.muted = true; e.currentTarget.play().catch(() => {}); }}
                onCanPlay={(e) => { e.currentTarget.defaultMuted = true; e.currentTarget.muted = true; e.currentTarget.play().catch(() => {}); }}
                onError={() => setVideoFailed(true)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: state.fit, objectPosition: state.objectPositionCss, zIndex: 1 }}
              />
              <button
                type="button" className="btn btn-xs" onClick={toggleVideo}
                aria-label={isPlaying ? 'Mettre la vidéo en pause' : 'Lire la vidéo'}
                style={{ position: 'absolute', bottom: '10px', left: '12px', zIndex: 4, background: 'rgba(15,23,42,0.78)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPlaying ? 'Pause' : 'Lecture'}</span>
              </button>
            </>
          );
        })()
      ) : (
        fallbackImgSrc && (
          <img
            src={fallbackImgSrc} alt={state.title || 'Couverture'}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: state.fit, objectPosition: state.objectPositionCss, zIndex: 1 }}
          />
        )
      )}

      {state.veilCss !== 'none' && (
        <div style={{ position: 'absolute', inset: 0, background: state.veilCss, zIndex: 2, pointerEvents: 'none' }} />
      )}

      <div style={{ position: 'relative', zIndex: 3, maxWidth: '680px', display: 'flex', flexDirection: 'column', alignItems, gap: '6px' }}>
        {state.logoUrl && <img src={state.logoUrl} alt="Logo" style={{ maxHeight: '44px', maxWidth: '160px', objectFit: 'contain', marginBottom: '6px' }} />}
        {state.title && <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.45)' }} dangerouslySetInnerHTML={{ __html: sanitizeHTML(state.title) }} />}
        {state.subtitle && <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.92)', lineHeight: 1.45 }} dangerouslySetInnerHTML={{ __html: sanitizeHTML(state.subtitle) }} />}
      </div>

      {state.credit && (
        <span style={{ position: 'absolute', bottom: '8px', right: '12px', zIndex: 4, fontSize: '10px', color: 'rgba(255,255,255,0.85)', background: 'rgba(15,23,42,0.62)', padding: '2px 6px', borderRadius: '4px' }} dangerouslySetInnerHTML={{ __html: sanitizeHTML(state.credit) }} />
      )}

      {isEditable && onUpdateHero && (
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 5, display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(15,23,42,0.82)', padding: '4px 8px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.22)' }} onClick={(e) => e.stopPropagation()}>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#fff', fontWeight: 600 }}>
            <Upload size={12} />
            <span>{state.mediaUrl ? 'Remplacer Photo/Vidéo' : 'Choisir Photo/Vidéo'}</span>
            <input type="file" accept="image/*,video/mp4,video/webm,video/ogg" onChange={handleMediaFile} style={{ display: 'none' }} />
          </label>
        </div>
      )}
    </header>
  );
};
