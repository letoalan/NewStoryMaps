/**
 * StoryMap — Catalogue partagé d'insertion/remplacement et positionnement de palette flottante (N1.01 -> N1.12)
 */

import type { Block, BlockType, ProjectMode } from '../types/project';

export type CatalogCategory = 'Texte' | 'Médias' | 'Carte' | 'Documentation';

export interface BlockCatalogItem {
  type: BlockType;
  label: string;
  description: string;
  category: CatalogCategory;
  allowedModes: ProjectMode[];
  staticAlternative?: string;
}

export const CATALOG_CATEGORIES: CatalogCategory[] = ['Texte', 'Médias', 'Carte', 'Documentation'];

export const BLOCK_CATALOG: BlockCatalogItem[] = [
  {
    type: 'title', label: 'Titre de section', description: 'En-tête hiérarchique H1 à H6',
    category: 'Texte', allowedModes: ['rich-document', 'brochure'],
  },
  {
    type: 'text', label: 'Paragraphe de texte', description: 'Corps narratif enrichi avec liaisons',
    category: 'Texte', allowedModes: ['rich-document', 'brochure'],
  },
  {
    type: 'callout', label: 'Encadré / Citation', description: 'Point d’attention ou chiffre-clé',
    category: 'Texte', allowedModes: ['rich-document', 'brochure'],
  },
  {
    type: 'image', label: 'Photographie', description: 'Image unique ou planche contact avec légende',
    category: 'Médias', allowedModes: ['rich-document', 'brochure'],
  },
  {
    type: 'gallery', label: 'Galerie carrousel', description: 'Série d’images interactive (aplatie en brochure)',
    category: 'Médias', allowedModes: ['rich-document'],
    staticAlternative: 'Planche contact photographique (Image)',
  },
  {
    type: 'map', label: 'Carte liée', description: 'Scène MapLibre interactive ou cadrage statique A4',
    category: 'Carte', allowedModes: ['rich-document', 'brochure'],
  },
  {
    type: 'table', label: 'Tableau de données', description: 'Grille de chiffres et indicateurs comparatifs',
    category: 'Documentation', allowedModes: ['rich-document', 'brochure'],
  },
  {
    type: 'legend', label: 'Légende cartographique', description: 'Nomenclature des figurés et symboles',
    category: 'Documentation', allowedModes: ['rich-document', 'brochure'],
  },
  {
    type: 'source', label: 'Sources & Crédits', description: 'Attributions légales et références bibliographiques',
    category: 'Documentation', allowedModes: ['rich-document', 'brochure'],
  },
  {
    type: 'button', label: 'Bouton d’action', description: 'Commande interactive liée à la carte ou navigation',
    category: 'Texte', allowedModes: ['rich-document'],
  },
];

export function getAvailableCatalogItems(mode: ProjectMode = 'rich-document'): BlockCatalogItem[] {
  const effectiveMode = mode === 'brochure' ? 'brochure' : 'rich-document';
  return BLOCK_CATALOG.filter((item) => item.allowedModes.includes(effectiveMode));
}

/** Change le type d'un bloc sans aucune perte silencieuse des données compatibles (N1.04) */
export function convertBlockTypePreservingContent(block: Block, newType: BlockType): Block {
  if (block.type === newType) return block;
  const oldData = { ...block.data };
  const preservedText =
    typeof oldData.text === 'string' && oldData.text
      ? oldData.text
      : typeof oldData.caption === 'string'
        ? oldData.caption
        : typeof oldData.title === 'string'
          ? oldData.title
          : '';

  const nextData: Record<string, unknown> = {
    ...oldData,
    text: preservedText,
  };

  if (newType === 'title' && typeof nextData.level !== 'number') {
    nextData.level = 2;
  }
  if (newType === 'table' && !Array.isArray(nextData.rows)) {
    nextData.rows = [
      ['Indicateur', 'Valeur'],
      [preservedText || 'Donnée 1', '100'],
    ];
  }
  if (newType === 'gallery' && !Array.isArray(nextData.items)) {
    const existingUrl = typeof oldData.url === 'string' && oldData.url ? oldData.url : '';
    nextData.items = existingUrl ? [{ url: existingUrl, caption: String(oldData.caption || '') }] : [];
  }
  if (newType === 'image' && !nextData.url && Array.isArray(oldData.items) && oldData.items.length > 0) {
    const first = oldData.items[0] as any;
    nextData.url = typeof first === 'string' ? first : String(first?.url || '');
  }
  if (newType === 'button' && !nextData.label) {
    nextData.label = preservedText || 'Bouton d’action';
  }

  return {
    ...block,
    type: newType,
    data: nextData,
  };
}

export interface AnchorRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface FloatingPalettePlacement {
  layout: 'popover' | 'bottom-sheet';
  top?: number;
  left: number;
  bottom?: number;
  width: number;
  maxHeight: number;
  flippedVertically: boolean;
}

/** Calcule le positionnement hors-grille avec évitement des bords du viewport et mode mobile (N1.02, N1.07) */
export function computeFloatingPalettePosition(
  anchor: AnchorRect,
  viewportWidth: number,
  viewportHeight: number,
  paletteWidth = 340,
  paletteHeight = 360
): FloatingPalettePlacement {
  const margin = 12;
  if (viewportWidth < 640) {
    return {
      layout: 'bottom-sheet',
      left: 0,
      bottom: 0,
      width: viewportWidth,
      maxHeight: Math.max(240, Math.round(viewportHeight * 0.72)),
      flippedVertically: false,
    };
  }

  const clampedWidth = Math.min(paletteWidth, viewportWidth - margin * 2);
  let left = anchor.left + anchor.width / 2 - clampedWidth / 2;
  left = Math.max(margin, Math.min(left, viewportWidth - clampedWidth - margin));

  const spaceBelow = viewportHeight - anchor.bottom - margin;
  const spaceAbove = anchor.top - margin;
  let top = anchor.bottom + 8;
  let flippedVertically = false;

  if (spaceBelow < paletteHeight && spaceAbove > spaceBelow) {
    top = Math.max(margin, anchor.top - Math.min(paletteHeight, spaceAbove) - 8);
    flippedVertically = true;
  } else {
    top = Math.min(top, Math.max(margin, viewportHeight - paletteHeight - margin));
  }

  const maxHeight = Math.max(200, Math.min(paletteHeight, viewportHeight - margin * 2));
  return { layout: 'popover', top: Math.round(top), left: Math.round(left), width: clampedWidth, maxHeight, flippedVertically };
}

