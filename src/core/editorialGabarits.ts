/**
 * StoryMap — Gabarits professionnels neutres et application non destructive (Mode 3 / M6)
 */

import type { Page, Block } from '../types/project';
import type { EditorialGabarit } from '../types/editorial';

export const EDITORIAL_GABARITS: EditorialGabarit[] = [
  {
    id: 'gab-couverture-prestige',
    name: 'Couverture Éditoriale',
    category: 'couverture',
    description: 'Pleine page avec grand titre, sous-titre chapô, média dominant et cartouche de crédit.',
    format: 'a4-portrait',
    blocks: [
      { type: 'title', role: 'cover-title', x: 0, y: 0, w: 8, h: 2, defaultData: { title: 'Titre Principal du Dossier' } },
      { type: 'image', role: 'lead', x: 0, y: 2, w: 8, h: 6, defaultData: { url: '', caption: 'Photographie de couverture' } },
      { type: 'text', role: 'lead', x: 0, y: 8, w: 8, h: 3, defaultData: { text: 'Introduction générale et amorce du récit.' } },
      { type: 'source', role: 'credit', x: 0, y: 11, w: 8, h: 1, defaultData: { source: 'Édition spéciale · Documentation' } },
    ],
  },
  {
    id: 'gab-double-page-magazine',
    name: 'Double Page Magazine',
    category: 'magazine',
    description: 'Format paysage avec colonne narrative, carte centrale et encadrés d’analyse.',
    format: 'a4-landscape',
    blocks: [
      { type: 'title', role: 'section-title', x: 0, y: 0, w: 12, h: 1, defaultData: { title: 'Grand Format : Regards Croisés' } },
      { type: 'text', role: 'body', x: 0, y: 1, w: 4, h: 6, defaultData: { text: 'Développement de l’article et contexte territorial.' } },
      { type: 'map', x: 4, y: 1, w: 5, h: 6, defaultData: { mapId: '', title: 'Carte d’ensemble' } },
      { type: 'callout', role: 'callout', x: 9, y: 1, w: 3, h: 3, defaultData: { title: 'Chiffre Clé', content: 'Données synthétiques' } },
      { type: 'image', role: 'caption', x: 9, y: 4, w: 3, h: 3, defaultData: { url: '', caption: 'Détail d’observation' } },
      { type: 'source', role: 'credit', x: 0, y: 7, w: 12, h: 1, defaultData: { source: 'Sources & Références' } },
    ],
  },
  {
    id: 'gab-fiche-scientifique',
    name: 'Fiche Informative & Scientifique',
    category: 'fiche',
    description: 'Mise en page rigoureuse avec tableau de données, carte d’accès et synthèse.',
    format: 'a4-portrait',
    blocks: [
      { type: 'title', role: 'section-title', x: 0, y: 0, w: 8, h: 1, defaultData: { title: 'Fiche Synthèse : Données & Mesures' } },
      { type: 'map', x: 0, y: 1, w: 4, h: 4, defaultData: { mapId: '', title: 'Zone d’étude' } },
      { type: 'table', x: 4, y: 1, w: 4, h: 4, defaultData: { headers: ['Indicateur', 'Valeur'], rows: [['Surface', '124 km²'], ['Statut', 'Protégé']] } },
      { type: 'text', role: 'body', x: 0, y: 5, w: 8, h: 4, defaultData: { text: 'Analyse méthodique et interprétation des résultats.' } },
      { type: 'source', role: 'credit', x: 0, y: 9, w: 8, h: 1, defaultData: { source: 'Relevés scientifiques et observations' } },
    ],
  },
  {
    id: 'gab-circuit-editorial',
    name: 'Parcours & Itinéraire Cartographique',
    category: 'circuit',
    description: 'Grande carte de situation avec étapes numérotées et fiches descriptives.',
    format: 'a4-landscape',
    blocks: [
      { type: 'title', role: 'section-title', x: 0, y: 0, w: 12, h: 1, defaultData: { title: 'Itinéraire & Points Remarquables' } },
      { type: 'map', x: 0, y: 1, w: 8, h: 6, defaultData: { mapId: '', title: 'Tracé du parcours' } },
      { type: 'text', role: 'body', x: 8, y: 1, w: 4, h: 3, defaultData: { text: '1. Départ du circuit et consignes.' } },
      { type: 'text', role: 'body', x: 8, y: 4, w: 4, h: 3, defaultData: { text: '2. Halte panoramique et patrimoine.' } },
      { type: 'legend', x: 0, y: 7, w: 12, h: 1, defaultData: { title: 'Légende du circuit' } },
    ],
  },
];

export interface ApplyGabaritResult {
  page: Page;
  matchedBlocksCount: number;
  unassignedBlocks: Block[];
}

export function applyEditorialGabarit(page: Page, gabarit: EditorialGabarit): ApplyGabaritResult {
  const existing = [...page.blocks];
  const newBlocks: Block[] = [];
  const usedIds = new Set<string>();

  for (const template of gabarit.blocks) {
    const matchIdx = existing.findIndex(
      (b) => !usedIds.has(b.id) && b.type === template.type
    );
    if (matchIdx >= 0) {
      const match = existing[matchIdx];
      usedIds.add(match.id);
      newBlocks.push({
        ...match,
        x: template.x,
        y: template.y,
        w: template.w,
        h: template.h,
        typographyRole: template.role || match.typographyRole,
      });
    } else {
      const freshId = `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      newBlocks.push({
        id: freshId,
        type: template.type as any,
        x: template.x,
        y: template.y,
        w: template.w,
        h: template.h,
        data: template.defaultData || {},
        typographyRole: template.role,
      });
    }
  }

  const unassigned = existing.filter((b) => !usedIds.has(b.id));

  return {
    page: {
      ...page,
      layout: {
        ...page.layout,
        format: gabarit.format,
      },
      blocks: newBlocks,
    },
    matchedBlocksCount: usedIds.size,
    unassignedBlocks: unassigned,
  };
}

