/**
 * StoryMap — Moteur de rendu Hero (photo / vidéo / voile de contraste / repli statique) (N3)
 *
 * Couverture V1 à 4 couches :
 * 1. Couleur de fond
 * 2. Média unique (photo OU vidéo, jamais empilés simultanément) avec cadrage et point focal
 * 3. Voile de contraste (uni ou dégradé) avec opacité réglable
 * 4. Contenu éditorial (logo, titre, sous-titre, mention de source)
 */

import type { HeroConfig, OutputProfile } from '../types/theme';
import { escapeAttr, sanitizeHTML, sanitizeSafeUrl } from './sanitize';
import { hexToRgba, isDarkColor } from './themeResolver';
import { parseVideoEmbedUrl } from './videoEmbed';

export interface ResolvedHeroRenderState {
  enabled: boolean;
  renderMode: 'none' | 'photo' | 'video' | 'static-poster';
  backgroundColor: string;
  mediaUrl: string;
  posterUrl: string;
  fit: 'cover' | 'contain';
  objectPositionCss: string;
  veilCss: string;
  heightCss: string;
  textAlign: 'left' | 'center' | 'right';
  title: string;
  subtitle: string;
  logoUrl: string;
  credit: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
}

export const DEFAULT_HERO_PHOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450"><defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="55%" stop-color="#0369a1"/><stop offset="100%" stop-color="#0284c7"/></linearGradient></defs><rect width="1200" height="450" fill="url(#sky)"/><circle cx="960" cy="120" r="56" fill="#fde047" fill-opacity="0.88"/><path d="M0 340 L260 190 L510 310 L790 155 L1050 285 L1200 220 L1200 450 L0 450 Z" fill="#1e293b" fill-opacity="0.65"/><path d="M0 375 L340 240 L640 355 L930 215 L1200 330 L1200 450 L0 450 Z" fill="#0f172a" fill-opacity="0.85"/></svg>');

/** Génère une illustration SVG adaptée à l'ambiance lumineuse (nocturne ou diurne) de la charte */
export function createThemedHeroSvg(primary = '#E9B949', secondary = '#B8A1E3', bg = '#111827'): string {
  if (!isDarkColor(bg)) return DEFAULT_HERO_PHOTO;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450"><defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg}"/><stop offset="65%" stop-color="#0c1220"/><stop offset="100%" stop-color="${secondary}" stop-opacity="0.45"/></linearGradient><linearGradient id="glow" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="${secondary}" stop-opacity="0.32"/><stop offset="100%" stop-color="${bg}" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="450" fill="url(#sky)"/><circle cx="980" cy="115" r="44" fill="${primary}" fill-opacity="0.92"/><circle cx="980" cy="115" r="72" fill="${primary}" fill-opacity="0.14"/><rect y="230" width="1200" height="220" fill="url(#glow)"/><path d="M0 355 L240 225 L480 325 L760 185 L1020 295 L1200 215 L1200 450 L0 450 Z" fill="#151e32" fill-opacity="0.85"/><path d="M0 385 L320 268 L610 362 L900 238 L1200 338 L1200 450 L0 450 Z" fill="#0f1626" fill-opacity="0.96"/></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const HEIGHT_CSS: Record<string, string> = {
  compact: '220px',
  medium: '340px',
  tall: '460px',
  fullscreen: '75vh',
};

/**
 * Résout l'état de rendu d'une couverture Hero selon le profil de sortie et `prefers-reduced-motion` (N3.01 à N3.11).
 */
export function resolveHeroRenderState(
  hero?: HeroConfig | null,
  fallbackTitle = '',
  fallbackSubtitle = '',
  fallbackLogo = '',
  outputProfile: OutputProfile = 'web-interactive',
  prefersReducedMotion = false,
  charterColor?: string
): ResolvedHeroRenderState {
  if (!hero || !hero.enabled || hero.mediaType === 'none') {
    return {
      enabled: false,
      renderMode: 'none',
      backgroundColor: '#0f172a',
      mediaUrl: '',
      posterUrl: '',
      fit: 'cover',
      objectPositionCss: '50% 50%',
      veilCss: 'none',
      heightCss: '220px',
      textAlign: 'center',
      title: fallbackTitle,
      subtitle: fallbackSubtitle,
      logoUrl: fallbackLogo,
      credit: '',
      autoplay: false,
      loop: false,
      muted: true,
    };
  }

  const bg = hero.backgroundColor || '#0f172a';
  const isDark = isDarkColor(bg);
  let safeMedia = sanitizeSafeUrl(hero.mediaUrl || '');
  let safePoster = sanitizeSafeUrl(hero.posterUrl || '');
  if (isDark && (!safeMedia || safeMedia === DEFAULT_HERO_PHOTO)) {
    safeMedia = createThemedHeroSvg(charterColor, undefined, bg);
  }
  if (isDark && (!safePoster || safePoster === DEFAULT_HERO_PHOTO)) {
    safePoster = createThemedHeroSvg(charterColor, undefined, bg);
  }
  const safeLogo = sanitizeSafeUrl(hero.logoUrl || fallbackLogo || '');
  const fit = hero.fit === 'contain' ? 'contain' : 'cover';
  const rawFx = Array.isArray(hero.focalPoint) ? hero.focalPoint[0] : (hero.focalPoint?.x ?? 50);
  const rawFy = Array.isArray(hero.focalPoint) ? hero.focalPoint[1] : (hero.focalPoint?.y ?? 50);
  const fx = Math.max(0, Math.min(100, rawFx));
  const fy = Math.max(0, Math.min(100, rawFy));
  const objectPositionCss = `${fx}% ${fy}%`;

  const vColor = (hero.veilColor && hero.veilColor !== '#0f172a' ? hero.veilColor : charterColor) || hero.veilColor || '#0f172a';
  const vOpacity = Math.max(0, Math.min(1, hero.veilOpacity ?? 0.45));
  let veilCss = 'none';
  if (hero.veilStyle === 'solid') {
    veilCss = hexToRgba(vColor, vOpacity);
  } else if (hero.veilStyle !== 'none') {
    const startRgba = hexToRgba(vColor, Math.min(1, vOpacity * 1.15));
    const endRgba = hexToRgba(vColor, Math.max(0.08, vOpacity * 0.35));
    veilCss = `linear-gradient(180deg, ${endRgba} 0%, ${startRgba} 100%)`;
  }

  // En mode impression/brochure ou si prefers-reduced-motion est actif, une vidéo utilise son poster statique
  let renderMode: 'none' | 'photo' | 'video' | 'static-poster' = 'photo';
  if (hero.mediaType === 'video') {
    if (outputProfile === 'print' || prefersReducedMotion || !safeMedia) {
      renderMode = 'static-poster';
    } else {
      renderMode = 'video';
    }
  }

  return {
    enabled: true,
    renderMode,
    backgroundColor: bg,
    mediaUrl: safeMedia,
    posterUrl: safePoster,
    fit,
    objectPositionCss,
    veilCss,
    heightCss: outputProfile === 'print' ? '160px' : HEIGHT_CSS[hero.heightPreset || 'medium'] || '320px',
    textAlign: hero.contentAlign || 'center',
    title: hero.title || fallbackTitle,
    subtitle: hero.subtitle || fallbackSubtitle,
    logoUrl: safeLogo,
    credit: hero.credit || '',
    autoplay: hero.autoplay ?? true,
    loop: hero.loop ?? true,
    muted: hero.muted !== false,
  };
}

/**
 * Génère le fragment HTML autonome d'une couverture Hero pour les exports HTML / Brochure (N3.06 à N3.11).
 */
export function renderPublishedHeroHTML(
  hero?: HeroConfig | null,
  fallbackTitle = '',
  fallbackSubtitle = '',
  fallbackLogo = '',
  outputProfile: OutputProfile = 'web-interactive',
  idSuffix = 'project',
  charterColor?: string
): string {
  const state = resolveHeroRenderState(hero, fallbackTitle, fallbackSubtitle, fallbackLogo, outputProfile, false, charterColor);
  if (!state.enabled) return '';

  const safeId = escapeAttr(idSuffix);
  const alignItems = state.textAlign === 'left' ? 'flex-start' : state.textAlign === 'right' ? 'flex-end' : 'center';

  let mediaMarkup = '';
  if (state.renderMode === 'video' && state.mediaUrl) {
    const parsed = parseVideoEmbedUrl(state.mediaUrl);
    if (parsed.isEmbed) {
      mediaMarkup = `<iframe class="hero-video hero-iframe" src="${escapeAttr(parsed.embedUrl)}" allow="autoplay; fullscreen; picture-in-picture" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:max(100%,178vh);height:max(100%,56.25vw,540px);min-width:100%;min-height:100%;border:none;pointer-events:none;z-index:1;"></iframe>`;
    } else {
      mediaMarkup = `<video class="hero-video" id="hero-video-${safeId}" src="${escapeAttr(state.mediaUrl)}" ${state.posterUrl ? `poster="${escapeAttr(state.posterUrl)}"` : ''} ${state.autoplay ? 'autoplay' : ''} ${state.loop ? 'loop' : ''} muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:${state.fit};object-position:${state.objectPositionCss};z-index:1;"></video>
    <button type="button" class="hero-video-toggle no-print" data-action="toggle-hero-video" data-video-id="hero-video-${safeId}" aria-label="Lecture ou pause de la vidéo de couverture" style="position:absolute;bottom:10px;left:12px;z-index:4;background:rgba(15,23,42,0.78);color:#fff;border:1px solid rgba(255,255,255,0.25);border-radius:999px;padding:4px 10px;font-size:11px;cursor:pointer;">Pause vidéo</button>`;
    }
  } else {
    const imgSrc = state.renderMode === 'static-poster' ? state.posterUrl || state.mediaUrl : state.mediaUrl || state.posterUrl;
    if (imgSrc) {
      mediaMarkup = `<img class="hero-photo" src="${escapeAttr(imgSrc)}" alt="${escapeAttr(state.title || 'Couverture')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${state.fit};object-position:${state.objectPositionCss};z-index:1;"/>`;
    }
  }

  const veilMarkup = state.veilCss !== 'none' ? `<div class="hero-veil" style="position:absolute;inset:0;background:${state.veilCss};z-index:2;pointer-events:none;"></div>` : '';
  const logoMarkup = state.logoUrl ? `<img class="hero-logo" src="${escapeAttr(state.logoUrl)}" alt="Logo" style="max-height:44px;max-width:160px;object-fit:contain;margin-bottom:8px;"/>` : '';
  const creditMarkup = state.credit ? `<span class="hero-credit" style="position:absolute;bottom:8px;right:12px;z-index:4;font-size:10px;color:rgba(255,255,255,0.82);background:rgba(15,23,42,0.6);padding:2px 6px;border-radius:4px;">${sanitizeHTML(state.credit)}</span>` : '';

  return `<header class="story-hero" id="story-hero-${safeId}" data-render-mode="${state.renderMode}" style="position:relative;width:100%;min-height:${state.heightCss};background:${escapeAttr(state.backgroundColor)};overflow:hidden;border-radius:8px;margin-bottom:14px;display:flex;flex-direction:column;justify-content:center;align-items:${alignItems};padding:24px;text-align:${state.textAlign};color:#ffffff;">
    ${mediaMarkup}${veilMarkup}
    <div class="hero-content" style="position:relative;z-index:3;max-width:680px;display:flex;flex-direction:column;align-items:${alignItems};gap:6px;">
      ${logoMarkup}
      ${state.title ? `<h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">${sanitizeHTML(state.title)}</h1>` : ''}
      ${state.subtitle ? `<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.92);line-height:1.45;">${sanitizeHTML(state.subtitle)}</p>` : ''}
    </div>
    ${creditMarkup}
  </header>`;
}
