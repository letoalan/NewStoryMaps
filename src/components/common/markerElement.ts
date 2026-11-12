/**
 * StoryMap — Fabrique d'éléments DOM de marqueurs personnalisés (PINS, Chiffres, Avion, Navire...)
 */

import { MarkerShape } from '../../types/story';
import { isDarkColor } from '../../core/themeResolver';

export interface MarkerElementOptions {
  shape?: MarkerShape;
  color?: string;
  textColor?: string;
  borderColor?: string;
  index?: number;
  isActive?: boolean;
}

export function createMarkerElement(opts: MarkerElementOptions): HTMLElement {
  const shape = opts.shape || 'pin';
  const color = opts.color || '#0b7fb0';
  const isActive = opts.isActive ?? true;
  const index = (opts.index ?? 0) + 1;
  const numTextColor = opts.textColor || (isDarkColor(color) ? '#ffffff' : '#111827');
  const numBorderColor = opts.borderColor || (isDarkColor(color) ? '#ffffff' : '#111827');

  const el = document.createElement('div');
  el.className = `custom-story-marker marker-${shape} ${isActive ? 'active' : 'inactive'}`;
  el.style.cursor = 'pointer';
  el.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
  el.style.transform = isActive ? 'scale(1.15)' : 'scale(0.85)';
  el.style.opacity = isActive ? '1' : '0.65';

  if (shape === 'number') {
    el.style.width = '28px';
    el.style.height = '28px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.color = numTextColor;
    el.style.display = 'grid';
    el.style.placeItems = 'center';
    el.style.fontSize = '12px';
    el.style.fontWeight = '700';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
    el.style.border = `2px solid ${numBorderColor}`;
    el.textContent = String(index);
    return el;
  }

  if (shape === 'circle') {
    el.style.width = '22px';
    el.style.height = '22px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.border = '3px solid #ffffff';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)';
    return el;
  }

  if (shape === 'square') {
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '3px';
    el.style.backgroundColor = color;
    el.style.border = '2px solid #ffffff';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)';
    el.style.transform = (isActive ? 'scale(1.15) ' : 'scale(0.85) ') + 'rotate(45deg)';
    return el;
  }

  // Marqueurs vectoriels SVG (Épingle, Avion, Navire, Drapeau, Étoile)
  el.style.width = '32px';
  el.style.height = '32px';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

  let svgContent = '';
  if (shape === 'airplane') {
    svgContent = `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.5"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
  } else if (shape === 'ship') {
    svgContent = `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.5"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.47L19 11V7l-4-4H9L5 7v4l-2.28.47c-.26.05-.48.23-.6.47s-.14.52-.06.78L3.95 19z"/></svg>`;
  } else if (shape === 'flag') {
    svgContent = `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.5"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/></svg>`;
  } else if (shape === 'star') {
    svgContent = `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  } else {
    // Épingle standard (pin)
    svgContent = `<svg width="28" height="28" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
  }

  el.innerHTML = svgContent;
  return el;
}

