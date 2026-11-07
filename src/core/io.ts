/**
 * StoryMap — Import et Export (JSON, HTML autonome et archives ZIP)
 */

import { StoryMap } from '../types/story';
import { generateStandaloneHTML, extractStoryFromHTML } from './publish';
import { convertLegacyToModern, convertModernToLegacyV2 } from './adapter';
import { createZip, readZip } from './zip';

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

export async function exportStoryToSiteZip(story: StoryMap): Promise<void> {
  const slug = getSlug(story);
  const html = generateStandaloneHTML(story);
  const jsonModern = JSON.stringify(story, null, 2);
  const jsonLegacy = JSON.stringify(convertModernToLegacyV2(story), null, 2);
  const readme = [
    `Storymap : ${story.title || 'Sans titre'}`,
    `Exportée avec StoryMap le ${new Date().toLocaleString('fr-FR')}.`,
    '',
    'Contenu de l’archive :',
    '  index.html         — lecteur autonome de la storymap (ouvrable dans tout navigateur moderne)',
    '  storymap.json      — données au format moderne réimportable',
    '  v2.storymap.json   — données au format d’échange historique v2',
    '',
    'Publication :',
    '  Vous pouvez déposer ces fichiers sur n’importe quel hébergement statique (GitHub Pages, Netlify, etc.).',
    '',
    'Licence :',
    '  Code du lecteur sous licence MIT. Les contenus restent la propriété de leurs auteurs.'
  ].join('\r\n');

  const zipBlob = await createZip([
    { name: `${slug}/index.html`, data: html },
    { name: `${slug}/storymap.json`, data: jsonModern },
    { name: `${slug}/v2.storymap.json`, data: jsonLegacy },
    { name: `${slug}/LISEZMOI.txt`, data: readme },
  ]);

  downloadBlob(zipBlob, `${slug}.zip`);
}

export async function exportAllStoriesBackupZip(stories: StoryMap[]): Promise<void> {
  const entries = stories.map((s, idx) => {
    const slug = getSlug(s) || `story-${idx + 1}`;
    return {
      name: `storymaps/${slug}.json`,
      data: JSON.stringify(s, null, 2),
    };
  });

  const manifest = {
    generator: 'StoryMap 2.0.0',
    exportedAt: new Date().toISOString(),
    count: stories.length,
    stories: stories.map(s => ({ id: s.id, title: s.title, modified: s.modified })),
  };

  entries.push({
    name: 'sauvegarde-manifest.json',
    data: JSON.stringify(manifest, null, 2),
  });

  const zipBlob = await createZip(entries);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(zipBlob, `storymap-sauvegarde-${stamp}.zip`);
}

export async function parseStoryFile(file: File): Promise<StoryMap[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.zip') || file.type.includes('zip')) {
    return parseZipArchive(file);
  }
  const text = await file.text();
  if (name.endsWith('.html') || name.endsWith('.htm') || /^\s*<(!doctype|html)/i.test(text)) {
    return [parseStoryHTML(text)];
  }
  return [parseStoryJSON(text)];
}

export function parseStoryJSON(jsonString: string): StoryMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Le fichier n’est pas un document JSON valide.');
  }
  return convertLegacyToModern(parsed);
}

export function parseStoryHTML(htmlString: string): StoryMap {
  return extractStoryFromHTML(htmlString);
}

async function parseZipArchive(file: Blob): Promise<StoryMap[]> {
  const entries = await readZip(file);
  const stories: StoryMap[] = [];

  for (const e of entries.filter(x => x.name.endsWith('.json') && !x.name.includes('manifest'))) {
    try {
      const text = await e.text();
      stories.push(parseStoryJSON(text));
    } catch { /* ignorer fichiers annexes non storymap */ }
  }

  if (stories.length > 0) return stories;

  for (const e of entries.filter(x => x.name.endsWith('.html') || x.name.endsWith('.htm'))) {
    try {
      const text = await e.text();
      const story = parseStoryHTML(text);
      stories.push(story);
    } catch { /* ignorer pages sans storymap */ }
  }

  if (stories.length === 0) {
    throw new Error('Aucune storymap valide n’a été trouvée dans cette archive ZIP.');
  }

  return stories;
}

function getSlug(story: StoryMap): string {
  return story.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'storymap';
}

function getFilename(story: StoryMap, ext: string): string {
  return `${getSlug(story)}.${ext}`;
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
