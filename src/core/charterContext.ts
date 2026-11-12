/**
 * StoryMap — Algorithme de détection et sélection de charte graphique contextuelle (Claire / Sombre / Coloré)
 */

import type { GraphicCharterDoc, CharterContextType, GraphicCharterVariants, GraphicCharterCriteria } from '../types/graphicCharter';

export function parseHexRgb(hex?: string | null): { r: number; g: number; b: number } | null {
  if (!hex || hex === 'transparent') return null;
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    return { r: parseInt(clean[0] + clean[0], 16) || 0, g: parseInt(clean[1] + clean[1], 16) || 0, b: parseInt(clean[2] + clean[2], 16) || 0 };
  }
  if (clean.length === 6) {
    return { r: parseInt(clean.slice(0, 2), 16) || 0, g: parseInt(clean.slice(2, 4), 16) || 0, b: parseInt(clean.slice(4, 6), 16) || 0 };
  }
  return null;
}

export function getColorMetrics(hex?: string | null): { luminance: number; saturation: number } {
  const rgb = parseHexRgb(hex);
  if (!rgb) return { luminance: 1, saturation: 0 };
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  const luminance = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * luminance - 1));
  return { luminance, saturation };
}

/**
 * Algorithme de détection automatique du contexte (Claire, Sombre ou Coloré) d'une charte graphique.
 */
export function detectCharterContext(doc: GraphicCharterDoc): CharterContextType {
  if (doc.context && (doc.context === 'light' || doc.context === 'dark' || doc.context === 'colored')) {
    return doc.context;
  }
  const bg = doc.colors?.background;
  const surf = doc.colors?.surface;
  const bgM = getColorMetrics(bg || surf);
  const surfM = getColorMetrics(surf || bg);

  // 1. Sombre si luminance faible (< 0.38)
  if (bgM.luminance < 0.38 || (surfM.luminance < 0.35 && bgM.luminance < 0.5)) {
    return 'dark';
  }
  // 2. Coloré si saturation prononcée et contraste intermédiaire
  if ((bgM.saturation > 0.28 && bgM.luminance >= 0.2 && bgM.luminance <= 0.85) ||
      (surfM.saturation > 0.35 && surfM.luminance >= 0.2 && surfM.luminance <= 0.85)) {
    return 'colored';
  }
  // 3. Claire par défaut
  return 'light';
}

/**
 * Sélectionne la variante de charte adaptée selon le contexte de restitution (fond, profil d'impression, carte, etc.)
 */
export function selectCharterForContext(doc: GraphicCharterDoc, criteria?: GraphicCharterCriteria): GraphicCharterDoc {
  if (!doc.variants || Object.keys(doc.variants).length === 0) return doc;

  let target: CharterContextType = 'light';

  if (criteria?.outputProfile === 'print') {
    target = 'light';
  } else if (criteria?.theme === 'dark' || (criteria?.mapStyle && criteria.mapStyle.includes('dark'))) {
    target = 'dark';
  } else if (criteria?.containerBackground || criteria?.pageBackground) {
    const m = getColorMetrics(criteria.containerBackground || criteria.pageBackground);
    if (m.luminance < 0.38) target = 'dark';
    else if (m.saturation > 0.28 && m.luminance >= 0.2 && m.luminance <= 0.85) target = 'colored';
    else target = 'light';
  } else if (criteria?.isSurfaceColored) {
    target = 'colored';
  } else if (criteria?.theme === 'light') {
    target = 'light';
  } else {
    target = doc.context || detectCharterContext(doc);
  }

  const selected = doc.variants[target] || (target === 'colored' ? (doc.variants.light || doc.variants.dark) : target === 'dark' ? (doc.variants.dark || doc) : (doc.variants.light || doc)) || doc;
  return { ...selected, context: target, variants: doc.variants };
}

/**
 * Sélectionne le logo prescrit selon la règle :
 * "Fond clair : version principale. Fond sombre : version blanche. Fond coloré : version sombre autorisée."
 */
export function getCharterLogoForContext(doc: GraphicCharterDoc, context: CharterContextType): string | null {
  const vars = doc.logo?.variants;
  if (!vars) return null;
  if (context === 'dark') return vars.light || vars.primary || null;
  if (context === 'colored') return vars.dark || vars.light || vars.primary || null;
  return vars.primary || vars.dark || null;
}

/**
 * Assemble 1 à 3 variantes dans un document racine unifié
 */
export function bundleCharterVariants(variants: GraphicCharterVariants, primaryContext: CharterContextType = 'light'): GraphicCharterDoc {
  const base = variants[primaryContext] || variants.light || variants.dark || variants.colored;
  if (!base) throw new Error('Aucune variante fournie pour le bundle');
  return {
    ...base,
    context: primaryContext,
    variants: {
      light: variants.light ? { ...variants.light, context: 'light' } : undefined,
      dark: variants.dark ? { ...variants.dark, context: 'dark' } : undefined,
      colored: variants.colored ? { ...variants.colored, context: 'colored' } : undefined,
    },
  };
}

export const ESCALE_NATURE_LIGHT: GraphicCharterDoc = {
  schemaVersion: '1.0.0', kind: 'graphic-charter', context: 'light',
  project: { name: 'Escale & Nature', audience: 'Visiteurs, familles et voyageurs', values: 'Découverte · Proximité · Nature', description: 'Révéler les paysages, les rencontres et les savoir-faire.' },
  logo: { variants: { primary: null, light: null, dark: null }, clearSpace: 'Espace équivalent à la hauteur du symbole.', backgroundRules: 'Fond clair : version principale.' },
  colors: { primary: '#F8485E', secondary: '#00C1D3', text: '#334756', background: '#FFFFFF', surface: '#F3F4F4' },
  typography: { heading: { family: 'Nunito', weight: 700, sizePx: 32 }, body: { family: 'Roboto', weight: 400, sizePx: 16 } },
  imagery: { guidelines: 'Photographies de paysages locaux, lumière naturelle.' },
  rules: { prohibited: 'Déformer le logo. Multiplier les polices.' },
  layout: { spacingPx: 24, radiusPx: 12 },
  example: { title: 'Une escapade au vert', description: 'Découvrir un territoire préservé.', buttonLabel: 'Découvrir' },
};

export const ATLAS_NOCTURNE_DARK: GraphicCharterDoc = {
  schemaVersion: '1.0.0', kind: 'graphic-charter', context: 'dark',
  project: { name: 'Atlas Nocturne', audience: 'Explorateurs, noctambules et historiens', values: 'Exploration · Contemplation · Mémoire', description: 'Quand la ville change de lumière.' },
  logo: { variants: { primary: null, light: null, dark: null }, clearSpace: 'Espace équivalent à la hauteur du symbole.', backgroundRules: 'Fond sombre : version blanche.' },
  colors: { primary: '#E9B949', secondary: '#B8A1E3', text: '#F4F0E8', background: '#111827', surface: '#1F2937' },
  typography: { heading: { family: 'Georgia', weight: 700, sizePx: 40 }, body: { family: 'Verdana', weight: 400, sizePx: 16 } },
  imagery: { guidelines: 'Photographies nocturnes, éclairages feutrés, scènes en basse lumière.' },
  rules: { prohibited: 'Ombres décoratives sur les titres. Fonds clairs non atténués.' },
  layout: { spacingPx: 24, radiusPx: 2 },
  example: { title: 'Quand la ville change de lumière', description: 'Exploration · Contemplation · Mémoire des lieux', buttonLabel: 'Explorer' },
};

export const HORIZON_COLORED: GraphicCharterDoc = {
  schemaVersion: '1.0.0', kind: 'graphic-charter', context: 'colored',
  project: { name: 'Horizon Vibrant', audience: 'Aventuriers et passionnés de grands espaces', values: 'Énergie · Éclat · Mouvement', description: 'Une immersion visuelle chaleureuse et intense.' },
  logo: { variants: { primary: null, light: null, dark: null }, clearSpace: 'Espace équivalent au symbole.', backgroundRules: 'Fond coloré : version sombre autorisée.' },
  colors: { primary: '#FFD166', secondary: '#06D6A0', text: '#FFFFFF', background: '#0F766E', surface: '#115E59' },
  typography: { heading: { family: 'Nunito', weight: 800, sizePx: 36 }, body: { family: 'Roboto', weight: 400, sizePx: 16 } },
  imagery: { guidelines: 'Couleurs saturées, cadrages dynamiques, horizons lointains.' },
  rules: { prohibited: 'Couleurs ternes. Typographies illisibles sur fond saturé.' },
  layout: { spacingPx: 20, radiusPx: 16 },
  example: { title: 'L’appel du grand large', description: 'Plongez au cœur des éléments.', buttonLabel: 'S’embarquer' },
};

export const DEFAULT_CHARTER_VARIANTS: Record<CharterContextType, GraphicCharterDoc> = {
  light: ESCALE_NATURE_LIGHT,
  dark: ATLAS_NOCTURNE_DARK,
  colored: HORIZON_COLORED,
};

