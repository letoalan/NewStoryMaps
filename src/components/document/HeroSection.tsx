/**
 * StoryMap — Composant de couverture Hero (photo / vidéo / voile / repli statique) (N3)
 */

import React, { useState, useRef, useEffect } from 'react';
import { HeroConfig, OutputProfile } from '../../types/theme';
import { resolveHeroRenderState } from '../../core/heroRenderer';
import { sanitizeHTML } from '../../core/sanitize';
import { Play, Pause } from 'lucide-react';

interface HeroSectionProps {
  hero?: HeroConfig | null;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  fallbackLogo?: string;
  outputProfile?: OutputProfile;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  hero, fallbackTitle = '', fallbackSubtitle = '', fallbackLogo = '', outputProfile = 'web-interactive',
}) => {
  const reducedMotion = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const state = resolveHeroRenderState(hero, fallbackTitle, fallbackSubtitle, fallbackLogo, outputProfile, reducedMotion);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(state.autoplay);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    setVideoFailed(false);
    setIsPlaying(state.autoplay);
  }, [state.mediaUrl, state.autoplay]);

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
        <>
          <video
            ref={videoRef} src={state.mediaUrl} poster={state.posterUrl || undefined}
            autoPlay={state.autoplay} loop={state.loop} muted playsInline
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
    </header>
  );
};
