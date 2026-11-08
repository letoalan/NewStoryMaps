/**
 * StoryMap — Types du contexte StoryContext
 */

import type { StoryMap } from './story';
import type { Step } from './step';
import type { ProjectBrand, ProjectMode } from './project';
import type { PageFormat } from './grid';

import type { SharedThemeTokens, HeroConfig, RouteAnimationConfig } from './theme';

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

export interface CreateStoryOptions {
  title?: string;
  mode?: ProjectMode;
  format?: PageFormat;
  brand?: ProjectBrand;
  themeTokens?: Partial<SharedThemeTokens>;
  hero?: HeroConfig;
  routeAnimation?: RouteAnimationConfig;
  templateId?: string;
}

export interface StoryContextType {
  story: StoryMap | null;
  activeStepIndex: number;
  saveStatus: SaveStatus;
  lastSaveError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  setStory: (story: StoryMap) => void;
  setActiveStepIndex: (index: number) => void;
  updateStory: (fields: Partial<StoryMap>) => void;
  updateStoryTitle: (title: string) => void;
  updateStep: (index: number, step: Partial<Step>) => void;
  addStep: () => void;
  deleteStep: (index: number) => void;
  reorderSteps: (startIndex: number, endIndex: number) => void;
  flushSave: () => Promise<void>;
  loadStory: (id: string) => Promise<void>;
  newStory: (options?: string | CreateStoryOptions) => Promise<void>;
}

