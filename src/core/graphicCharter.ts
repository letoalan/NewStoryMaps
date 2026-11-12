/**
 * StoryMap — Importateur, exportateur et convertisseur de charte graphique JSON
 */

import type { GraphicCharterDoc } from '../types/graphicCharter';
import type { ProjectBrand, ProjectMode } from '../types/project';
import type { SharedThemeTokens } from '../types/theme';
import type { Story, StoryAppearance, StoryFont, StoryMap } from '../types/story';
import { DEFAULT_THEME_TOKENS, isDarkColor } from './themeResolver';
import { selectCharterForContext, getCharterLogoForContext } from './charterContext';

export const ESCALE_NATURE_CHARTER: GraphicCharterDoc = {
  schemaVersion: '1.0.0', kind: 'graphic-charter',
  project: { name: 'Escale & Nature', audience: 'Visiteurs, familles et voyageurs curieux', values: 'Découverte · Proximité · Nature', description: 'Révéler les paysages, les rencontres et les savoir-faire.' },
  logo: { variants: { primary: null, light: null, dark: null }, clearSpace: 'Espace équivalent à la hauteur du symbole.', backgroundRules: 'Fond clair : version principale. Fond sombre : version blanche. Fond coloré : version sombre autorisée.' },
  colors: { primary: '#F8485E', secondary: '#00C1D3', text: '#334756', background: '#FFFFFF', surface: '#F3F4F4' },
  typography: { heading: { family: 'Nunito', weight: 700, sizePx: 32 }, body: { family: 'Roboto', weight: 400, sizePx: 16 } },
  imagery: { guidelines: 'Photographies de paysages locaux, lumière naturelle et scènes authentiques.' },
  rules: { prohibited: 'Déformer le logo. Multiplier les polices.' },
  layout: { spacingPx: 24, radiusPx: 12 },
  example: { title: 'Une escapade au vert', description: 'Prenez le temps de découvrir un territoire.', buttonLabel: 'Découvrir' },
};

export function parseGraphicCharterJson(
  input: unknown
): { success: true; doc: GraphicCharterDoc } | { success: false; error: string } {
  try {
    let raw: Record<string, unknown>;
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) return { success: false, error: 'Le contenu JSON est vide.' };
      raw = JSON.parse(trimmed) as Record<string, unknown>;
    } else if (typeof input === 'object' && input !== null) {
      raw = input as Record<string, unknown>;
    } else {
      return { success: false, error: 'Format invalide (doit être une chaîne JSON ou un objet).' };
    }

    if (!raw.colors || typeof raw.colors !== 'object') {
      return { success: false, error: 'Propriété "colors" manquante dans la charte.' };
    }
    const colors = raw.colors as Record<string, unknown>;
    if (!colors.primary || typeof colors.primary !== 'string') {
      return { success: false, error: 'Couleur primaire ("colors.primary") manquante.' };
    }

    const doc: GraphicCharterDoc = {
      schemaVersion: typeof raw.schemaVersion === 'string' ? raw.schemaVersion : '1.0.0',
      kind: 'graphic-charter',
      context: typeof raw.context === 'string' ? (raw.context as any) : undefined,
      project: (raw.project && typeof raw.project === 'object') ? (raw.project as any) : undefined,
      logo: (raw.logo && typeof raw.logo === 'object') ? (raw.logo as any) : undefined,
      colors: {
        primary: String(colors.primary),
        secondary: typeof colors.secondary === 'string' ? colors.secondary : String(colors.primary),
        text: typeof colors.text === 'string' ? colors.text : '#334756',
        background: typeof colors.background === 'string' ? colors.background : '#FFFFFF',
        surface: typeof colors.surface === 'string' ? colors.surface : '#F3F4F4',
        accent: typeof colors.accent === 'string' ? colors.accent : String(colors.primary),
      },
      typography: (raw.typography && typeof raw.typography === 'object') ? (raw.typography as any) : undefined,
      imagery: (raw.imagery && typeof raw.imagery === 'object') ? (raw.imagery as any) : undefined,
      rules: (raw.rules && typeof raw.rules === 'object') ? (raw.rules as any) : undefined,
      layout: (raw.layout && typeof raw.layout === 'object') ? (raw.layout as any) : undefined,
      example: (raw.example && typeof raw.example === 'object') ? (raw.example as any) : undefined,
      variants: (raw.variants && typeof raw.variants === 'object') ? (raw.variants as any) : undefined,
    };

    return { success: true, doc };
  } catch (err) {
    return { success: false, error: `Erreur de syntaxe JSON : ${err instanceof Error ? err.message : String(err)}` };
  }
}

export function convertCharterToTheme(doc: GraphicCharterDoc) {
  const isDark = isDarkColor(doc.colors.background || '#ffffff');
  const headingFont = doc.typography?.heading?.family || (isDark ? 'Georgia' : 'Inter');
  const bodyFont = doc.typography?.body?.family || (isDark ? 'Verdana' : 'Roboto');
  const logoUrl = getCharterLogoForContext(doc, isDark ? 'dark' : (doc.context || 'light')) || doc.logo?.variants?.primary || doc.logo?.variants?.light || doc.logo?.variants?.dark || undefined;
  const radius = doc.layout?.radiusPx !== undefined ? doc.layout.radiusPx : (isDark ? 2 : 8);
  const mapStyle = isDark ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

  const brand: ProjectBrand = {
    primaryColor: doc.colors.primary, secondaryColor: doc.colors.secondary,
    fontTitle: headingFont, fontBody: bodyFont, logo: logoUrl || undefined,
    colors: [doc.colors.primary, doc.colors.secondary, doc.colors.accent || doc.colors.primary],
  };

  const themeTokens: Partial<SharedThemeTokens> = {
    ...DEFAULT_THEME_TOKENS, primaryColor: doc.colors.primary, secondaryColor: doc.colors.secondary,
    accentColor: doc.colors.accent || doc.colors.primary, textColor: doc.colors.text || (isDark ? '#F4F0E8' : '#334756'),
    pageBackground: doc.colors.background || (isDark ? '#111827' : '#FFFFFF'),
    surfaceBackground: doc.colors.surface || (isDark ? '#1F2937' : '#F3F4F4'),
    mutedTextColor: isDark ? 'rgba(244, 240, 232, 0.72)' : '#5c574f',
    borderColor: isDark ? 'rgba(244, 240, 232, 0.15)' : '#e2dfd9',
    headingFont, bodyFont, fontTitle: headingFont, fontBody: bodyFont,
    titleSizePx: doc.typography?.heading?.sizePx || (isDark ? 40 : 32),
    bodySizePx: doc.typography?.body?.sizePx || 16,
    radiusPx: radius, logo: logoUrl || undefined,
    mapRouteColor: doc.colors.secondary || doc.colors.primary, mapFeatureColor: doc.colors.primary,
  };

  const appearancePatch: Partial<StoryAppearance> = {
    accentColor: doc.colors.primary, routeColor: doc.colors.secondary || doc.colors.primary,
    headingFont, bodyFont, font: (bodyFont as StoryFont) || 'Roboto',
    panelBackground: doc.colors.surface || (isDark ? '#1F2937' : '#F3F4F4'),
    textColor: doc.colors.text || (isDark ? '#F4F0E8' : '#334756'),
    theme: isDark ? 'dark' : 'light',
  };

  return { brand, themeTokens, appearancePatch, isDark, mapStyle, projectMeta: { title: doc.project?.name, subtitle: doc.project?.description || doc.project?.values } };
}

export function applyCharterToStory(story: Story, doc: GraphicCharterDoc): Story {
  const activeDoc = doc.variants ? selectCharterForContext(doc, { theme: story.appearance?.theme, pageBackground: story.themeTokens?.pageBackground, mapStyle: story.mapStyle }) : doc;
  const { brand, themeTokens, appearancePatch, projectMeta, isDark, mapStyle } = convertCharterToTheme(activeDoc);
  const updatedMaps = (story.maps || []).map((m) => ({
    ...m, mapStyle: isDark ? 'dark-matter' : 'positron',
    layers: (m.layers || []).map((l) => ({
      ...l, color: activeDoc.colors.secondary || activeDoc.colors.primary,
      features: (l.features || []).map((f) => ({ ...f, color: f.geometryType === 'LineString' ? (activeDoc.colors.secondary || activeDoc.colors.primary) : activeDoc.colors.primary })),
    })),
  }));

  return {
    ...story,
    title: (!story.title || story.title.startsWith('Nouvelle ') || story.title.startsWith('Sans titre')) && projectMeta.title ? projectMeta.title : story.title,
    subtitle: projectMeta.subtitle || story.subtitle,
    brand, themeTokens: { ...story.themeTokens, ...themeTokens },
    appearance: { ...story.appearance, ...appearancePatch },
    mapStyle, maps: updatedMaps.length > 0 ? updatedMaps : story.maps,
    hero: story.hero ? { ...story.hero, logoUrl: brand.logo || story.hero.logoUrl, veilColor: activeDoc.colors.primary, backgroundColor: activeDoc.colors.background || activeDoc.colors.surface || activeDoc.colors.primary } : story.hero,
    graphicCharter: doc,
  };
}

export function exportGraphicCharterJson(story: Story): GraphicCharterDoc {
  if (story.graphicCharter && typeof story.graphicCharter === 'object') return story.graphicCharter as GraphicCharterDoc;
  const tok = story.themeTokens || {}, brand = story.brand || {}, app = story.appearance || {};
  return {
    schemaVersion: '1.0.0', kind: 'graphic-charter',
    project: { name: story.title || 'Projet StoryMap', description: story.subtitle || story.description || '' },
    logo: { variants: { primary: brand.logo || tok.logo || null, light: null, dark: null } },
    colors: { primary: tok.primaryColor || brand.primaryColor || app.accentColor || '#d97706', secondary: tok.secondaryColor || brand.secondaryColor || '#0284c7', text: tok.textColor || app.textColor || '#1a1816', background: tok.pageBackground || '#ffffff', surface: tok.surfaceBackground || app.panelBackground || '#ffffff' },
    typography: { heading: { family: tok.headingFont || brand.fontTitle || app.headingFont || 'Lora', weight: 700, sizePx: tok.titleSizePx || 32 }, body: { family: tok.bodyFont || brand.fontBody || app.bodyFont || 'Inter', weight: 400, sizePx: tok.bodySizePx || 16 } },
    layout: { spacingPx: 24, radiusPx: tok.radiusPx ?? 8 },
  };
}

export function createStoryFromCharter(doc: GraphicCharterDoc, defaultMode: ProjectMode = 'rich-document'): StoryMap {
  const activeDoc = doc.variants ? selectCharterForContext(doc, { outputProfile: defaultMode === 'brochure' ? 'print' : undefined }) : doc;
  const { brand, themeTokens, appearancePatch, projectMeta, isDark, mapStyle } = convertCharterToTheme(activeDoc);
  const title = projectMeta.title || (isDark ? 'Atlas Nocturne' : 'Escale & Nature'), subtitle = projectMeta.subtitle || '', now = Date.now(), dims = { cols: 6, rows: 8, marginMm: 12 };
  const pointCol = activeDoc.colors.primary, lineCol = activeDoc.colors.secondary || activeDoc.colors.primary;
  const lineFeat = { id: `feat-${now}-line`, name: 'Itinéraire', geometryType: 'LineString' as const, coordinates: [[2.33, 48.85], [2.3522, 48.8566], [2.37, 48.86]] as any, color: lineCol, numberIndex: 0 };
  const ptFeat = { id: `feat-${now}-1`, name: 'Étape 1', geometryType: 'Point' as const, coordinates: [2.3522, 48.8566] as [number, number], color: pointCol, numberIndex: 1 };
  const defaultMap = { id: `map-${now}-1`, name: 'Carte principale', mapStyle: isDark ? 'dark-matter' : 'positron', view: { center: [2.3522, 48.8566] as [number, number], zoom: 11, pitch: 0, bearing: 0 }, layers: [{ id: `layer-${now}-1`, name: 'Repères & Tracés', visible: true, opacity: 1, color: lineCol, features: [lineFeat, ptFeat] }] };
  const narrative = [activeDoc.project?.description || subtitle, activeDoc.example?.description].filter(Boolean).join('\n\n') || 'Révéler les paysages et les atmosphères.';
  const callout = [activeDoc.example?.title, activeDoc.project?.values].filter(Boolean).join('\n\n') || 'Points clés du parcours';
  const guidelines = activeDoc.imagery?.guidelines || 'Documentation et repères cartographiques.';

  return {
    id: `story-${now}-${Math.random().toString(36).slice(2, 6)}`,
    version: '2.0.0', title, subtitle, created: now, modified: now, mode: defaultMode, brand, themeTokens,
    appearance: { theme: isDark ? 'dark' : 'light', font: (activeDoc.typography?.body?.family as StoryFont) || 'Roboto', headingFont: activeDoc.typography?.heading?.family || (isDark ? 'Georgia' : 'Nunito'), bodyFont: activeDoc.typography?.body?.family || (isDark ? 'Verdana' : 'Roboto'), accentColor: activeDoc.colors.primary, panelBackground: activeDoc.colors.surface || (isDark ? '#1F2937' : '#F3F4F4'), textColor: activeDoc.colors.text || (isDark ? '#F4F0E8' : '#334756'), panelPosition: 'left', showProgress: true, routeColor: lineCol, ...appearancePatch },
    hero: { enabled: true, mediaType: 'photo', title, subtitle, logoUrl: brand.logo, veilColor: activeDoc.colors.primary, backgroundColor: activeDoc.colors.background || activeDoc.colors.surface || activeDoc.colors.primary, veilStyle: 'gradient', veilOpacity: 0.45, heightPreset: 'medium', contentAlign: 'center' },
    mapStyle, maps: [defaultMap], layers: [],
    steps: [
      { id: 'step-1', title, description: subtitle || activeDoc.project?.values || 'Présentation du territoire.', camera: { center: [2.3522, 48.8566], zoom: 11, pitch: 0, bearing: 0 } },
      { id: 'step-2', title: activeDoc.example?.title || 'Une escapade au vert', description: activeDoc.example?.description || activeDoc.imagery?.guidelines || '', camera: { center: [2.3522, 48.8566], zoom: 13, pitch: 20, bearing: 15 } },
    ],
    pages: [{
      id: 'page-1', title: 'Page 1', layout: { format: 'a4-portrait', gridColumns: dims.cols, gridRows: dims.rows, marginMm: dims.marginMm },
      blocks: [
        { id: 'b-title', type: 'title', x: 0, y: 0, w: dims.cols, h: 1, data: { text: title, level: 1 } },
        { id: 'b-map', type: 'map', x: 0, y: 1, w: dims.cols, h: 3, data: { title: 'Carte interactive', caption: 'Légende cartographique', mapId: defaultMap.id } },
        { id: 'b-desc', type: 'text', x: 0, y: 4, w: 4, h: 3, data: { text: narrative } },
        { id: 'b-callout', type: 'callout', x: 4, y: 4, w: 2, h: 3, data: { text: callout } },
        { id: 'b-source', type: 'source', x: 0, y: 7, w: dims.cols, h: 1, data: { text: guidelines } },
      ],
    }],
    graphicCharter: doc,
  };
}
