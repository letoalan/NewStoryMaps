/**
 * StoryMap — Moteur mathématique de grille, formats physiques et anti-collision (P2 — V06/V07)
 */

import type { Block } from '../types/project';
import type { BlockRect, GridDimensions, GridOperationResult, PageFormat } from '../types/grid';

export function getGridDimensions(format: PageFormat): GridDimensions {
  switch (format) {
    case 'a4-landscape':
      return {
        cols: 8, rows: 6, cellWidthPx: 112, cellHeightPx: 112, marginMm: 15, gapPx: 10,
        physicalWidthMm: 297, physicalHeightMm: 210, aspectRatio: '297 / 210',
      };
    case 'screen-16-9':
      return {
        cols: 8, rows: 5, cellWidthPx: 120, cellHeightPx: 120, marginMm: 10, gapPx: 10,
        physicalWidthMm: 338.7, physicalHeightMm: 190.5, aspectRatio: '16 / 9',
      };
    case 'responsive':
      return {
        cols: 4, rows: 8, cellWidthPx: 130, cellHeightPx: 130, marginMm: 10, gapPx: 10,
        physicalWidthMm: 180, physicalHeightMm: 320, aspectRatio: 'auto',
      };
    case 'a4-portrait':
    default:
      return {
        cols: 6, rows: 8, cellWidthPx: 108, cellHeightPx: 108, marginMm: 15, gapPx: 10,
        physicalWidthMm: 210, physicalHeightMm: 297, aspectRatio: '210 / 297',
      };
  }
}

export function isRectValid(rect: BlockRect, cols: number, rows: number): boolean {
  if (rect.w <= 0 || rect.h <= 0) return false;
  if (rect.x < 0 || rect.y < 0) return false;
  if (rect.x + rect.w > cols || rect.y + rect.h > rows) return false;
  const area = rect.w * rect.h;
  return area === 1 || area % 2 === 0;
}

export function hasCollision(rect: BlockRect, blocks: Block[], ignoreBlockId?: string): boolean {
  for (const b of blocks) {
    if (ignoreBlockId && b.id === ignoreBlockId) continue;
    const overlap = !(
      rect.x + rect.w <= b.x ||
      b.x + b.w <= rect.x ||
      rect.y + rect.h <= b.y ||
      b.y + b.h <= rect.y
    );
    if (overlap) return true;
  }
  return false;
}

export function addBlock(blocks: Block[], newBlock: Block, cols: number, rows: number): GridOperationResult {
  const rect = { x: newBlock.x, y: newBlock.y, w: newBlock.w, h: newBlock.h };
  if (!isRectValid(rect, cols, rows)) {
    return { success: false, blocks, error: 'Dimensions invalides (aire paire ou cellule unique requise).' };
  }
  if (hasCollision(rect, blocks)) {
    return { success: false, blocks, error: 'Collision avec un bloc existant.' };
  }
  return { success: true, blocks: [...blocks, newBlock] };
}

export function expandBlock(blocks: Block[], blockId: string, dir: 'right' | 'down', cols: number, rows: number): GridOperationResult {
  const target = blocks.find((b) => b.id === blockId);
  if (!target) return { success: false, blocks, error: 'Bloc introuvable.' };

  let step = 1;
  let newW = dir === 'right' ? target.w + step : target.w;
  let newH = dir === 'down' ? target.h + step : target.h;
  let newRect: BlockRect = { x: target.x, y: target.y, w: newW, h: newH };

  if (!isRectValid(newRect, cols, rows) && (newW * newH) % 2 !== 0) {
    step = 2;
    newW = dir === 'right' ? target.w + step : target.w;
    newH = dir === 'down' ? target.h + step : target.h;
    newRect = { x: target.x, y: target.y, w: newW, h: newH };
  }

  if (!isRectValid(newRect, cols, rows)) {
    return { success: false, blocks, error: 'Agrandissement impossible : hors limites ou aire non autorisée.' };
  }
  if (hasCollision(newRect, blocks, blockId)) {
    return { success: false, blocks, error: 'Agrandissement impossible : espace occupé.' };
  }

  return { success: true, blocks: blocks.map((b) => (b.id === blockId ? { ...b, w: newW, h: newH } : b)) };
}

export function shrinkBlock(blocks: Block[], blockId: string): GridOperationResult {
  const target = blocks.find((b) => b.id === blockId);
  if (!target) return { success: false, blocks, error: 'Bloc introuvable.' };
  if (target.w <= 1 && target.h <= 1) {
    return { success: false, blocks, error: 'Taille minimale atteinte (1x1).' };
  }

  let bestW = target.w;
  let bestH = target.h;
  let found = false;

  const trySteps = target.w >= target.h
    ? [{ dw: 1, dh: 0 }, { dw: 2, dh: 0 }, { dw: 0, dh: 1 }, { dw: 0, dh: 2 }]
    : [{ dw: 0, dh: 1 }, { dw: 0, dh: 2 }, { dw: 1, dh: 0 }, { dw: 2, dh: 0 }];

  for (const s of trySteps) {
    const tw = target.w - s.dw;
    const th = target.h - s.dh;
    if (tw >= 1 && th >= 1 && (tw * th === 1 || (tw * th) % 2 === 0)) {
      bestW = tw;
      bestH = th;
      found = true;
      break;
    }
  }

  if (!found) { bestW = 1; bestH = 1; }
  return { success: true, blocks: blocks.map((b) => (b.id === blockId ? { ...b, w: bestW, h: bestH } : b)) };
}

export function findFirstFreeCell(blocks: Block[], cols: number, rows: number, w = 1, h = 1): BlockRect | null {
  for (let y = 0; y <= rows - h; y++) {
    for (let x = 0; x <= cols - w; x++) {
      const rect: BlockRect = { x, y, w, h };
      if (!hasCollision(rect, blocks)) return rect;
    }
  }
  return null;
}

export function duplicateBlock(blocks: Block[], blockId: string, cols: number, rows: number): GridOperationResult {
  const target = blocks.find((b) => b.id === blockId);
  if (!target) return { success: false, blocks, error: 'Bloc introuvable.' };

  const freeRect = findFirstFreeCell(blocks, cols, rows, target.w, target.h);
  if (!freeRect) {
    return { success: false, blocks, error: 'Aucun espace libre suffisant pour dupliquer ce bloc.' };
  }

  const clone: Block = {
    ...target,
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    x: freeRect.x,
    y: freeRect.y,
  };
  return { success: true, blocks: [...blocks, clone] };
}

export function deleteBlock(blocks: Block[], blockId: string): Block[] {
  return blocks.filter((b) => b.id !== blockId);
}

/** V06 : Replace les blocs dans une nouvelle grille sans collision ni chevauchement */
export function refitBlocksToGrid(blocks: Block[], cols: number, rows: number): Block[] {
  const placed: Block[] = [];
  for (const b of blocks) {
    let w = Math.max(1, Math.min(b.w, cols));
    let h = Math.max(1, Math.min(b.h, rows));
    while (w * h > 1 && (w * h) % 2 !== 0 && w > 1) w--;
    while (w * h > 1 && (w * h) % 2 !== 0 && h > 1) h--;

    let x = Math.max(0, Math.min(b.x, cols - w));
    let y = Math.max(0, Math.min(b.y, rows - h));

    if (hasCollision({ x, y, w, h }, placed)) {
      let free = findFirstFreeCell(placed, cols, rows, w, h);
      while (!free && (w > 1 || h > 1)) {
        if (w >= h && w > 1) w--;
        else if (h > 1) h--;
        if (w * h > 1 && (w * h) % 2 !== 0) continue;
        free = findFirstFreeCell(placed, cols, rows, w, h);
      }
      if (free) {
        x = free.x;
        y = free.y;
      }
    }
    placed.push({ ...b, x, y, w, h });
  }
  return placed;
}
