/**
 * StoryMap — Moteur Mode 3 Brochure statique : restrictions et conversion 2->3 (P5 — J01 à J09 / C06)
 */

import type { StoryMap } from '../types/story';
import type { Block, BlockType, Page, ProjectMap } from '../types/project';
import { refitBlocksDetailed, getGridDimensions } from './grid';
export * from './brochurePreflight';

export interface BrochureConversionReport {
  sourceId: string;
  targetId: string;
  convertedAt: number;
  adaptedGalleriesCount: number;
  numberedBindingsCount: number;
  formatChanged: boolean;
  targetFormat: 'a4-portrait' | 'a4-landscape';
  notes: string[];
}

const STATIC_BROCHURE_TYPES: ReadonlySet<BlockType> = new Set([
  'title', 'text', 'callout', 'image', 'table', 'map', 'legend', 'source',
]);

export function isBlockAllowedInBrochure(type: BlockType): boolean {
  return STATIC_BROCHURE_TYPES.has(type);
}

function extractGalleryItems(data: Record<string, unknown>): Array<{ url: string; caption?: string }> {
  if (Array.isArray(data.items) && data.items.length > 0) {
    return data.items.map((it: any) =>
      typeof it === 'string' ? { url: it, caption: '' } : { url: String(it?.url || ''), caption: String(it?.caption || '') }
    ).filter((it) => it.url.trim().length > 0);
  }
  if (Array.isArray(data.images) && data.images.length > 0) {
    return data.images.map((it: any) =>
      typeof it === 'string' ? { url: it, caption: '' } : { url: String(it?.url || ''), caption: String(it?.caption || '') }
    ).filter((it) => it.url.trim().length > 0);
  }
  const singleUrl = typeof data.url === 'string' && data.url.trim() ? data.url.trim() : '';
  return singleUrl ? [{ url: singleUrl, caption: String(data.caption || '') }] : [];
}

/** C06 & J02/J03 : Convertit un projet Mode 2 en copie Mode 3 (Brochure A4) avec numérotation synchronisée */
export function convertRichDocumentToBrochure(source: StoryMap): {
  brochure: StoryMap;
  report: BrochureConversionReport;
} {
  const targetId = `brochure-${Date.now()}`;
  const targetFormat: 'a4-portrait' | 'a4-landscape' =
    source.format === 'a4-landscape' ? 'a4-landscape' : 'a4-portrait';
  const formatChanged = source.format !== targetFormat;
  const dims = getGridDimensions(targetFormat);

  let adaptedGalleriesCount = 0;
  let numberedBindingsCount = 0;
  const notes: string[] = [];

  // Clone défensif des cartes pour préserver l'immutabilité de source
  const clonedMaps: ProjectMap[] = JSON.parse(JSON.stringify(source.maps || []));

  // Table de correspondance stable (mapId, featureId) -> numberIndex
  const featureNumberMap = new Map<string, number>();
  let nextSeq = 1;

  clonedMaps.forEach((m) => {
    (m.layers || []).forEach((l) => {
      (l.features || []).forEach((f) => {
        const key = `${m.id}::${f.id}`;
        if (typeof f.numberIndex === 'number' && f.numberIndex > 0) {
          featureNumberMap.set(key, f.numberIndex);
          nextSeq = Math.max(nextSeq, f.numberIndex + 1);
        }
      });
    });
  });

  clonedMaps.forEach((m) => {
    (m.layers || []).forEach((l) => {
      (l.features || []).forEach((f) => {
        const key = `${m.id}::${f.id}`;
        if (!featureNumberMap.has(key)) {
          featureNumberMap.set(key, nextSeq++);
          f.numberIndex = featureNumberMap.get(key);
        }
      });
    });
  });

  const sourcePages: Page[] =
    source.pages && source.pages.length > 0
      ? source.pages
      : [{ id: 'page-1', title: 'Page 1', layout: { format: targetFormat, gridColumns: dims.cols, gridRows: dims.rows, marginMm: 15 }, blocks: [] }];

  const convertedPages: Page[] = [];

  sourcePages.forEach((page, pIdx) => {
    const webOnlyFiltered = (page.blocks || []).filter((b) => {
      if (b.type === 'button' || b.type === 'form') {
        notes.push(`Page ${pIdx + 1} : Bloc web "${b.id}" (${b.type}) exclu en mode brochure.`);
        return false;
      }
      return true;
    });
    const adaptedBlocks: Block[] = webOnlyFiltered.map((b) => {
      let cloned: Block = { ...b, data: { ...b.data }, binding: b.binding ? { ...b.binding } : undefined };

      if (cloned.type === 'gallery') {
        adaptedGalleriesCount++;
        const items = extractGalleryItems(cloned.data);
        cloned = {
          ...cloned,
          type: 'image',
          data: {
            ...cloned.data,
            isContactSheet: true,
            contactSheetItems: items,
            url: items[0]?.url || (cloned.data.url as string) || '',
            caption: (cloned.data.caption as string) || `Planche photographique (${items.length} vue(s))`,
          },
        };
        notes.push(`Page ${pIdx + 1} : Galerie "${b.id}" développée en planche contact de ${items.length} image(s).`);
      }

      if (cloned.binding && cloned.type !== 'map') {
        const key = `${cloned.binding.mapId}::${cloned.binding.targetFeatureId || ''}`;
        if (featureNumberMap.has(key)) {
          cloned.binding.numberIndex = featureNumberMap.get(key);
        } else if (!cloned.binding.numberIndex) {
          cloned.binding.numberIndex = nextSeq++;
        }
        numberedBindingsCount++;
      }
      return cloned;
    });

    // Placement avec gestion des débordements sur pages de suite
    let remaining = adaptedBlocks;
    let spillIdx = 1;
    const firstRes = refitBlocksDetailed(remaining, dims.cols, dims.rows);
    convertedPages.push({
      ...page,
      layout: { ...page.layout, format: targetFormat, gridColumns: dims.cols, gridRows: dims.rows, marginMm: 15 },
      blocks: firstRes.placed,
    });
    remaining = firstRes.unplaced;

    while (remaining.length > 0) {
      const spillRes = refitBlocksDetailed(remaining, dims.cols, dims.rows);
      if (spillRes.placed.length === 0) {
        notes.push(`Attention : ${remaining.length} bloc(s) ne peuvent pas entrer dans la grille A4.`);
        break;
      }
      convertedPages.push({
        id: `${page.id}-spill-${spillIdx}`,
        title: `${page.title || 'Page'} (suite ${spillIdx})`,
        layout: { format: targetFormat, gridColumns: dims.cols, gridRows: dims.rows, marginMm: 15 },
        blocks: spillRes.placed,
      });
      notes.push(`Page ${pIdx + 1} : ${spillRes.placed.length} bloc(s) en débordement déplacés sur page de suite.`);
      remaining = spillRes.unplaced;
      spillIdx++;
    }
  });

  if (formatChanged) notes.push(`Format adapté de "${source.format || 'responsive'}" vers "${targetFormat}".`);
  if (numberedBindingsCount > 0) notes.push(`${numberedBindingsCount} liaison(s) synchronisée(s) avec les numéros de marqueurs cartographiques.`);

  const brochure: StoryMap = {
    ...source, id: targetId, title: `${source.title} (Brochure A4)`,
    mode: 'brochure', format: targetFormat, created: Date.now(), modified: Date.now(),
    maps: clonedMaps,
    pages: convertedPages,
  };

  return {
    brochure,
    report: { sourceId: source.id, targetId, convertedAt: Date.now(), adaptedGalleriesCount, numberedBindingsCount, formatChanged, targetFormat, notes },
  };
}
