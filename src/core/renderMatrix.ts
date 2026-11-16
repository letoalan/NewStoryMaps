/**
 * StoryMap — Matrice de capacités de rendu, contrats de profils et versionnage du schéma (N0.04 -> N0.07)
 */

import type { BlockType, ProjectMode } from '../types/project';
import type { OutputProfile } from '../types/theme';
import type { StoryMap } from '../types/story';

export const CURRENT_SCHEMA_VERSION = 2;
export const MAX_SUPPORTED_SCHEMA_VERSION = 2;

export type CanonicalProfile = 'editor' | 'web' | 'presentation' | 'print';

export interface BlockCapabilityEntry {
  type: BlockType;
  category: 'Texte' | 'Médias' | 'Carte' | 'Documentation';
  allowedModes: ProjectMode[];
  profiles: Record<CanonicalProfile, 'interactive' | 'static' | 'converted'>;
  staticFallback: string;
}

export const BLOCK_RENDER_MATRIX: Record<BlockType, BlockCapabilityEntry> = {
  title: {
    type: 'title', category: 'Texte', allowedModes: ['rich-document', 'brochure'],
    profiles: { editor: 'interactive', web: 'static', presentation: 'static', print: 'static' },
    staticFallback: 'Titre hiérarchique H1–H6 conservé',
  },
  text: {
    type: 'text', category: 'Texte', allowedModes: ['rich-document', 'brochure'],
    profiles: { editor: 'interactive', web: 'static', presentation: 'static', print: 'static' },
    staticFallback: 'Corps de texte riche et renvois numérotés conservés',
  },
  callout: {
    type: 'callout', category: 'Texte', allowedModes: ['rich-document', 'brochure'],
    profiles: { editor: 'interactive', web: 'static', presentation: 'static', print: 'static' },
    staticFallback: 'Encadré mis en valeur avec bordure d’accentuation',
  },
  image: {
    type: 'image', category: 'Médias', allowedModes: ['rich-document', 'brochure'],
    profiles: { editor: 'interactive', web: 'static', presentation: 'static', print: 'static' },
    staticFallback: 'Figure photographique avec légende et crédit',
  },
  gallery: {
    type: 'gallery', category: 'Médias', allowedModes: ['rich-document'],
    profiles: { editor: 'interactive', web: 'interactive', presentation: 'interactive', print: 'converted' },
    staticFallback: 'Convertie automatiquement en planche contact multi-vues en Brochure / Impression A4',
  },
  map: {
    type: 'map', category: 'Carte', allowedModes: ['rich-document', 'brochure'],
    profiles: { editor: 'interactive', web: 'interactive', presentation: 'interactive', print: 'static' },
    staticFallback: 'Carte figée au cadrage enregistré avec marqueurs numérotés et crédits',
  },
  table: {
    type: 'table', category: 'Documentation', allowedModes: ['rich-document', 'brochure'],
    profiles: { editor: 'interactive', web: 'static', presentation: 'static', print: 'static' },
    staticFallback: 'Tableau de données tabulaires bordé',
  },
  legend: {
    type: 'legend', category: 'Documentation', allowedModes: ['rich-document', 'brochure'],
    profiles: { editor: 'interactive', web: 'static', presentation: 'static', print: 'static' },
    staticFallback: 'Bloc de nomenclature et légende cartographique',
  },
  source: {
    type: 'source', category: 'Documentation', allowedModes: ['rich-document', 'brochure'],
    profiles: { editor: 'interactive', web: 'static', presentation: 'static', print: 'static' },
    staticFallback: 'Bloc de crédits, licences et sources obligatoires',
  },
  button: {
    type: 'button', category: 'Texte', allowedModes: ['rich-document'],
    profiles: { editor: 'interactive', web: 'interactive', presentation: 'interactive', print: 'converted' },
    staticFallback: 'Exclu en mode Brochure et StoryMap (réservé au mode page web)',
  },
  form: {
    type: 'form', category: 'Documentation', allowedModes: ['rich-document'],
    profiles: { editor: 'interactive', web: 'interactive', presentation: 'interactive', print: 'converted' },
    staticFallback: 'Exclu en mode Brochure et StoryMap (réservé au mode page web)',
  },
};

export interface ProfileContract {
  profile: OutputProfile;
  reimportableAsProject: boolean;
  includesEditorChrome: boolean;
  allowsDynamicMedia: boolean;
  allowsAnimatedVehicles: boolean;
  networkNote: string;
}

export const OUTPUT_PROFILE_CONTRACTS: Record<CanonicalProfile, ProfileContract> = {
  editor: {
    profile: 'editor', reimportableAsProject: true, includesEditorChrome: true,
    allowsDynamicMedia: true, allowsAnimatedVehicles: true,
    networkNote: 'Édition locale assistée par IndexedDB ; tuiles cartographiques distantes.',
  },
  web: {
    profile: 'web', reimportableAsProject: true, includesEditorChrome: false,
    allowsDynamicMedia: true, allowsAnimatedVehicles: true,
    networkNote: 'Export autonome sans serveur backend ; requiert réseau pour CDN MapLibre et tuiles si non mises en cache.',
  },
  presentation: {
    profile: 'presentation', reimportableAsProject: true, includesEditorChrome: false,
    allowsDynamicMedia: true, allowsAnimatedVehicles: true,
    networkNote: 'Profil de lecture plein écran (diapositive, vertical, horizontal) sans perte de données.',
  },
  print: {
    profile: 'print', reimportableAsProject: false, includesEditorChrome: false,
    allowsDynamicMedia: false, allowsAnimatedVehicles: false,
    networkNote: 'Sortie A4 de diffusion PDF ; exclut tout contour technique, exige un poster pour toute vidéo et fige les véhicules.',
  },
};

export function validateProjectSchemaVersion(raw: unknown): { valid: boolean; schemaVersion: number; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, schemaVersion: 0, error: 'Document invalide : objet attendu.' };
  }
  const obj = raw as Record<string, unknown>;
  const sv = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1;
  if (sv > MAX_SUPPORTED_SCHEMA_VERSION || sv < 1) {
    return {
      valid: false,
      schemaVersion: sv,
      error: `Version de schéma non compatible (reçue : v${sv}, max supportée : v${MAX_SUPPORTED_SCHEMA_VERSION}).`,
    };
  }
  return { valid: true, schemaVersion: sv };
}

/** Migre un document sans altérer son rendu par défaut et sans effacer les champs inconnus (N0.06) */
export function migrateStorySchemaPreservingUnknown(story: StoryMap): StoryMap {
  const check = validateProjectSchemaVersion(story);
  if (!check.valid) throw new Error(check.error);

  return {
    ...story,
    schemaVersion: story.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    pages: story.pages
      ? story.pages.map((p) => ({
          ...p,
          blocks: (p.blocks || []).map((b) => ({ ...b, data: { ...b.data } })),
        }))
      : story.pages,
  };
}
