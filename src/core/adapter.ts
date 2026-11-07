/**
 * StoryMap — Adaptateur de compatibilité historique (v1 / v2 / React)
 */

import { StoryMap } from '../types/story';
import { Step } from '../types/step';

export interface LegacyV2Exchange {
  format?: string;
  version?: number;
  generator?: string;
  exportedAt?: string;
  story?: {
    title?: string;
    subtitle?: string;
    description?: string;
    style?: string;
    chapters?: Array<{
      id?: string;
      title?: string;
      description?: string;
      image?: string;
      caption?: string;
      location?: {
        center?: [number, number];
        zoom?: number;
        pitch?: number;
        bearing?: number;
      };
    }>;
  };
  images?: Record<string, string>;
  geodata?: Record<string, unknown>;
}

export function isModernStoryMap(data: unknown): data is StoryMap {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.title === 'string' &&
    Array.isArray(d.steps) &&
    typeof d.id === 'string'
  );
}

export function isLegacyV2Story(data: unknown): data is LegacyV2Exchange {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    (d.format === 'storymap' || d.format === 'atelier-storymap') &&
    (d.version === 2 || !!d.story)
  );
}

export function isLegacyV1Story(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    d.format === 'maplibre-storymap' ||
    (Array.isArray(d.chapters) && !d.steps)
  );
}

export function convertLegacyToModern(legacy: unknown): StoryMap {
  if (isModernStoryMap(legacy)) {
    return legacy;
  }

  const data = legacy as Record<string, unknown>;
  const storyObj = (data.story as Record<string, unknown>) || data;
  const images = (data.images as Record<string, string>) || {};

  const title = (storyObj.title as string) || 'Récit importé';
  const subtitle = (storyObj.subtitle as string) || '';
  const description = (storyObj.description as string) || '';
  const mapStyle = (storyObj.style as string) || 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

  const rawChapters = (storyObj.chapters as Array<Record<string, unknown>>) || [];
  const steps: Step[] = rawChapters.map((ch, idx) => {
    const loc = (ch.location as Record<string, unknown>) || {};
    const center = (loc.center as [number, number]) || [2.3522, 48.8566];
    const zoom = typeof loc.zoom === 'number' ? loc.zoom : 12;
    const pitch = typeof loc.pitch === 'number' ? loc.pitch : 0;
    const bearing = typeof loc.bearing === 'number' ? loc.bearing : 0;

    let mediaUrl = (ch.image as string) || '';
    if (mediaUrl && images[mediaUrl]) {
      mediaUrl = images[mediaUrl];
    }

    return {
      id: (ch.id as string) || `step-${idx + 1}-${Math.random().toString(36).substr(2, 5)}`,
      title: (ch.title as string) || `Étape ${idx + 1}`,
      description: (ch.description as string) || '',
      media: mediaUrl ? { type: 'image', url: mediaUrl, caption: ch.caption as string } : undefined,
      camera: { center, zoom, pitch, bearing },
    };
  });

  return {
    id: (data.id as string) || `story-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    version: '2.0.0',
    title,
    subtitle,
    description,
    author: (storyObj.author as string) || '',
    created: (data.createdAt as number) || Date.now(),
    modified: (data.updatedAt as number) || Date.now(),
    appearance: {
      theme: 'auto',
      font: 'Inter',
      accentColor: '#0b7fb0',
      panelPosition: 'left',
      showProgress: true,
      autoplayInterval: 5000,
    },
    mapStyle,
    layers: [],
    steps: steps.length > 0 ? steps : [
      {
        id: 'step-1',
        title: 'Première étape',
        description: '',
        camera: { center: [2.3522, 48.8566], zoom: 12, pitch: 0, bearing: 0 },
      },
    ],
  };
}

export function convertModernToLegacyV2(story: StoryMap): LegacyV2Exchange {
  const images: Record<string, string> = {};
  const chapters = story.steps.map((st, i) => {
    let imgName: string | undefined = undefined;
    if (st.media?.url) {
      if (st.media.url.startsWith('data:')) {
        imgName = `image-${i + 1}.jpg`;
        images[imgName] = st.media.url;
      } else {
        imgName = st.media.url;
      }
    }

    return {
      id: st.id,
      title: st.title,
      description: st.description,
      image: imgName,
      caption: st.media?.caption,
      location: {
        center: st.camera.center,
        zoom: st.camera.zoom,
        pitch: st.camera.pitch,
        bearing: st.camera.bearing,
      },
    };
  });

  return {
    format: 'storymap',
    version: 2,
    generator: 'StoryMap React 2.0.0',
    exportedAt: new Date().toISOString(),
    story: {
      title: story.title,
      subtitle: story.subtitle,
      description: story.description,
      style: story.mapStyle,
      chapters,
    },
    images,
    geodata: {},
  };
}

