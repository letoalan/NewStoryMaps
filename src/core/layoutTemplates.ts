/**
 * StoryMap — Modèles de structure et préréglages de mise en page (N2.15 / N2.16)
 *
 * Distingue la structure spatiale du thème visuel :
 * - Mode 1 : préréglages de volet narratif ('left' | 'right' | 'center')
 * - Modes 2 et 3 : modèles de structure de page avec prévisualisation sans perte de bloc.
 */

import type { Page, Block } from '../types/project';
import type { PageFormat } from '../types/grid';
import { getGridDimensions, refitBlocksDetailed } from './grid';

export interface StoryPanelPreset {
  id: 'left' | 'right' | 'center';
  label: string;
  description: string;
}

export const MODE1_PANEL_PRESETS: StoryPanelPreset[] = [
  { id: 'left', label: 'Volet à gauche', description: 'Panneau narratif ancré sur le bord gauche de la carte.' },
  { id: 'right', label: 'Volet à droite', description: 'Panneau narratif ancré sur le bord droit de la carte.' },
  { id: 'center', label: 'Carte centrée basse', description: 'Bandeau narratif centré pour laisser respirer la carte.' },
];

export interface StructuralTemplateSlot {
  preferredTypes: string[];
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PageStructuralTemplate {
  id: string;
  label: string;
  description: string;
  slots: StructuralTemplateSlot[];
}

export const PAGE_STRUCTURAL_TEMPLATES: PageStructuralTemplate[] = [
  {
    id: 'editorial-duo',
    label: 'Duo Éditorial & Carte',
    description: 'Bandeau de titre en haut, colonne narrative à gauche et grande carte à droite.',
    slots: [
      { preferredTypes: ['title'], x: 0, y: 0, w: 6, h: 1 },
      { preferredTypes: ['text', 'callout'], x: 0, y: 1, w: 2, h: 5 },
      { preferredTypes: ['map', 'image'], x: 2, y: 1, w: 4, h: 5 },
      { preferredTypes: ['legend', 'source'], x: 0, y: 6, w: 6, h: 1 },
    ],
  },
  {
    id: 'atlas-dominant',
    label: 'Atlas Pleine Largeur',
    description: 'Grande carte panoramique en tête suivie de deux blocs analytiques côte à côte.',
    slots: [
      { preferredTypes: ['title'], x: 0, y: 0, w: 6, h: 1 },
      { preferredTypes: ['map', 'image', 'gallery'], x: 0, y: 1, w: 6, h: 4 },
      { preferredTypes: ['text', 'callout', 'table'], x: 0, y: 5, w: 3, h: 2 },
      { preferredTypes: ['legend', 'source', 'text'], x: 3, y: 5, w: 3, h: 2 },
    ],
  },
  {
    id: 'synthesis-grid',
    label: 'Grille de Synthèse',
    description: 'Disposition équilibrée en quatre quadrants sous un titre commun.',
    slots: [
      { preferredTypes: ['title'], x: 0, y: 0, w: 6, h: 1 },
      { preferredTypes: ['text', 'callout'], x: 0, y: 1, w: 3, h: 3 },
      { preferredTypes: ['map', 'image'], x: 3, y: 1, w: 3, h: 3 },
      { preferredTypes: ['table', 'gallery'], x: 0, y: 4, w: 3, h: 3 },
      { preferredTypes: ['legend', 'source', 'callout'], x: 3, y: 4, w: 3, h: 3 },
    ],
  },
];

export interface StructuralTemplatePreviewResult {
  templateId: string;
  previewPage: Page;
  overflowBlocks: Block[];
  displacedCount: number;
  preservedCount: number;
}

/**
 * Calcule un aperçu pur de l'application d'un modèle de structure sur une page existante (N2.16).
 * Ne supprime jamais aucun bloc : les blocs excédentaires sont replacés à la suite ou signalés en `overflowBlocks`.
 */
export function previewStructuralTemplate(
  page: Page,
  templateId: string,
  overrideFormat?: PageFormat
): StructuralTemplatePreviewResult {
  const tpl = PAGE_STRUCTURAL_TEMPLATES.find((t) => t.id === templateId) || PAGE_STRUCTURAL_TEMPLATES[0];
  const fmt: PageFormat = overrideFormat || page.layout.format || 'a4-portrait';
  const dims = getGridDimensions(fmt);
  const sourceBlocks: Block[] = (page.blocks || []).map((b) => ({ ...b, data: { ...b.data } }));

  const assignedIds = new Set<string>();
  const targetCandidates: Block[] = [];
  let displacedCount = 0;

  for (const slot of tpl.slots) {
    const match =
      sourceBlocks.find((b) => !assignedIds.has(b.id) && slot.preferredTypes.includes(b.type)) ||
      sourceBlocks.find((b) => !assignedIds.has(b.id));
    if (!match) continue;
    assignedIds.add(match.id);
    const clampedW = Math.min(slot.w, dims.cols);
    const clampedH = Math.min(slot.h, dims.rows);
    const clampedX = Math.min(slot.x, Math.max(0, dims.cols - clampedW));
    const clampedY = Math.min(slot.y, Math.max(0, dims.rows - clampedH));
    if (match.x !== clampedX || match.y !== clampedY || match.w !== clampedW || match.h !== clampedH) {
      displacedCount++;
    }
    targetCandidates.push({
      ...match,
      x: clampedX,
      y: clampedY,
      w: clampedW,
      h: clampedH,
    });
  }

  for (const leftover of sourceBlocks) {
    if (!assignedIds.has(leftover.id)) {
      displacedCount++;
      targetCandidates.push({ ...leftover });
    }
  }

  const refitted = refitBlocksDetailed(targetCandidates, dims.cols, dims.rows);

  return {
    templateId: tpl.id,
    previewPage: {
      ...page,
      layout: { ...page.layout, format: fmt, gridColumns: dims.cols, gridRows: dims.rows },
      blocks: refitted.placed,
    },
    overflowBlocks: refitted.unplaced,
    displacedCount,
    preservedCount: refitted.placed.length + refitted.unplaced.length,
  };
}
