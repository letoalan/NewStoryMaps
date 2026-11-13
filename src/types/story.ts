/**
 * StoryMap — Types pour le modèle principal de StoryMap
 */

import type { Step } from './step';
import type { ProjectBrand, ProjectMode, Page, ProjectMap } from './project';
import type { PageFormat } from './grid';
import type { SharedThemeTokens, HeroConfig, RouteAnimationConfig } from './theme';
import type { GraphicCharterDoc } from './graphicCharter';

export type UITheme = 'light' | 'dark' | 'auto';
export type StoryFont = 'Inter' | 'Lora' | 'Merriweather' | 'Roboto' | 'Nunito' | 'Cinzel';

export type RouteLineStyle =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'curved'
  | 'arrow'
  | 'double-arrow'
  | 'airplane'
  | 'ship'
  | 'train'
  | 'none';

export type MarkerShape =
  | 'pin'
  | 'circle'
  | 'square'
  | 'number'
  | 'airplane'
  | 'ship'
  | 'train'
  | 'flag'
  | 'star';

export interface StoryAppearance {
  theme: UITheme;
  font: StoryFont;
  headingFont?: string;
  bodyFont?: string;
  accentColor: string;
  panelBackground?: string;
  textColor?: string;
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
  schemaVersion?: number;
  title: string;
  subtitle?: string;
  author?: string;
  description?: string;
  coverImage?: string;
  created: number;
  modified: number;
  mode?: ProjectMode;
  brand?: ProjectBrand;
  themeTokens?: Partial<SharedThemeTokens>;
  hero?: HeroConfig;
  routeAnimation?: RouteAnimationConfig;
  graphicCharter?: GraphicCharterDoc;
  format?: PageFormat;
  pages?: Page[];
  maps?: ProjectMap[];
  appearance: StoryAppearance;
  mapStyle: string;
  layers: MapLayer[];
  steps: Step[];
  [key: string]: unknown; // Préserve les champs inconnus ou futurs lors de l'aller-retour
}

export type Story = StoryMap;

export interface StoryListItem {
  id: string;
  title: string;
  subtitle?: string;
  mode?: ProjectMode;
  modified: number;
  stepCount: number;
  coverImage?: string;
}
