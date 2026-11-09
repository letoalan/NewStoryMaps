/**
 * StoryMap — Fixtures de référence pour l'atelier PAO (Mode 3 / M0.02)
 */

import type { Page } from '../types/project';

export function createBrochureTouristiqueFixture(): Page {
  return {
    id: 'page-brochure-tourisme',
    title: 'Cap Sizun & Pointe du Raz',
    layout: { format: 'a4-portrait', gridColumns: 8, gridRows: 12, marginMm: 12 },
    blocks: [
      { id: 'b-title-1', type: 'title', x: 0, y: 0, w: 8, h: 2, data: { title: 'Cap Sizun : Au Bout du Monde' }, typographyRole: 'cover-title' },
      { id: 'b-img-1', type: 'image', x: 0, y: 2, w: 8, h: 4, data: { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', caption: 'Pointe du Raz au crépuscule' }, imageCrop: { x: 0, y: 0, zoom: 1, fit: 'cover', naturalWidth: 2400, naturalHeight: 1600 } },
      { id: 'b-text-1', type: 'text', x: 0, y: 6, w: 4, h: 4, data: { text: 'Entre falaises escarpées et landes atlantiques, découvrez les sentiers côtiers du Finistère.' }, typographyRole: 'body' },
      { id: 'b-map-1', type: 'map', x: 4, y: 6, w: 4, h: 4, data: { mapId: 'map-sizun', title: 'Carte du Grand Site de France' }, mapPreset: 'main' },
      { id: 'b-src-1', type: 'source', x: 0, y: 10, w: 8, h: 2, data: { source: 'Office de Tourisme du Cap Sizun · IGN France' }, typographyRole: 'credit' },
    ],
  };
}

export function createMagazineCulturelFixture(): Page {
  return {
    id: 'page-mag-culture',
    title: 'Patrimoine Maritime & Mémoire des Phares',
    layout: { format: 'a4-landscape', gridColumns: 12, gridRows: 8, marginMm: 10 },
    blocks: [
      { id: 'm-title-1', type: 'title', x: 0, y: 0, w: 12, h: 1, data: { title: 'Mémoire des Phares : Les Sentinelles des Tempêtes' }, typographyRole: 'section-title' },
      { id: 'm-text-1', type: 'text', x: 0, y: 1, w: 4, h: 6, data: { text: 'Témoins de l’histoire maritime, les phares de la mer d’Iroise défient les flots depuis plus d’un siècle.' }, typographyRole: 'body' },
      { id: 'm-map-1', type: 'map', x: 4, y: 1, w: 5, h: 6, data: { mapId: 'map-phares', title: 'Alignement des Feux' }, mapPreset: 'circuit' },
      { id: 'm-callout-1', type: 'callout', x: 9, y: 1, w: 3, h: 3, data: { title: 'Record', content: 'Le phare d’Eckmühl culmine à 65 mètres.' }, typographyRole: 'callout' },
      { id: 'm-img-1', type: 'image', x: 9, y: 4, w: 3, h: 3, data: { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23', caption: 'Lanterne sous la brume' } },
      { id: 'm-src-1', type: 'source', x: 0, y: 7, w: 12, h: 1, data: { source: 'Archives maritimes · Patrimoine national' }, typographyRole: 'credit' },
    ],
  };
}

export function createFicheScientifiqueFixture(): Page {
  return {
    id: 'page-fiche-science',
    title: 'Relevés Bathymétriques & Écosystèmes Côtiers',
    layout: { format: 'a4-portrait', gridColumns: 8, gridRows: 12, marginMm: 12 },
    blocks: [
      { id: 's-title-1', type: 'title', x: 0, y: 0, w: 8, h: 1, data: { title: 'Étude d’Impact : Dynamique des Fonds Marins' }, typographyRole: 'section-title' },
      { id: 's-map-1', type: 'map', x: 0, y: 1, w: 4, h: 4, data: { mapId: 'map-bathymetry', title: 'Topographie sous-marine' }, mapPreset: 'detail' },
      { id: 's-table-1', type: 'table', x: 4, y: 1, w: 4, h: 4, data: { headers: ['Zone', 'Profondeur (m)', 'Salinité (g/L)'], rows: [['Fosse Nord', '48', '35.2'], ['Plateau Est', '14', '34.8']] } },
      { id: 's-text-1', type: 'text', x: 0, y: 5, w: 8, h: 5, data: { text: 'Les mesures sonar attestent d’une sédimentation stable sur le plateau continental.' }, typographyRole: 'body' },
      { id: 's-src-1', type: 'source', x: 0, y: 10, w: 8, h: 2, data: { source: 'Laboratoire d’océanographie physique · Données SHOM' }, typographyRole: 'credit' },
    ],
  };
}

