/**
 * StoryMap — Types du moteur de grille et de mise en page (P2)
 */

import { Block } from './project';

export interface GridCell {
  x: number;
  y: number;
  occupiedBy?: string; // Block ID
}

export interface GridDimensions {
  cols: number;
  rows: number;
  cellWidthPx: number;
  cellHeightPx: number;
  marginMm: number;
  gapPx: number;
}

export type PageFormat = 'a4-portrait' | 'a4-landscape' | 'screen-16-9' | 'responsive';

export interface BlockRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridOperationResult {
  success: boolean;
  blocks: Block[];
  error?: string;
}
