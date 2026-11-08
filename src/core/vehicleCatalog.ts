/**
 * StoryMap — Catalogue de véhicules animés libres de droits (N4.01 à N4.03)
 *
 * Icônes SVG orientables vers le Nord (0° = haut) avec métadonnées de licence ouverte.
 */

import type { VehicleType } from '../types/theme';

export interface VehicleCatalogItem {
  id: VehicleType;
  label: string;
  emoji: string;
  license: string;
  defaultDurationSec: number;
  svgPath: string;
}

export const VEHICLE_CATALOG: VehicleCatalogItem[] = [
  {
    id: 'none',
    label: 'Aucun véhicule',
    emoji: '•',
    license: 'CC0 1.0 Public Domain',
    defaultDurationSec: 4,
    svgPath: '',
  },
  {
    id: 'airplane',
    label: 'Avion',
    emoji: '✈️',
    license: 'CC0 1.0 Public Domain (StoryMap Vector)',
    defaultDurationSec: 3.5,
    svgPath: 'M12 2L14 9L21 12L14 14L13 20L16 22L12 21L8 22L11 20L10 14L3 12L10 9L12 2Z',
  },
  {
    id: 'ship',
    label: 'Navire',
    emoji: '🚢',
    license: 'CC0 1.0 Public Domain (StoryMap Vector)',
    defaultDurationSec: 5,
    svgPath: 'M12 2L17 10H15V15L19 17L17 21H7L5 17L9 15V10H7L12 2Z',
  },
  {
    id: 'car',
    label: 'Voiture',
    emoji: '🚗',
    license: 'CC0 1.0 Public Domain (StoryMap Vector)',
    defaultDurationSec: 4,
    svgPath: 'M9 3H15L17 8V19H15V21H13V19H11V21H9V19H7V8L9 3ZM9 9V13H15V9H9Z',
  },
  {
    id: 'bus',
    label: 'Bus / Autocar',
    emoji: '🚌',
    license: 'CC0 1.0 Public Domain (StoryMap Vector)',
    defaultDurationSec: 4.5,
    svgPath: 'M7 3H17C18 3 19 4 19 5V19H17V21H15V19H9V21H7V19H5V5C5 4 6 3 7 3ZM7 6V12H17V6H7Z',
  },
  {
    id: 'train',
    label: 'Train',
    emoji: '🚆',
    license: 'CC0 1.0 Public Domain (StoryMap Vector)',
    defaultDurationSec: 4,
    svgPath: 'M8 2H16L18 6V18L15 21H9L6 18V6L8 2ZM8 7V12H16V7H8ZM9 15A1.5 1.5 0 1 0 9 18A1.5 1.5 0 1 0 9 15ZM15 15A1.5 1.5 0 1 0 15 18A1.5 1.5 0 1 0 15 15Z',
  },
  {
    id: 'bike',
    label: 'Vélo',
    emoji: '🚲',
    license: 'CC0 1.0 Public Domain (StoryMap Vector)',
    defaultDurationSec: 5,
    svgPath: 'M12 3A2 2 0 1 1 12 7A2 2 0 1 1 12 3ZM11 8H13L15 13H13V19H11V13H9L11 8Z',
  },
  {
    id: 'walker',
    label: 'Marcheur / Piéton',
    emoji: '🚶',
    license: 'CC0 1.0 Public Domain (StoryMap Vector)',
    defaultDurationSec: 6,
    svgPath: 'M12 2A2.5 2.5 0 1 1 12 7A2.5 2.5 0 1 1 12 2ZM9 8H15L16 14H14V21H10V14H8L9 8Z',
  },
];

export function getVehicleItem(type?: VehicleType | null): VehicleCatalogItem {
  return VEHICLE_CATALOG.find((v) => v.id === type) || VEHICLE_CATALOG[0];
}

/**
 * Assainit un SVG personnalisé ou génère le SVG orientable sécurisé d'un véhicule du catalogue (N4.02).
 */
export function renderSafeVehicleSvg(type: VehicleType, color = '#d97706', sizePx = 28): string {
  const item = getVehicleItem(type);
  const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#d97706';
  const clampedSize = Math.max(16, Math.min(64, Math.round(sizePx)));
  if (!item.svgPath || item.id === 'none') return '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${clampedSize}" height="${clampedSize}" viewBox="0 0 24 24" fill="${safeColor}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" aria-label="${item.label}"><path d="${item.svgPath}"/></svg>`;
}

export function sanitizeCustomVehicleSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';
  return rawSvg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}
