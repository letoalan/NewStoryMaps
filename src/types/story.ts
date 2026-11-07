/**
 * StoryMap — Types pour le modèle principal de StoryMap
 */

import { Step } from './step';

export type UITheme = 'light' | 'dark' | 'auto';
export type StoryFont = 'Inter' | 'Lora' | 'Merriweather' | 'Roboto' | 'Cinzel';

export interface StoryAppearance {
  theme: UITheme;
  font: StoryFont;
  accentColor: string;
  panelPosition: 'left' | 'right' | 'center';
  showProgress: boolean;
  autoplayInterval?: number;
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'geojson' | 'vector' | 'raster';
  url?: string;
  data?: unknown;
  visible: boolean;
  opacity?: number;
  color?: string;
}

export interface StoryMap {
  id: string;
  version: string;
  title: string;
  subtitle?: string;
  author?: string;
  description?: string;
  coverImage?: string;
  created: number;
  modified: number;
  appearance: StoryAppearance;
  mapStyle: string;
  layers: MapLayer[];
  steps: Step[];
}

export interface StoryListItem {
  id: string;
  title: string;
  subtitle?: string;
  modified: number;
  stepCount: number;
  coverImage?: string;
}

