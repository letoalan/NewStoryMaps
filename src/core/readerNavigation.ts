/**
 * StoryMap — Navigation documentaire, arbitrage clavier et accessibilité (P4 — I01 à I04 / V05)
 */

export type ReaderProfile = 'slide' | 'vertical' | 'horizontal';

export const READER_PROFILES: ReadonlyArray<ReaderProfile> = ['slide', 'vertical', 'horizontal'];

export interface KeyTargetInfo {
  tagName?: string;
  isContentEditable?: boolean;
  className?: string;
  getAttribute?: (name: string) => string | null;
  closest?: (selector: string) => unknown;
}

/**
 * I03 / V05 : Arbitre si une touche clavier (Flèches, PageUp/PageDown) doit être ignorée
 * par le lecteur documentaire afin de ne pas voler le focus aux champs, cartes MapLibre ou carrousels.
 */
export function shouldIgnoreReaderKeyEvent(target: KeyTargetInfo | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;

  const tag = (target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;

  const cls = typeof target.className === 'string' ? target.className : '';
  if (cls.includes('maplibregl-canvas') || cls.includes('maplibregl-map')) return true;

  if (typeof target.getAttribute === 'function') {
    if (target.getAttribute('contenteditable') === 'true') return true;
    if (target.getAttribute('data-carousel-control') === 'true') return true;
  }

  if (typeof target.closest === 'function') {
    if (target.closest('.maplibregl-map') || target.closest('[data-carousel-control="true"]')) {
      return true;
    }
  }

  return false;
}

/** Calcule l'index de page borné [0, totalPages - 1] */
export function computeNextPageIndex(
  currentIndex: number,
  totalPages: number,
  delta: number | 'next' | 'prev'
): number {
  const safeTotal = Math.max(1, Math.floor(totalPages));
  const numDelta = delta === 'next' ? 1 : delta === 'prev' ? -1 : Math.floor(delta);
  const next = Math.floor(currentIndex) + numDelta;
  return Math.min(safeTotal - 1, Math.max(0, next));
}
