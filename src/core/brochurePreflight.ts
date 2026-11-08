/**
 * StoryMap — Contrôle prévol (Preflight) honnête avant génération Brochure A4 (C07 / J10 / N3.12)
 */

import type { StoryMap } from '../types/story';

export interface PreflightIssue {
  severity: 'error' | 'warning' | 'info';
  pageIndex: number;
  blockId?: string;
  code:
    | 'NON_A4_FORMAT'
    | 'DYNAMIC_GALLERY'
    | 'TEXT_OVERFLOW'
    | 'MISSING_MEDIA_URL'
    | 'MISSING_VIDEO_POSTER'
    | 'MISSING_MAP_SCENE'
    | 'MISSING_MAP_ATTRIBUTION'
    | 'UNNUMBERED_BINDING';
  message: string;
}

export interface BrochurePreflightReport {
  ready: boolean;
  pageCount: number;
  mapCount: number;
  selectableTextPresent: boolean;
  selectableTextGuaranteed: boolean;
  attributionsPresent: boolean;
  issues: PreflightIssue[];
}

function detectMapProvider(style?: string): { id: string; name: string; requiredCredit: string } {
  const s = (style || '').toLowerCase();
  if (s.includes('arcgis') || s.includes('esri') || s.includes('satellite') || s.includes('hybrid')) {
    return { id: 'esri', name: 'Esri World Imagery', requiredCredit: 'Esri' };
  }
  if (s.includes('openfreemap') || s.includes('liberty') || s.includes('bright') || s.includes('fiord')) {
    return { id: 'ofm', name: 'OpenFreeMap', requiredCredit: 'OpenFreeMap' };
  }
  return { id: 'carto', name: 'CARTO Basemaps', requiredCredit: 'CARTO' };
}

export function runBrochurePreflight(story: StoryMap): BrochurePreflightReport {
  const issues: PreflightIssue[] = [];
  const pages = story.pages || [];
  const maps = story.maps || [];
  let mapCount = 0;
  let missingAttributionCount = 0;
  let textBlockCount = 0;

  if (story.hero?.enabled && story.hero.mediaType === 'video' && !(story.hero.posterUrl || '').trim()) {
    issues.push({
      severity: 'error',
      pageIndex: 0,
      code: 'MISSING_VIDEO_POSTER',
      message: 'Couverture Hero vidéo du projet : image de repli (posterUrl) obligatoire pour la brochure A4.',
    });
  }

  pages.forEach((page, pIdx) => {
    if (page.hero?.enabled && page.hero.mediaType === 'video' && !(page.hero.posterUrl || '').trim()) {
      issues.push({
        severity: 'error',
        pageIndex: pIdx,
        code: 'MISSING_VIDEO_POSTER',
        message: `Page ${pIdx + 1} : couverture Hero vidéo sans image de repli (posterUrl).`,
      });
    }
    const fmt = page.layout?.format || story.format || 'a4-portrait';
    if (fmt !== 'a4-portrait' && fmt !== 'a4-landscape') {
      issues.push({ severity: 'warning', pageIndex: pIdx, code: 'NON_A4_FORMAT', message: `Page ${pIdx + 1} : format "${fmt}" normalisé en A4.` });
    }
    const pageSourceText = (page.blocks || [])
      .filter((blk) => (blk.type === 'source' || blk.type === 'legend') && String(blk.data.text || '').trim().length > 0)
      .map((blk) => String(blk.data.text || '').toLowerCase())
      .join(' ');

    (page.blocks || []).forEach((b) => {
      if (b.type === 'gallery') {
        issues.push({ severity: 'warning', pageIndex: pIdx, blockId: b.id, code: 'DYNAMIC_GALLERY', message: `Page ${pIdx + 1} : carrousel aplati en planche.` });
      }
      if (b.type === 'map') {
        mapCount++;
        const targetMapId = (b.binding?.mapId || b.data?.mapId) as string | undefined;
        const mapScene = targetMapId ? maps.find((m) => m.id === targetMapId) : maps[0];
        if (!mapScene) {
          issues.push({
            severity: 'error', pageIndex: pIdx, blockId: b.id, code: 'MISSING_MAP_SCENE',
            message: targetMapId ? `Page ${pIdx + 1} : scène cartographique "${targetMapId}" introuvable.` : `Page ${pIdx + 1} : aucune scène cartographique disponible.`,
          });
        }
        const provider = detectMapProvider(mapScene?.mapStyle);
        const mapCaption = String(b.data.caption || b.data.attribution || '').toLowerCase();
        const hasProviderCredit = mapCaption.includes(provider.requiredCredit.toLowerCase()) || pageSourceText.includes(provider.requiredCredit.toLowerCase()) || mapCaption.includes('openstreetmap') || pageSourceText.includes('openstreetmap');
        if (!hasProviderCredit) {
          missingAttributionCount++;
          issues.push({ severity: 'warning', pageIndex: pIdx, blockId: b.id, code: 'MISSING_MAP_ATTRIBUTION', message: `Page ${pIdx + 1} : carte "${b.id}" requiert les attributions du fournisseur (${provider.name}).` });
        }
      }
      if (['title', 'text', 'callout', 'source', 'legend'].includes(b.type)) textBlockCount++;
      if (b.type === 'text' || b.type === 'callout') {
        const text = ((b.data.text as string) || '').replace(/<[^>]*>/g, '');
        if (text.length > b.w * b.h * 220) {
          issues.push({ severity: 'warning', pageIndex: pIdx, blockId: b.id, code: 'TEXT_OVERFLOW', message: `Page ${pIdx + 1} : risque de débordement texte (${text.length} car.).` });
        }
      }
      if (b.type === 'image' && !(b.data.url as string)?.trim() && !Array.isArray(b.data.contactSheetItems)) {
        issues.push({ severity: 'error', pageIndex: pIdx, blockId: b.id, code: 'MISSING_MEDIA_URL', message: `Page ${pIdx + 1} : bloc image sans URL.` });
      }
      if (b.binding && b.type !== 'map' && !b.binding.numberIndex) {
        issues.push({ severity: 'info', pageIndex: pIdx, blockId: b.id, code: 'UNNUMBERED_BINDING', message: `Page ${pIdx + 1} : liaison synchronisée avec le marqueur cartographique.` });
      }
    });
  });

  return {
    ready: !issues.some((i) => i.severity === 'error'),
    pageCount: Math.max(1, pages.length),
    mapCount,
    selectableTextPresent: textBlockCount > 0 || Boolean(story.title),
    selectableTextGuaranteed: false,
    attributionsPresent: mapCount === 0 || missingAttributionCount === 0,
    issues,
  };
}
