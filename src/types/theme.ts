/**
 * StoryMap — Types du modèle de thème partagé, Hero, exceptions visuelles et véhicules (N0 / N2 / N3 / N4)
 */

export type OutputProfile = 'editor' | 'web' | 'web-interactive' | 'presentation' | 'slide' | 'print';

export type VehicleType =
  | 'none'
  | 'airplane'
  | 'ship'
  | 'car'
  | 'bus'
  | 'train'
  | 'bike'
  | 'walker';

export interface RouteAnimationConfig {
  enabled?: boolean;
  vehicle: VehicleType;
  durationSec?: number;
  durationMs?: number;
  loop?: boolean;
  orientToRoute?: boolean;
  progressiveTrail?: boolean;
  cameraFollow?: boolean;
  followCamera?: boolean;
  progressiveReveal?: boolean;
  sizePx?: number;
  staticPosition?: 'start' | 'middle' | 'end';
}

export interface HeroConfig {
  enabled: boolean;
  mediaType: 'none' | 'photo' | 'video';
  mediaUrl?: string;
  posterUrl?: string;
  logoUrl?: string;
  credit?: string;
  license?: string;
  alt?: string;
  fit?: 'cover' | 'contain';
  focalPoint?: [number, number] | { x: number; y: number };
  align?: 'left' | 'center' | 'right';
  contentAlign?: 'left' | 'center' | 'right';
  heightPx?: number;
  heightPreset?: 'compact' | 'medium' | 'tall' | 'fullscreen';
  veilType?: 'none' | 'solid' | 'gradient';
  veilStyle?: 'none' | 'solid' | 'gradient';
  veilColor?: string;
  veilOpacity?: number;
  backgroundColor?: string;
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export type BlockStyleMode = 'inherit' | 'custom' | 'frameless';

export interface BlockVisualOverride {
  styleMode?: BlockStyleMode;
  backgroundColor?: string;
  backgroundOpacity?: number;
  textColor?: string;
  accentColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed';
  borderColor?: string;
  borderWidth?: number;
  borderWidthPx?: number;
  borderRadius?: number;
  radiusPx?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  shadowPreset?: 'none' | 'sm' | 'md' | 'lg';
  padding?: number;
  paddingPx?: number;
  fontTitle?: string;
  fontBody?: string;
}

export interface PageVisualOverride {
  pageBackground?: string;
  backgroundColor?: string;
  surfaceBackground?: string;
  textColor?: string;
  accentColor?: string;
  paddingMm?: number;
  paddingPx?: number;
}

export interface SharedThemeTokens {
  schemaVersion?: number;
  logo?: string;
  logoCredit?: string;
  headingFont: string;
  bodyFont: string;
  fontTitle?: string;
  fontBody?: string;
  fontCaption?: string;
  titleSizePx?: number;
  bodySizePx?: number;
  captionSizePx?: number;
  lineHeight?: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pageBackground: string;
  surfaceBackground: string;
  surfaceOpacity: number;
  textColor: string;
  mutedTextColor: string;
  borderStyle: 'none' | 'solid' | 'dashed';
  borderColor: string;
  borderWidthPx: number;
  borderWidth?: number;
  radiusPx: number;
  borderRadius?: number;
  shadowPreset: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  density: 'compact' | 'comfortable' | 'spacious';
  padding?: number;
  mapRouteColor?: string;
  mapFeatureColor?: string;
  mapHighlightColor?: string;
  defaultVehicle?: VehicleType;
}

export interface ResolvedVisualStyle {
  outputProfile?: OutputProfile;
  styleMode?: BlockStyleMode;
  headingFont: string;
  bodyFont: string;
  fontTitle?: string;
  fontBody?: string;
  fontCaption?: string;
  titleSizePx?: number;
  bodySizePx?: number;
  captionSizePx?: number;
  lineHeight?: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pageBackground: string;
  surfaceBackground: string;
  surfaceOpacity: number;
  surfaceCssBackground: string;
  textColor: string;
  mutedTextColor: string;
  borderCss: string;
  radiusCss: string;
  borderRadiusPx?: number;
  shadowCss: string;
  paddingCss: string;
  paddingPx?: number;
  showEditorGuide: boolean;
  mapRouteColor?: string;
  mapFeatureColor?: string;
  mapHighlightColor?: string;
  defaultVehicle?: VehicleType;
  logo?: string;
}
