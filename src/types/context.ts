/**
 * StoryMap — Types du contexte StoryContext
 */

import { StoryMap } from './story';
import { Step } from './step';
import { ProjectBrand, ProjectMode } from './project';

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

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
  newStory: (options?: string | { title?: string; mode?: ProjectMode; brand?: ProjectBrand }) => Promise<void>;
}

