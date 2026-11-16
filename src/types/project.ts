/**
 * StoryMap — Types d'architecture unifiée des trois modes
 * Mode 1 (StoryMap classique), Mode 2 (Document enrichi), Mode 3 (Brochure A4)
 */

import type { StoryMap } from './story';
import type { BlockVisualOverride, PageVisualOverride, HeroConfig, RouteAnimationConfig } from './theme';
import type { ImageCropTransform, TypographyStyleRole, MapEditorialPreset } from './editorial';

export type ProjectMode = 'storymap' | 'rich-document' | 'brochure';

export interface ProjectBrand {
  logo?: string;
  primaryFont?: string;
  secondaryFont?: string;
  fontTitle?: string;
  fontBody?: string;
  colors?: [string, string, string]; // [Primaire, Secondaire, Accent]
  primaryColor?: string;
  secondaryColor?: string;
}

export type BlockType =
  | 'title'
  | 'text'
  | 'image'
  | 'map'
  | 'legend'
  | 'source'
  | 'table'
  | 'callout'
  | 'gallery'
  | 'button'
  | 'form';

export type NarrativeBindingAction = 'highlight' | 'zoom' | 'filter' | 'overview';

export interface NarrativeBinding {
  mapId: string;
  targetFeatureId?: string;
  action?: NarrativeBindingAction;
  description?: string;
  numberIndex?: number; // Pour le Mode 3 (renvoi brochure numéroté)
}

export interface MapFeature {
  id: string;
  name: string;
  geometryType: 'Point' | 'LineString' | 'Polygon';
  coordinates: number[] | number[][] | number[][][];
  color?: string;
  description?: string;
  numberIndex?: number;
  routeAnimation?: RouteAnimationConfig;
}

export interface MapSceneLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity?: number;
  color?: string;
  features: MapFeature[];
}

export interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  data: Record<string, unknown>;
  binding?: NarrativeBinding;
  styleOverride?: BlockVisualOverride;
  zIndex?: number;
  groupId?: string;
  locked?: boolean;
  readingOrder?: number;
  imageCrop?: ImageCropTransform;
  typographyRole?: TypographyStyleRole;
  mapPreset?: MapEditorialPreset;
}

export interface PageLayout {
  format: 'a4-portrait' | 'a4-landscape' | 'screen-16-9' | 'responsive';
  gridColumns: number;
  gridRows: number;
  marginMm?: number;
}

export interface Page {
  id: string;
  title: string;
  layout: PageLayout;
  blocks: Block[];
  styleOverride?: PageVisualOverride;
  hero?: HeroConfig;
}

export interface MapView {
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  bounds?: [[number, number], [number, number]];
}

export interface ProjectMap {
  id: string;
  name: string;
  mapStyle: string;
  view: MapView;
  layers?: MapSceneLayer[];
  routeAnimation?: RouteAnimationConfig;
}

export interface ProjectResource {
  id: string;
  name: string;
  mimeType: string;
  url: string;
}

export interface UnifiedProject {
  id: string;
  version: '2.0.0';
  title: string;
  mode: ProjectMode;
  created: number;
  modified: number;
  brand?: ProjectBrand;
  storymapData?: StoryMap;
  pages?: Page[];
  maps?: ProjectMap[];
  resources?: ProjectResource[];
}
