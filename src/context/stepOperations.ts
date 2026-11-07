/**
 * StoryMap — Opérations sur les étapes d'un récit (Add, Delete, Update, Reorder)
 */

import { StoryMap } from '../types/story';
import { Step } from '../types/step';

export function performAddStep(story: StoryMap): { updatedStory: StoryMap; newIndex: number } {
  const last = story.steps[story.steps.length - 1];
  const newStep: Step = {
    id: 'step-' + Date.now(),
    title: 'Nouvelle étape',
    description: '<p>Description de l’étape...</p>',
    camera: last ? { ...last.camera } : { center: [2.3522, 48.8566], zoom: 4, pitch: 0, bearing: 0 },
    markers: [{ coordinates: last ? [...last.camera.center] : [2.3522, 48.8566], style: { color: story.appearance.accentColor || '#0b7fb0' } }],
  };
  const steps = [...story.steps, newStep];
  return { updatedStory: { ...story, steps, modified: Date.now() }, newIndex: steps.length - 1 };
}

export function performDeleteStep(story: StoryMap, index: number, currentIndex: number): { updatedStory: StoryMap; newIndex: number } {
  if (story.steps.length <= 1) return { updatedStory: story, newIndex: currentIndex };
  const steps = story.steps.filter((_, i) => i !== index);
  const newIndex = currentIndex >= steps.length ? Math.max(0, steps.length - 1) : currentIndex;
  return { updatedStory: { ...story, steps, modified: Date.now() }, newIndex };
}

export function performUpdateStep(story: StoryMap, index: number, patch: Partial<Step>): StoryMap {
  if (!story.steps[index]) return story;
  const steps = [...story.steps];
  steps[index] = { ...steps[index], ...patch };
  return { ...story, steps, modified: Date.now() };
}

export function performReorderSteps(story: StoryMap, startIndex: number, endIndex: number): StoryMap {
  const steps = [...story.steps];
  const [removed] = steps.splice(startIndex, 1);
  steps.splice(endIndex, 0, removed);
  return { ...story, steps, modified: Date.now() };
}

