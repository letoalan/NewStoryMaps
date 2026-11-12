/**
 * StoryMap — Types pour la Charte Graphique structurée (JSON)
 */

export interface GraphicCharterProject {
  name?: string;
  audience?: string;
  values?: string;
  description?: string;
}

export interface GraphicCharterLogoVariants {
  primary?: string | null;
  light?: string | null;
  dark?: string | null;
}

export interface GraphicCharterLogo {
  variants?: GraphicCharterLogoVariants;
  clearSpace?: string;
  backgroundRules?: string;
}

export interface GraphicCharterColors {
  primary: string;
  secondary: string;
  text?: string;
  background?: string;
  surface?: string;
  accent?: string;
}

export interface GraphicCharterFontSpec {
  family: string;
  weight?: number;
  sizePx?: number;
}

export interface GraphicCharterTypography {
  heading?: GraphicCharterFontSpec;
  body?: GraphicCharterFontSpec;
}

export interface GraphicCharterImagery {
  guidelines?: string;
}

export interface GraphicCharterRules {
  prohibited?: string;
}

export interface GraphicCharterLayout {
  spacingPx?: number;
  radiusPx?: number;
}

export interface GraphicCharterExample {
  title?: string;
  description?: string;
  buttonLabel?: string;
}

export type CharterContextType = 'light' | 'dark' | 'colored';

export interface GraphicCharterVariants {
  light?: GraphicCharterDoc;
  dark?: GraphicCharterDoc;
  colored?: GraphicCharterDoc;
}

export interface GraphicCharterCriteria {
  theme?: 'light' | 'dark' | 'auto';
  outputProfile?: string;
  mapStyle?: string;
  pageBackground?: string;
  containerBackground?: string;
  isSurfaceColored?: boolean;
}

export interface GraphicCharterDoc {
  schemaVersion: string;
  kind: 'graphic-charter';
  context?: CharterContextType;
  project?: GraphicCharterProject;
  logo?: GraphicCharterLogo;
  colors: GraphicCharterColors;
  typography?: GraphicCharterTypography;
  imagery?: GraphicCharterImagery;
  rules?: GraphicCharterRules;
  layout?: GraphicCharterLayout;
  example?: GraphicCharterExample;
  variants?: GraphicCharterVariants;
}

