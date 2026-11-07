/**
 * StoryMap — Import et Export (JSON & HTML)
 */

import { StoryMap } from '../types/story';
import { generateStandaloneHTML } from './publish';
import { convertLegacyToModern, convertModernToLegacyV2 } from './adapter';

export function exportStoryToJSON(story: StoryMap): void {
  const blob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, getFilename(story, 'storymap.json'));
}

export function exportStoryToLegacyV2JSON(story: StoryMap): void {
  const legacy = convertModernToLegacyV2(story);
  const blob = new Blob([JSON.stringify(legacy, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, getFilename(story, 'v2.storymap.json'));
}

export function exportStoryToStandaloneHTML(story: StoryMap): void {
  const html = generateStandaloneHTML(story);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, getFilename(story, 'html'));
}

function getFilename(story: StoryMap, ext: string): string {
  const slug =
    story.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'storymap';
  return `${slug}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseStoryJSON(jsonString: string): StoryMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Le fichier n’est pas un document JSON valide.');
  }

  try {
    return convertLegacyToModern(parsed);
  } catch (err) {
    throw new Error('Impossible de convertir ce document en StoryMap : ' + (err as Error).message);
  }
}
