/**
 * StoryMap — Modèles par défaut et génération de données initiales
 */

import type { StoryMap } from '../types/story';
import type { Step } from '../types/step';

export function createNewStep(index: number = 1): Step {
  return {
    id: 'step-' + Math.random().toString(36).substring(2, 9),
    title: `Étape ${index}`,
    description: '<p>Décrivez cette étape de votre récit ici.</p>',
    camera: {
      center: [2.3522, 48.8566], // Paris
      zoom: 12,
      pitch: 30,
      bearing: 0,
    },
    markers: [
      {
        coordinates: [2.3522, 48.8566],
        title: `Lieu de l'étape ${index}`,
        style: { color: '#0b7fb0', size: 'md' },
      },
    ],
  };
}

export function createNewStory(title: string = 'Nouveau récit'): StoryMap {
  const now = Date.now();
  return {
    id: 'story-' + Math.random().toString(36).substring(2, 9),
    version: '2.0.0',
    title,
    subtitle: 'Récit cartographique interactif',
    author: '',
    description: '',
    created: now,
    modified: now,
    appearance: {
      theme: 'auto',
      font: 'Inter',
      accentColor: '#0b7fb0',
      panelPosition: 'left',
      showProgress: true,
      autoplayInterval: 5000,
      routeStyle: 'dashed',
      markerShape: 'pin',
      showAllMarkers: true,
    },
    mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    layers: [],
    steps: [createNewStep(1)],
  };
}

export const createDefaultStep = createNewStep;
export const createDefaultStory = createNewStory;

