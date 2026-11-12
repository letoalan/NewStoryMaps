/**
 * StoryMap — Fixtures canoniques de référence pour les trois modes (N0.02 / N5.11)
 * Mode 1 : Circuit touristique 5 étapes
 * Mode 2 : Présentation territoriale multi-pages et multi-cartes
 * Mode 3 : Brochure A4 statique numérotée
 */

import type { StoryMap } from '../types/story';
import { convertRichDocumentToBrochure } from './brochure';

export function createCanonicalMode1Tour(): StoryMap {
  return {
    id: 'fixture-mode1-tour-5',
    version: '2.0.0',
    schemaVersion: 2,
    title: 'Circuit Patrimoine Parisien en 5 Étapes',
    subtitle: 'De la Tour Eiffel à la butte Montmartre le long de la Seine',
    author: 'Conservation du Patrimoine',
    created: 1731000000000,
    modified: 1731000010000,
    mode: 'storymap',
    brand: {
      primaryFont: 'Lora',
      secondaryFont: 'Inter',
      colors: ['#0f172a', '#334155', '#0b7fb0'],
    },
    appearance: {
      theme: 'light',
      font: 'Lora',
      accentColor: '#0b7fb0',
      panelPosition: 'left',
      showProgress: true,
      routeStyle: 'ship',
      markerShape: 'number',
      showAllMarkers: true,
    },
    routeAnimation: {
      enabled: true,
      vehicle: 'ship',
      durationSec: 4,
      durationMs: 4000,
      followCamera: false,
      progressiveReveal: true,
      staticPosition: 'middle',
    },
    hero: {
      enabled: true,
      mediaType: 'photo',
      mediaUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
      credit: '© Photo Patrimoine CC-BY',
      license: 'CC-BY 4.0',
      alt: 'Vue panoramique de la Seine à Paris',
      fit: 'cover',
      focalPoint: [50, 50],
      align: 'center',
      heightPx: 260,
      veilType: 'gradient',
      veilColor: '#0f172a',
      veilOpacity: 0.55,
      title: 'Circuit Patrimoine Parisien',
      subtitle: 'Parcours fluvial et monumental en cinq étapes',
      showLogo: true,
    },
    mapStyle: 'voyager',
    layers: [],
    steps: [
      { id: 's1', title: '1. Tour Eiffel', description: '<p>Repère métallique édifié en 1889.</p>', camera: { center: [2.2945, 48.8584], zoom: 14, pitch: 25, bearing: 0 } },
      { id: 's2', title: '2. Esplanade des Invalides', description: '<p>Perspective classique et dôme doré.</p>', camera: { center: [2.3126, 48.8566], zoom: 14, pitch: 20, bearing: 15 } },
      { id: 's3', title: '3. Musée du Louvre', description: '<p>Ancien palais royal au cœur de la cité.</p>', camera: { center: [2.3376, 48.8606], zoom: 14, pitch: 25, bearing: 30 } },
      { id: 's4', title: '4. Cathédrale Notre-Dame', description: '<p>Joyau gothique sur l’île de la Cité.</p>', camera: { center: [2.3499, 48.8530], zoom: 15, pitch: 15, bearing: -10 } },
      { id: 's5', title: '5. Butte Montmartre', description: '<p>Belvédère culminant au nord de Paris.</p>', camera: { center: [2.3431, 48.8867], zoom: 14, pitch: 30, bearing: 45 } },
    ],
  };
}

export function createCanonicalMode2TerritorialDoc(): StoryMap {
  const base = createCanonicalMode1Tour();
  return {
    ...base,
    id: 'fixture-mode2-territorial',
    title: 'Atlas Comparatif : Rives de Seine & Mobilités',
    mode: 'rich-document',
    format: 'a4-portrait',
    maps: [
      {
        id: 'map-seine',
        name: 'Axe Seine & Monuments',
        mapStyle: 'positron',
        view: { center: [2.326, 48.858], zoom: 12.5, pitch: 10, bearing: 0 },
        routeAnimation: { enabled: true, vehicle: 'ship', durationSec: 3.5, durationMs: 3500, progressiveReveal: true, staticPosition: 'middle' },
        layers: [
          {
            id: 'layer-monuments',
            name: 'Repères patrimoniaux',
            visible: true,
            color: '#0b7fb0',
            features: [
              { id: 'f-eiffel', name: 'Tour Eiffel', geometryType: 'Point', coordinates: [2.2945, 48.8584], numberIndex: 1 },
              { id: 'f-louvre', name: 'Louvre', geometryType: 'Point', coordinates: [2.3376, 48.8606], numberIndex: 2 },
              { id: 'f-corridor', name: 'Corridor Fluvial', geometryType: 'LineString', coordinates: [[2.2945, 48.8584], [2.3126, 48.8566], [2.3376, 48.8606], [2.3499, 48.8530]], numberIndex: 3 },
            ],
          },
        ],
      },
      {
        id: 'map-nord',
        name: 'Secteur Nord Montmartre',
        mapStyle: 'voyager',
        view: { center: [2.3431, 48.8867], zoom: 14, pitch: 20, bearing: 0 },
        layers: [
          {
            id: 'layer-nord',
            name: 'Périmètre Nord',
            visible: true,
            color: '#16a34a',
            features: [
              { id: 'f-montmartre', name: 'Sacré-Cœur', geometryType: 'Point', coordinates: [2.3431, 48.8867], numberIndex: 4 },
            ],
          },
        ],
      },
    ],
    pages: [
      {
        id: 'page-1',
        title: 'Axe Fluvial et Repères',
        layout: { format: 'a4-portrait', gridColumns: 6, gridRows: 8, marginMm: 15 },
        blocks: [
          { id: 'b-title-1', type: 'title', x: 0, y: 0, w: 6, h: 1, data: { text: '1. Diagnostic de l’Axe Seine', level: 1 } },
          { id: 'b-map-1', type: 'map', x: 0, y: 1, w: 4, h: 4, data: { title: 'Carte Fluviale', mapId: 'map-seine', caption: '© OpenStreetMap · © CARTO' } },
          { id: 'b-txt-1', type: 'text', x: 4, y: 1, w: 2, h: 2, data: { text: '<p>Focus sur la Tour Eiffel et les berges.</p>' }, binding: { mapId: 'map-seine', targetFeatureId: 'f-eiffel', action: 'highlight', numberIndex: 1 } },
          { id: 'b-call-1', type: 'callout', x: 4, y: 3, w: 2, h: 1, data: { text: 'Tracé fluvial continu de 5,4 km.' }, binding: { mapId: 'map-seine', targetFeatureId: 'f-corridor', action: 'zoom', numberIndex: 3 }, styleOverride: { styleMode: 'custom', accentColor: '#dc2626', backgroundOpacity: 0.9 } },
          { id: 'b-btn-1', type: 'button', x: 4, y: 4, w: 2, h: 1, data: { label: 'Explorer le fleuve', action: 'zoom', mapId: 'map-seine', targetFeatureId: 'f-corridor' }, binding: { mapId: 'map-seine', targetFeatureId: 'f-corridor', action: 'zoom' } },
          { id: 'b-gal-1', type: 'gallery', x: 0, y: 5, w: 4, h: 2, data: { caption: 'Vues des berges', items: [{ url: 'https://example.com/seine1.jpg', caption: 'Pont d’Iéna' }, { url: 'https://example.com/seine2.jpg', caption: 'Quai du Louvre' }] } },
          { id: 'b-src-1', type: 'source', x: 4, y: 5, w: 2, h: 2, data: { text: 'Sources : © OpenStreetMap contributors, © CARTO, Atelier Paris 2026.' } },
        ],
      },
      {
        id: 'page-2',
        title: 'Belvédère Nord & Synthèse',
        layout: { format: 'a4-portrait', gridColumns: 6, gridRows: 8, marginMm: 15 },
        blocks: [
          { id: 'b-title-2', type: 'title', x: 0, y: 0, w: 6, h: 1, data: { text: '2. Secteur Nord et Indicateurs', level: 2 } },
          { id: 'b-map-2', type: 'map', x: 0, y: 1, w: 4, h: 4, data: { title: 'Carte Montmartre', mapId: 'map-nord', caption: '© OpenStreetMap · © CARTO' } },
          { id: 'b-tbl-2', type: 'table', x: 4, y: 1, w: 2, h: 4, data: { rows: [['Site', 'Fréquentation'], ['Tour Eiffel', '6,2 M'], ['Montmartre', '11,0 M']] } },
          { id: 'b-leg-2', type: 'legend', x: 0, y: 5, w: 6, h: 1, data: { text: 'Légende : #1 Tour Eiffel · #2 Louvre · #3 Corridor Fluvial · #4 Sacré-Cœur · © OpenStreetMap · © CARTO' } },
        ],
      },
    ],
  };
}

export function createCanonicalMode3Brochure(): StoryMap {
  return convertRichDocumentToBrochure(createCanonicalMode2TerritorialDoc()).brochure;
}
