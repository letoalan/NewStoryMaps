/**
 * StoryMap — Récit d'exemple complet : « Le tour du monde en cinq capitales »
 */

import { StoryMap } from '../types/story';

export const EXAMPLE_STORY: StoryMap = {
  id: 'story-exemple-capitales',
  version: '2.0.0',
  title: 'Le tour du monde en cinq capitales',
  subtitle: 'Cinq métropoles mondiales et leurs monuments emblématiques',
  author: 'Équipe StoryMap',
  description: 'Un voyage à travers les continents : Washington, Londres, Paris, Rome et Tokyo.',
  created: 1727213075000,
  modified: 1727214935000,
  appearance: {
    theme: 'auto',
    font: 'Inter',
    accentColor: '#0b7fb0',
    panelPosition: 'left',
    showProgress: true,
    autoplayInterval: 4500,
  },
  mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  layers: [],
  steps: [
    {
      id: 'step-washington',
      title: 'Washington D.C. — Le Capitole',
      description:
        '<p>Siège du Congrès des États-Unis, le <strong>Capitole</strong> est un monument néoclassique imposant qui domine la colline de Capitol Hill.</p>',
      media: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1501466044931-62695aada8e9?auto=format&fit=crop&w=1200&q=80',
        caption: 'Washington D.C. · États-Unis',
      },
      camera: {
        center: [-77.03533, 38.88993],
        zoom: 12.5,
        pitch: 35,
        bearing: -15,
      },
    },
    {
      id: 'step-london',
      title: 'Londres — Westminster & Big Ben',
      description:
        '<p>Au bord de la Tamise, le palais de <strong>Westminster</strong> et la tour Elizabeth abritent la célèbre cloche <em>Big Ben</em>, emblème de la démocratie parlementaire britannique.</p>',
      media: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
        caption: 'Palais de Westminster · Royaume-Uni',
      },
      camera: {
        center: [-0.1246, 51.5007],
        zoom: 13,
        pitch: 40,
        bearing: 25,
      },
    },
    {
      id: 'step-paris',
      title: 'Paris — La Tour Eiffel & la Seine',
      description:
        '<p>Érigée par Gustave Eiffel pour l’Exposition universelle de 1889, la <strong>Dame de fer</strong> s’élève à 330 mètres au-dessus du Champ-de-Mars.</p>',
      media: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
        caption: 'Tour Eiffel · France',
      },
      camera: {
        center: [2.2945, 48.8584],
        zoom: 13.5,
        pitch: 45,
        bearing: 45,
      },
    },
    {
      id: 'step-rome',
      title: 'Rome — Le Colisée',
      description:
        '<p>Plus grand amphithéâtre jamais construit dans l’Empire romain, le <strong>Colisée</strong> est le symbole impérissable de l’Antiquité romaine.</p>',
      media: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
        caption: 'Le Colisée · Italie',
      },
      camera: {
        center: [12.4922, 41.8902],
        zoom: 13.5,
        pitch: 40,
        bearing: -30,
      },
    },
    {
      id: 'step-tokyo',
      title: 'Tokyo — Shinjuku & Shibuya',
      description:
        '<p>Capitale du Japon, <strong>Tokyo</strong> conjugue gratte-ciels futuristes, carrefours effervescents et sanctuaires paisibles dans une harmonie unique.</p>',
      media: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
        caption: 'Tokyo · Japon',
      },
      camera: {
        center: [139.6917, 35.6895],
        zoom: 12,
        pitch: 45,
        bearing: 60,
      },
    },
  ],
};

