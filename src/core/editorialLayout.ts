/**
 * StoryMap — Commandes de disposition PAO, alignement, distribution, superposition et DPI (Mode 3)
 */

import type { Block } from '../types/project';
import type { ImageCropTransform } from '../types/editorial';

export type AlignmentDirection = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributionDirection = 'horizontal' | 'vertical';

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function computeSelectionBounds(blocks: Block[], targetIds: string[]): BoundingBox | null {
  const selected = blocks.filter((b) => targetIds.includes(b.id));
  if (selected.length === 0) return null;
  const minX = Math.min(...selected.map((b) => b.x));
  const minY = Math.min(...selected.map((b) => b.y));
  const maxX = Math.max(...selected.map((b) => b.x + b.w));
  const maxY = Math.max(...selected.map((b) => b.y + b.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function alignBlocks(
  blocks: Block[],
  targetIds: string[],
  direction: AlignmentDirection,
  referenceBounds?: BoundingBox
): Block[] {
  const ref = referenceBounds || computeSelectionBounds(blocks, targetIds);
  if (!ref) return blocks;

  return blocks.map((b) => {
    if (!targetIds.includes(b.id) || b.locked) return b;
    let newX = b.x, newY = b.y;
    switch (direction) {
      case 'left': newX = ref.x; break;
      case 'center': newX = Math.round(ref.x + (ref.w - b.w) / 2); break;
      case 'right': newX = ref.x + ref.w - b.w; break;
      case 'top': newY = ref.y; break;
      case 'middle': newY = Math.round(ref.y + (ref.h - b.h) / 2); break;
      case 'bottom': newY = ref.y + ref.h - b.h; break;
    }
    return { ...b, x: Math.max(0, newX), y: Math.max(0, newY) };
  });
}

export function distributeBlocks(blocks: Block[], targetIds: string[], direction: DistributionDirection): Block[] {
  const targets = blocks.filter((b) => targetIds.includes(b.id) && !b.locked);
  if (targets.length < 3) return blocks;

  if (direction === 'horizontal') {
    const sorted = [...targets].sort((a, b) => a.x - b.x);
    const minX = sorted[0].x;
    const maxX = sorted[sorted.length - 1].x + sorted[sorted.length - 1].w;
    const totalBlockW = sorted.reduce((acc, b) => acc + b.w, 0);
    const availableSpace = Math.max(0, (maxX - minX) - totalBlockW);
    const gap = availableSpace / (sorted.length - 1);

    let curX = minX;
    const posMap = new Map<string, number>();
    sorted.forEach((b) => {
      posMap.set(b.id, Math.round(curX));
      curX += b.w + gap;
    });
    return blocks.map((b) => (posMap.has(b.id) ? { ...b, x: posMap.get(b.id)! } : b));
  }

  const sorted = [...targets].sort((a, b) => a.y - b.y);
  const minY = sorted[0].y;
  const maxY = sorted[sorted.length - 1].y + sorted[sorted.length - 1].h;
  const totalBlockH = sorted.reduce((acc, b) => acc + b.h, 0);
  const availableSpace = Math.max(0, (maxY - minY) - totalBlockH);
  const gap = availableSpace / (sorted.length - 1);

  let curY = minY;
  const posMap = new Map<string, number>();
  sorted.forEach((b) => {
    posMap.set(b.id, Math.round(curY));
    curY += b.h + gap;
  });
  return blocks.map((b) => (posMap.has(b.id) ? { ...b, y: posMap.get(b.id)! } : b));
}

export function groupBlocks(blocks: Block[], targetIds: string[]): { blocks: Block[]; groupId: string } {
  const groupId = `grp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const updated = blocks.map((b) => (targetIds.includes(b.id) ? { ...b, groupId } : b));
  return { blocks: updated, groupId };
}

export function ungroupBlocks(blocks: Block[], groupId: string): Block[] {
  return blocks.map((b) => (b.groupId === groupId ? { ...b, groupId: undefined } : b));
}

export function toggleLockBlocks(blocks: Block[], targetIds: string[], locked?: boolean): Block[] {
  return blocks.map((b) => {
    if (!targetIds.includes(b.id)) return b;
    const isLocked = locked !== undefined ? locked : !b.locked;
    return { ...b, locked: isLocked };
  });
}

export function reorderZIndex(
  blocks: Block[],
  blockId: string,
  action: 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward'
): Block[] {
  const target = blocks.find((b) => b.id === blockId);
  if (!target) return blocks;

  const currentZ = target.zIndex ?? 0;
  const otherZs = blocks.filter((b) => b.id !== blockId).map((b) => b.zIndex ?? 0);
  const minZ = otherZs.length > 0 ? Math.min(...otherZs) : 0;
  const maxZ = otherZs.length > 0 ? Math.max(...otherZs) : 0;

  let newZ = currentZ;
  switch (action) {
    case 'bringToFront': newZ = maxZ + 1; break;
    case 'sendToBack': newZ = Math.max(0, minZ - 1); break;
    case 'bringForward': newZ = currentZ + 1; break;
    case 'sendBackward': newZ = Math.max(0, currentZ - 1); break;
  }
  return blocks.map((b) => (b.id === blockId ? { ...b, zIndex: newZ } : b));
}

export function calculateEffectiveDpi(
  naturalW: number,
  naturalH: number,
  blockWidthMm: number,
  blockHeightMm: number,
  crop?: ImageCropTransform
): { dpi: number; quality: 'optimal' | 'acceptable' | 'low'; dpiX: number; dpiY: number } {
  if (naturalW <= 0 || naturalH <= 0 || blockWidthMm <= 0 || blockHeightMm <= 0) {
    return { dpi: 0, quality: 'low', dpiX: 0, dpiY: 0 };
  }
  const cropZoom = Math.max(0.1, crop?.zoom || 1);
  const effectiveW = naturalW / cropZoom;
  const effectiveH = naturalH / cropZoom;
  const widthInches = blockWidthMm / 25.4;
  const heightInches = blockHeightMm / 25.4;
  const dpiX = Math.round(effectiveW / widthInches);
  const dpiY = Math.round(effectiveH / heightInches);
  const dpi = Math.min(dpiX, dpiY);

  let quality: 'optimal' | 'acceptable' | 'low' = 'optimal';
  if (dpi < 150) quality = 'low';
  else if (dpi < 240) quality = 'acceptable';
  return { dpi, quality, dpiX, dpiY };
}

