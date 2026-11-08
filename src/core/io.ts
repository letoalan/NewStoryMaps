/**
 * StoryMap — Import et Export (JSON, HTML autonome et archives ZIP)
 */

import type { StoryMap } from '../types/story';
import { generateStandaloneHTML, extractStoryFromHTML } from './publish';
import { generateDocumentHTML } from './publishDocument';
import { generateBrochurePrintHTML } from './publishBrochure';
import { convertLegacyToModern, convertModernToLegacyV2 } from './adapter';
import { createZip, readZip, type ZipReadEntry } from './zip';

export function exportStoryToBrochureHTML(story: StoryMap): void {
  const html = generateBrochurePrintHTML(story);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, getFilename(story, 'brochure.html'));
}

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
  const html = (story.mode === 'rich-document' || story.mode === 'brochure')
    ? generateDocumentHTML(story)
    : generateStandaloneHTML(story);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, getFilename(story, 'html'));
}

export async function exportStoryToSiteZip(story: StoryMap): Promise<void> {
  const slug = getSlug(story);
  const html = (story.mode === 'rich-document' || story.mode === 'brochure')
    ? generateDocumentHTML(story)
    : generateStandaloneHTML(story);
  const jsonModern = JSON.stringify(story, null, 2);
  const jsonLegacy = JSON.stringify(convertModernToLegacyV2(story), null, 2);
  const readme = [
    `Storymap : ${story.title || 'Sans titre'}`,
    `Exportée avec StoryMap le ${new Date().toLocaleString('fr-FR')}.`,
    '',
    'Contenu de l’archive :',
    '  index.html         — lecteur autonome de la storymap (ouvrable dans tout navigateur moderne)',
    '  storymap.json      — document moderne canonique',
    '  v2.storymap.json   — données au format d’échange historique v2',
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
  const usedSlugs = new Set<string>();
  const entries = stories.map((s) => {
    const baseSlug = getSlug(s) || 'story';
    let slug = baseSlug;
    let counter = 2;
    while (usedSlugs.has(slug)) slug = `${baseSlug}-${counter++}`;
    usedSlugs.add(slug);
    return { name: `storymaps/${slug}.json`, data: JSON.stringify(s, null, 2) };
  });

  const manifest = {
    generator: 'StoryMap 2.0.0',
    exportedAt: new Date().toISOString(),
    count: stories.length,
    stories: stories.map(s => ({ id: s.id, title: s.title, modified: s.modified })),
  };

  entries.push({ name: 'sauvegarde-manifest.json', data: JSON.stringify(manifest, null, 2) });
  const zipBlob = await createZip(entries);
  downloadBlob(zipBlob, `storymap-sauvegarde-${new Date().toISOString().slice(0, 10)}.zip`);
}

export async function parseStoryFile(file: File | Blob): Promise<StoryMap[]> {
  const name = ((file as File).name || '').toLowerCase();
  if (name.endsWith('.zip') || file.type.includes('zip')) return parseZipArchive(file);
  const text = await (file as Blob).text();
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

async function resolveRelativeImages(story: StoryMap, entries: ZipReadEntry[]): Promise<StoryMap> {
  const imageEntries = entries.filter(e => /\.(jpe?g|png|webp|svg|gif)$/i.test(e.name));
  if (imageEntries.length === 0) return story;

  for (const step of story.steps) {
    if (step.media?.url && !step.media.url.startsWith('http') && !step.media.url.startsWith('data:')) {
      const target = step.media.url.replace(/^\.?\//, '').toLowerCase();
      const match = imageEntries.find(e => e.name.toLowerCase().endsWith(target) || target.endsWith(e.name.toLowerCase().split('/').pop() || ''));
      if (match) step.media.url = uint8ArrayToDataUrl(await match.bytes(), match.name);
    }
    if (step.description && /<img\b/i.test(step.description)) {
      for (const ie of imageEntries) {
        const bname = ie.name.split('/').pop() || ie.name;
        const re = new RegExp(`src=["'][^"']*${bname}["']`, 'gi');
        if (re.test(step.description)) {
          const durl = uint8ArrayToDataUrl(await ie.bytes(), ie.name);
          step.description = step.description.replace(re, `src="${durl}"`);
        }
      }
    }
  }
  return story;
}

function uint8ArrayToDataUrl(bytes: Uint8Array, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192)));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function parseZipArchive(file: Blob): Promise<StoryMap[]> {
  const entries = await readZip(file);
  const stories: StoryMap[] = [];

  let jsonEntries = entries.filter(x => x.name.endsWith('.json') && !x.name.includes('manifest'));
  if (jsonEntries.some(x => x.name.endsWith('storymap.json') && !x.name.endsWith('v2.storymap.json'))) {
    jsonEntries = jsonEntries.filter(x => !x.name.endsWith('v2.storymap.json'));
  }

  for (const e of jsonEntries) {
    try {
      const story = parseStoryJSON(await e.text());
      stories.push(await resolveRelativeImages(story, entries));
    } catch { /* ignorer */ }
  }

  if (stories.length > 0) return stories;

  for (const e of entries.filter(x => x.name.endsWith('.html') || x.name.endsWith('.htm'))) {
    try {
      const story = parseStoryHTML(await e.text());
      stories.push(await resolveRelativeImages(story, entries));
    } catch { /* ignorer */ }
  }

  if (stories.length === 0) throw new Error('Aucune storymap valide n’a été trouvée dans cette archive ZIP.');
  return stories;
}

function getSlug(story: StoryMap): string {
  return story.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'storymap';
}

function getFilename(story: StoryMap, ext: string): string {
  return `${getSlug(story)}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
