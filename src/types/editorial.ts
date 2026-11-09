/**
 * StoryMap — Contrats d'atelier PAO, typographie éditoriale, recadrage et gabarits (Mode 3)
 */

export type TypographyStyleRole =
  | 'cover-title'
  | 'section-title'
  | 'lead'
  | 'heading'
  | 'body'
  | 'caption'
  | 'credit'
  | 'callout'
  | 'cta';

export interface ImageCropTransform {
  x: number;
  y: number;
  zoom: number;
  fit: 'cover' | 'contain';
  focalPoint?: [number, number];
  naturalWidth?: number;
  naturalHeight?: number;
  brightness?: number; // Défaut: 1 (100%)
  contrast?: number;   // Défaut: 1 (100%)
}

export type MapEditorialPreset =
  | 'location'
  | 'main'
  | 'detail'
  | 'access'
  | 'circuit'
  | 'comparison';

export interface EditorialGabarit {
  id: string;
  name: string;
  category: 'couverture' | 'magazine' | 'fiche' | 'circuit' | 'promotion' | 'personnel';
  description: string;
  format: 'a4-portrait' | 'a4-landscape';
  blocks: Array<{
    type: string;
    role?: TypographyStyleRole;
    x: number;
    y: number;
    w: number;
    h: number;
    defaultData?: Record<string, unknown>;
  }>;
}

export interface PublicationIssue {
  id: string;
  level: 'error' | 'warning' | 'notice';
  pageIndex: number;
  blockId?: string;
  message: string;
  evidence: 'measured' | 'heuristic' | 'unverified';
  remediation?: string;
}

