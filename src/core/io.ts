/**
 * StoryMap — Import et Export (JSON & HTML)
 */

import { StoryMap } from '../types/story';
import { generateStandaloneHTML } from './publish';

export function exportStoryToJSON(story: StoryMap): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(story, null, 2));
  downloadFile(dataStr, getFilename(story, 'storymap.json'));
}

export function exportStoryToStandaloneHTML(story: StoryMap): void {
  const html = generateStandaloneHTML(story);
  const dataStr = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  downloadFile(dataStr, getFilename(story, 'html'));
}

function getFilename(story: StoryMap, ext: string): string {
  const slug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'storymap';
  return `${slug}.${ext}`;
}

function downloadFile(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.setAttribute('href', dataUrl);
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function parseStoryJSON(jsonString: string): StoryMap {
  const parsed = JSON.parse(jsonString);
  if (!parsed.id || !parsed.title || !Array.isArray(parsed.steps)) {
    throw new Error('Format de fichier StoryMap invalide');
  }
  return parsed as StoryMap;
}
