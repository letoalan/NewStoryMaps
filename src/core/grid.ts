/**
 * StoryMap — Moteur mathématique de grille et manipulation de blocs (P2)
 */

import type { Block } from '../types/project';
import type { BlockRect, GridDimensions, GridOperationResult, PageFormat } from '../types/grid';

export function getGridDimensions(format: PageFormat): GridDimensions {
  switch (format) {
    case 'a4-landscape':
      return { cols: 8, rows: 6, cellWidthPx: 120, cellHeightPx: 120, marginMm: 15, gapPx: 12 };
    case 'screen-16-9':
      return { cols: 8, rows: 5, cellWidthPx: 130, cellHeightPx: 130, marginMm: 10, gapPx: 12 };
    case 'responsive':
      return { cols: 4, rows: 8, cellWidthPx: 140, cellHeightPx: 140, marginMm: 10, gapPx: 10 };
    case 'a4-portrait':
    default:
      return { cols: 6, rows: 8, cellWidthPx: 110, cellHeightPx: 110, marginMm: 15, gapPx: 12 };
  }
}

export function isRectValid(rect: BlockRect, cols: number, rows: number): boolean {
  if (rect.w <= 0 || rect.h <= 0) return false;
  if (rect.x < 0 || rect.y < 0) return false;
  if (rect.x + rect.w > cols || rect.y + rect.h > rows) return false;
  const area = rect.w * rect.h;
  // Règle G04 : cellule unique (aire 1) ou aire paire complète (2, 4, 6, 8, etc.) sans L
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

  // Pas de 1 ou saut automatique à 2 si l'aire intermédiaire est interdite (ex. 2x1 -> 4x1)
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

export function refitBlocksToGrid(blocks: Block[], cols: number, rows: number): Block[] {
  return blocks.map((b) => {
    let w = Math.min(b.w, cols);
    let h = Math.min(b.h, rows);
    while (w * h > 1 && (w * h) % 2 !== 0 && w > 1) w--;
    return { ...b, w, h, x: Math.min(b.x, cols - w), y: Math.min(b.y, rows - h) };
  });
}
