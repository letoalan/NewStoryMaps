/**
 * StoryMap — Enregistrement d'icônes SVG vectorielles dans MapLibre GL (Flèches, Avion, Navire)
 */

import { Map as MLMap } from 'maplibre-gl';
import { RouteLineStyle } from '../types/story';

export function getRouteIconSVG(style: RouteLineStyle, color: string): string | null {
  if (style === 'arrow') {
    // Flèche simple orientée vers la droite (direction du segment)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <path d="M4 6l18 8-18 8 5-8z" fill="${color}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`;
  }

  if (style === 'double-arrow') {
    // Double flèche en chevron répété
    return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="28" viewBox="0 0 36 28">
      <path d="M2 6l13 8-13 8 4-8z" fill="${color}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M15 6l13 8-13 8 4-8z" fill="${color}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`;
  }

  if (style === 'airplane') {
    // Silhouette d'avion orientée vers la droite
    const planeColor = color === '#0b7fb0' ? '#dc2626' : color;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <g transform="rotate(90 12 12)">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
              fill="${planeColor}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
      </g>
    </svg>`;
  }

  if (style === 'ship') {
    // Silhouette de navire de croisière orientée vers la droite
    const shipColor = color === '#0b7fb0' ? '#0284c7' : color;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <g transform="rotate(90 12 12)">
        <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.47L19 11V7l-4-4H9L5 7v4l-2.28.47c-.26.05-.48.23-.6.47s-.14.52-.06.78L3.95 19z"
              fill="${shipColor}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
      </g>
    </svg>`;
  }

  return null;
}

export function registerRouteIcon(map: MLMap, iconId: string, svg: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      return resolve();
    }
    if ((map as any)._removed || !map.getCanvas()) {
      return resolve();
    }
    if (map.hasImage(iconId)) {
      return resolve();
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        if (!(map as any)._removed && map.getCanvas() && !map.hasImage(iconId)) {
          map.addImage(iconId, img);
        }
      } catch (err) {
        // Ignorer si le contexte WebGL a été libéré
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
