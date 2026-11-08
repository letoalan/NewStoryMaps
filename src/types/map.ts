/**
 * StoryMap — Types et styles pour la cartographie MapLibre GL
 */

import type { StyleSpecification } from 'maplibre-gl';

export interface MapStyleOption {
  id: string;
  name: string;
  url: string;
  provider: 'CARTO' | 'OpenFreeMap' | 'Esri' | 'OSM' | 'Custom';
  description?: string;
}

const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  name: 'Satellite',
  sources: {
    satellite: {
      type: 'raster',
      tiles: [ESRI_IMAGERY],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagerie © Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
};

export const HYBRID_STYLE: StyleSpecification = {
  version: 8,
  name: 'Satellite Hybride',
  sources: {
    satellite: {
      type: 'raster',
      tiles: [ESRI_IMAGERY],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagerie © Esri, Maxar',
    },
    labels: {
      type: 'raster',
      tiles: [ESRI_LABELS],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'satellite', type: 'raster', source: 'satellite' },
    { id: 'labels', type: 'raster', source: 'labels' },
  ],
};

export const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'positron',
    name: 'Positron (Clair)',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    provider: 'CARTO',
    description: 'Fond clair épuré',
  },
  {
    id: 'voyager',
    name: 'Voyager (Coloré)',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    provider: 'CARTO',
    description: 'Coloré et très lisible',
  },
  {
    id: 'dark-matter',
    name: 'Dark Matter (Sombre)',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    provider: 'CARTO',
    description: 'Sombre et élégant',
  },
  {
    id: 'liberty',
    name: 'Liberty (3D)',
    url: 'https://tiles.openfreemap.org/styles/liberty',
    provider: 'OpenFreeMap',
    description: 'Détaillé avec bâtiments 3D',
  },
  {
    id: 'bright',
    name: 'Bright (Contraste)',
    url: 'https://tiles.openfreemap.org/styles/bright',
    provider: 'OpenFreeMap',
    description: 'Vif et contrasté',
  },
  {
    id: 'ofm-positron',
    name: 'Positron (OFM)',
    url: 'https://tiles.openfreemap.org/styles/positron',
    provider: 'OpenFreeMap',
    description: 'Clair et minimaliste',
  },
  {
    id: 'ofm-dark',
    name: 'Dark (OFM)',
    url: 'https://tiles.openfreemap.org/styles/dark',
    provider: 'OpenFreeMap',
    description: 'Très sombre',
  },
  {
    id: 'fiord',
    name: 'Fiord (Bleu Nuit)',
    url: 'https://tiles.openfreemap.org/styles/fiord',
    provider: 'OpenFreeMap',
    description: 'Thème bleu nuit',
  },
  {
    id: 'satellite',
    name: 'Satellite',
    url: 'esri-satellite',
    provider: 'Esri',
    description: 'Photographies aériennes',
  },
  {
    id: 'hybrid',
    name: 'Satellite Hybride',
    url: 'esri-hybrid',
    provider: 'Esri',
    description: 'Satellite avec noms et frontières',
  },
];

export function resolveMapStyle(styleUrlOrId: string | StyleSpecification | undefined | null): string | StyleSpecification {
  if (!styleUrlOrId) {
    return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
  }
  if (typeof styleUrlOrId === 'object') {
    return styleUrlOrId;
  }
  const s = String(styleUrlOrId).trim();
  if (s === 'esri-satellite' || s === 'satellite') return SATELLITE_STYLE;
  if (s === 'esri-hybrid' || s === 'hybrid') return HYBRID_STYLE;
  if (s === 'positron') return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
  if (s === 'voyager') return 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
  if (s === 'dark-matter' || s === 'dark') return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  if (s === 'liberty') return 'https://tiles.openfreemap.org/styles/liberty';
  if (s === 'bright') return 'https://tiles.openfreemap.org/styles/bright';
  if (s === 'fiord') return 'https://tiles.openfreemap.org/styles/fiord';
  if (s === 'ofm-positron') return 'https://tiles.openfreemap.org/styles/positron';
  if (s === 'ofm-dark') return 'https://tiles.openfreemap.org/styles/dark';
  if (/^(https?:|data:|\/)/.test(s)) return s;
  return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}

export function getMapStyleId(styleUrlOrId: string | undefined | null): string {
  if (!styleUrlOrId) return 'positron';
  const s = String(styleUrlOrId).trim();
  const found = MAP_STYLES.find((opt) => opt.id === s || opt.url === s);
  if (found) return found.id;
  if (s.includes('dark-matter')) return 'dark-matter';
  if (s.includes('voyager')) return 'voyager';
  if (s.includes('positron')) return 'positron';
  if (s.includes('liberty')) return 'liberty';
  if (s.includes('bright')) return 'bright';
  if (s.includes('fiord')) return 'fiord';
  if (s.includes('satellite')) return 'satellite';
  if (s.includes('hybrid')) return 'hybrid';
  return 'positron';
}
