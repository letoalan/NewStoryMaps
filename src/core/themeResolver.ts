/**
 * StoryMap — Résolution pure du thème partagé et contraste WCAG (N2)
 */

import type { Story } from '../types/story';
import type { Page, Block } from '../types/project';
import type {
  SharedThemeTokens,
  OutputProfile,
  ResolvedVisualStyle,
  BlockVisualOverride,
  PageVisualOverride,
} from '../types/theme';
import { selectCharterForContext, getCharterLogoForContext } from './charterContext';

export const FONT_CATALOG: Array<{ family: string; label: string; category: string; license: string }> = [
  { family: 'Inter', label: 'Inter (Sans-serif)', category: 'sans-serif', license: 'SIL OFL 1.1' },
  { family: 'Nunito', label: 'Nunito (Sans chaleureux)', category: 'sans-serif', license: 'SIL OFL 1.1' },
  { family: 'Lora', label: 'Lora (Serif éditorial)', category: 'serif', license: 'SIL OFL 1.1' },
  { family: 'Merriweather', label: 'Merriweather (Serif lisible)', category: 'serif', license: 'SIL OFL 1.1' },
  { family: 'Roboto', label: 'Roboto (Sans géométrique)', category: 'sans-serif', license: 'Apache 2.0' },
  { family: 'Cinzel', label: 'Cinzel (Titrage classique)', category: 'serif', license: 'SIL OFL 1.1' },
  { family: 'Georgia', label: 'Georgia (Serif élégant)', category: 'serif', license: 'System' },
  { family: 'Verdana', label: 'Verdana (Sans lisible)', category: 'sans-serif', license: 'System' },
];

export const DEFAULT_THEME_TOKENS: SharedThemeTokens = {
  headingFont: 'Lora',
  bodyFont: 'Inter',
  primaryColor: '#d97706',
  secondaryColor: '#0284c7',
  accentColor: '#d97706',
  pageBackground: '#ffffff',
  surfaceBackground: '#ffffff',
  surfaceOpacity: 1,
  textColor: '#1a1816',
  mutedTextColor: '#5c574f',
  borderColor: '#e2dfd9',
  borderWidthPx: 1,
  borderStyle: 'solid',
  radiusPx: 8,
  shadowPreset: 'sm',
  density: 'comfortable',
};

const SHADOW_MAP: Record<string, string> = {
  none: 'none',
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.12)',
  lg: '0 10px 25px rgba(0,0,0,0.16)',
};

const DENSITY_PADDING: Record<string, number> = { compact: 8, comfortable: 14, spacious: 22 };

/** Convertit une couleur hexadécimale en rgba(r, g, b, alpha) sans affecter l'opacité du contenu (N2.13) */
export function hexToRgba(color: string, alpha: number): string {
  const clampedAlpha = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  if (!color || color === 'transparent') return 'rgba(255, 255, 255, 0)';
  const clean = color.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const r = parseInt(clean[0] + clean[0], 16), g = parseInt(clean[1] + clean[1], 16), b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${Number(clampedAlpha.toFixed(3))})`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    const r = parseInt(clean.slice(0, 2), 16), g = parseInt(clean.slice(2, 4), 16), b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${Number(clampedAlpha.toFixed(3))})`;
  }
  return color;
}

/** Détermine si une couleur hexadécimale est sombre (YIQ < 128) */
export function isDarkColor(hex?: string | null): boolean {
  if (!hex || hex === 'transparent') return false;
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length < 3) return false;
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0');
  const r = parseInt(full.slice(0, 2), 16) || 0, g = parseInt(full.slice(2, 4), 16) || 0, b = parseInt(full.slice(4, 6), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

/** Unifie `story.brand`, `story.appearance` et `story.themeTokens` sans divergence (N2.04) */
export function extractProjectThemeTokens(story?: Partial<Story> | null): SharedThemeTokens {
  const brand = story?.brand, app = story?.appearance, tok = story?.themeTokens;
  const primary = tok?.primaryColor || brand?.primaryColor || app?.accentColor || DEFAULT_THEME_TOKENS.primaryColor;
  const accent = tok?.accentColor || app?.accentColor || brand?.primaryColor || DEFAULT_THEME_TOKENS.accentColor;
  const pageBg = tok?.pageBackground || DEFAULT_THEME_TOKENS.pageBackground;
  const isDark = isDarkColor(pageBg);
  const logo = tok?.logo || brand?.logo || story?.hero?.logoUrl || story?.graphicCharter?.logo?.variants?.primary || story?.graphicCharter?.logo?.variants?.light || story?.graphicCharter?.logo?.variants?.dark || undefined;

  return {
    headingFont: tok?.headingFont || brand?.fontTitle || app?.headingFont || DEFAULT_THEME_TOKENS.headingFont,
    bodyFont: tok?.bodyFont || brand?.fontBody || app?.bodyFont || DEFAULT_THEME_TOKENS.bodyFont,
    primaryColor: primary,
    secondaryColor: tok?.secondaryColor || brand?.secondaryColor || DEFAULT_THEME_TOKENS.secondaryColor,
    accentColor: accent,
    pageBackground: pageBg,
    surfaceBackground: tok?.surfaceBackground || app?.panelBackground || (isDark ? '#1F2937' : DEFAULT_THEME_TOKENS.surfaceBackground),
    surfaceOpacity: tok?.surfaceOpacity ?? DEFAULT_THEME_TOKENS.surfaceOpacity,
    textColor: tok?.textColor || app?.textColor || (isDark ? '#F4F0E8' : DEFAULT_THEME_TOKENS.textColor),
    mutedTextColor: tok?.mutedTextColor || (isDark ? 'rgba(244, 240, 232, 0.72)' : DEFAULT_THEME_TOKENS.mutedTextColor),
    borderColor: tok?.borderColor || (isDark ? 'rgba(244, 240, 232, 0.15)' : DEFAULT_THEME_TOKENS.borderColor),
    borderWidthPx: tok?.borderWidthPx ?? DEFAULT_THEME_TOKENS.borderWidthPx,
    borderStyle: tok?.borderStyle || DEFAULT_THEME_TOKENS.borderStyle,
    radiusPx: tok?.radiusPx ?? (isDark ? 2 : DEFAULT_THEME_TOKENS.radiusPx),
    shadowPreset: tok?.shadowPreset || DEFAULT_THEME_TOKENS.shadowPreset,
    density: tok?.density || DEFAULT_THEME_TOKENS.density,
    titleSizePx: tok?.titleSizePx, bodySizePx: tok?.bodySizePx,
    mapRouteColor: tok?.mapRouteColor || tok?.secondaryColor,
    mapFeatureColor: tok?.mapFeatureColor || tok?.primaryColor,
    logo,
  };
}

/** Résout le style visuel final pour un couple (story, page, block, outputProfile) (N2.02) */
export function resolveVisualStyle(
  story?: Partial<Story> | null,
  page?: Partial<Page> | null,
  block?: Partial<Block> | null,
  outputProfile: OutputProfile = 'web-interactive'
): ResolvedVisualStyle {
  const base = extractProjectThemeTokens(story);
  const pageOvr: PageVisualOverride | undefined = page?.styleOverride;
  const blockOvr: BlockVisualOverride | undefined = block?.styleOverride;

  const ch = story?.graphicCharter?.variants ? selectCharterForContext(story.graphicCharter, { theme: story.appearance?.theme, outputProfile, pageBackground: pageOvr?.pageBackground, mapStyle: story.mapStyle }) : story?.graphicCharter;
  const pageBackground = pageOvr?.pageBackground || ch?.colors.background || base.pageBackground;
  const isDarkTheme = isDarkColor(pageBackground);
  const charterLogo = ch ? (getCharterLogoForContext(ch, isDarkTheme ? 'dark' : (ch.context || 'light')) || ch.logo?.variants?.primary || ch.logo?.variants?.light || ch.logo?.variants?.dark) : undefined;
  const textColor = blockOvr?.textColor || pageOvr?.textColor || ch?.colors.text || base.textColor;
  const accentColor = blockOvr?.accentColor || pageOvr?.accentColor || ch?.colors.accent || base.accentColor;
  const paddingPx = blockOvr?.paddingPx ?? pageOvr?.paddingPx ?? DENSITY_PADDING[base.density] ?? 14;

  const isFrameless = blockOvr?.styleMode === 'frameless';
  const isCustom = blockOvr?.styleMode === 'custom';

  const surfaceBackground = isFrameless ? 'transparent' : (isCustom && blockOvr?.backgroundColor) || ch?.colors.surface || base.surfaceBackground;
  const surfaceOpacity = isFrameless ? 0 : isCustom && blockOvr?.backgroundOpacity !== undefined ? blockOvr.backgroundOpacity : base.surfaceOpacity;
  const borderStyle = isFrameless ? 'none' : (isCustom && blockOvr?.borderStyle) || base.borderStyle;
  const borderWidthPx = isFrameless || borderStyle === 'none' ? 0 : isCustom && blockOvr?.borderWidthPx !== undefined ? blockOvr.borderWidthPx : base.borderWidthPx;
  const borderColor = (isCustom && blockOvr?.borderColor) || base.borderColor;
  const radiusPx = isCustom && blockOvr?.radiusPx !== undefined ? blockOvr.radiusPx : base.radiusPx;
  const shadowPreset = isFrameless ? 'none' : (isCustom && blockOvr?.shadowPreset) || base.shadowPreset;
  const isPrint = outputProfile === 'print';

  return {
    headingFont: base.headingFont, bodyFont: base.bodyFont, primaryColor: base.primaryColor, secondaryColor: base.secondaryColor,
    accentColor, pageBackground: isPrint && pageBackground === 'transparent' ? '#ffffff' : pageBackground,
    surfaceBackground, surfaceOpacity,
    surfaceCssBackground: isFrameless ? 'transparent' : hexToRgba(surfaceBackground, surfaceOpacity),
    textColor, mutedTextColor: base.mutedTextColor, borderColor,
    borderCss: borderWidthPx > 0 && borderStyle !== 'none' ? `${borderWidthPx}px ${borderStyle} ${borderColor}` : 'none',
    radiusCss: `${radiusPx}px`, borderRadiusPx: radiusPx, shadowCss: isPrint ? 'none' : SHADOW_MAP[shadowPreset] || 'none',
    paddingCss: `${paddingPx}px`, paddingPx,
    showEditorGuide: outputProfile === 'editor' && (isFrameless || borderWidthPx === 0 || surfaceOpacity < 0.15),
    titleSizePx: base.titleSizePx, bodySizePx: base.bodySizePx,
    mapRouteColor: base.mapRouteColor, mapFeatureColor: base.mapFeatureColor,
    logo: charterLogo || base.logo,
  };
}

/** Calcule le ratio de contraste WCAG 2.1 entre deux couleurs hexadécimales (N2.06) */
export function measureColorContrast(fgHex: string, bgHex: string): number {
  const lum = (hex: string): number => {
    const clean = (hex || '#000000').trim().replace(/^#/, '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0');
    const rgb = [0, 2, 4].map((i) => {
      const c = parseInt(full.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const l1 = lum(fgHex), l2 = lum(bgHex);
  return Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
}

export function resetBlockStyleToInherited(block: Block): Block {
  const clone = { ...block };
  delete clone.styleOverride;
  return clone;
}

export function resetPageStyleToInherited(page: Page): Page {
  const clone = { ...page };
  delete clone.styleOverride;
  return clone;
}
