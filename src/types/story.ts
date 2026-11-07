/**
 * StoryMap — Types pour le modèle principal de StoryMap
 */

import type { Step } from './step';
import type { ProjectBrand, ProjectMode, Page, ProjectMap } from './project';
import type { PageFormat } from './grid';

export type UITheme = 'light' | 'dark' | 'auto';
export type StoryFont = 'Inter' | 'Lora' | 'Merriweather' | 'Roboto' | 'Cinzel';

export type RouteLineStyle =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'curved'
  | 'arrow'
  | 'double-arrow'
  | 'airplane'
  | 'ship'
  | 'none';

export type MarkerShape =
  | 'pin'
  | 'circle'
  | 'square'
  | 'number'
  | 'airplane'
  | 'ship'
  | 'flag'
  | 'star';

export interface StoryAppearance {
  theme: UITheme;
  font: StoryFont;
  accentColor: string;
  panelPosition: 'left' | 'right' | 'center';
  showProgress: boolean;
  autoplayInterval?: number;
  routeStyle?: RouteLineStyle;
  routeColor?: string;
  markerShape?: MarkerShape;
  showAllMarkers?: boolean;
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
  mode?: ProjectMode;
  brand?: ProjectBrand;
  format?: PageFormat;
  pages?: Page[];
  maps?: ProjectMap[];
  appearance: StoryAppearance;
  mapStyle: string;
  layers: MapLayer[];
  steps: Step[];
}

export interface StoryListItem {
  id: string;
  title: string;
  subtitle?: string;
  mode?: ProjectMode;
  modified: number;
  stepCount: number;
  coverImage?: string;
}
