/**
 * StoryMap — Types pour les étapes et chapitres d'un récit
 */

export interface Coordinates {
  lng: number;
  lat: number;
}

export interface CameraView {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export type MediaType = 'image' | 'video' | 'audio';

export interface StepMedia {
  type: MediaType;
  url: string;
  caption?: string;
  credit?: string;
  alt?: string;
}

export interface MarkerStyle {
  color?: string;
  symbol?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface StepMarker {
  coordinates: [number, number];
  title?: string;
  style?: MarkerStyle;
}

import type { RouteAnimationConfig } from './theme';

export interface Step {
  id: string;
  title: string;
  description: string;
  media?: StepMedia;
  camera: CameraView;
  markers?: StepMarker[];
  activeLayers?: string[];
  hidden?: boolean;
  routeAnimation?: RouteAnimationConfig;
}

export type StoryStep = Step;

