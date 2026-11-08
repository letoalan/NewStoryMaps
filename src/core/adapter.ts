/**
 * StoryMap — Adaptateur de compatibilité historique (v1 / v2 / React)
 */

import type { StoryMap, MapLayer } from '../types/story';
import type { Step } from '../types/step';
import { validateProjectSchemaVersion } from './renderMatrix';

export interface LegacyV2Exchange {
  format?: string;
  version?: number;
  generator?: string;
  exportedAt?: string;
  story?: {
    title?: string;
    subtitle?: string;
    byline?: string;
    style?: string;
    mode?: string;
    brand?: unknown;
    data?: Array<Record<string, unknown>>;
    chapters?: Array<{
      id?: string;
      title?: string;
      text?: string;
      image?: string;
      imageCaption?: string;
      imageAlt?: string;
      imageCredit?: string;
      view?: { center?: [number, number]; zoom?: number; pitch?: number; bearing?: number };
    }>;
  };
  images?: Record<string, string>;
  geodata?: Record<string, unknown>;
}

export function isModernStoryMap(data: unknown): data is StoryMap {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const hasValidMode2Or3 = (d.mode === 'rich-document' || d.mode === 'brochure') && Array.isArray(d.pages);
  const hasValidMode1 = Array.isArray(d.steps);
  return typeof d.title === 'string' && typeof d.id === 'string' && (hasValidMode1 || hasValidMode2Or3);
}

export function isLegacyV2Story(data: unknown): data is LegacyV2Exchange {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (d.format === 'storymap' || d.format === 'atelier-storymap') && (d.version === 2 || !!d.story);
}

export function isLegacyV1Story(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.format === 'maplibre-storymap' || (Array.isArray(d.chapters) && !d.steps);
}

export function convertLegacyToModern(legacy: unknown): StoryMap {
  if (isModernStoryMap(legacy)) {
    const verCheck = validateProjectSchemaVersion(legacy);
    if (!verCheck.valid) throw new Error(verCheck.error);
    return {
      ...legacy,
      steps: legacy.steps || [],
      pages: legacy.pages || [],
      maps: legacy.maps || [],
    };
  }
  if (!isLegacyV2Story(legacy) && !isLegacyV1Story(legacy)) {
    throw new Error('Ce document n’est pas un format StoryMap reconnu.');
  }

  const data = legacy as Record<string, unknown>;
  const storyObj = (data.story as Record<string, unknown>) || data;
  const images = (data.images as Record<string, string>) || {};
  const geodata = (data.geodata as Record<string, unknown>) || {};

  const title = (storyObj.title as string) || 'Récit sans titre';
  const subtitle = (storyObj.subtitle as string) || '';
  const author = (storyObj.byline as string) || (storyObj.author as string) || '';
  const mapStyle = (storyObj.style as string) || 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

  const rawChapters = (storyObj.chapters as Array<Record<string, unknown>>) || [];
  const steps: Step[] = rawChapters.map((ch, idx) => {
    const view = (ch.view as Record<string, unknown>) || (ch.location as Record<string, unknown>) || {};
    const center = (view.center as [number, number]) || [2.3522, 48.8566];
    const zoom = typeof view.zoom === 'number' ? view.zoom : 12;
    const pitch = typeof view.pitch === 'number' ? view.pitch : 0;
    const bearing = typeof view.bearing === 'number' ? view.bearing : 0;

    let mediaUrl = (ch.image as string) || '';
    if (mediaUrl && images[mediaUrl]) mediaUrl = images[mediaUrl];

    const text = (ch.text as string) || (ch.description as string) || '';
    const caption = (ch.imageCaption as string) || (ch.caption as string) || undefined;
    const alt = (ch.imageAlt as string) || (ch.alt as string) || undefined;
    const credit = (ch.imageCredit as string) || (ch.credit as string) || undefined;

    return {
      id: (ch.id as string) || `step-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
      title: (ch.title as string) || `Étape ${idx + 1}`,
      description: text,
      media: mediaUrl ? { type: 'image', url: mediaUrl, caption, alt, credit } : undefined,
      camera: { center, zoom, pitch, bearing },
    };
  });

  const rawLayers = (storyObj.data as Array<Record<string, unknown>>) || [];
  const layers: MapLayer[] = rawLayers.map((l, i) => {
    const lid = (l.id as string) || `layer-${i + 1}`;
    return {
      id: lid,
      name: (l.name as string) || `Calque ${i + 1}`,
      type: 'geojson',
      data: geodata[lid] || l.geojson,
      visible: true,
    };
  });

  return {
    id: (data.id as string) || `story-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    version: '2.0.0',
    title,
    subtitle,
    author,
    created: (data.createdAt as number) || Date.now(),
    modified: (data.updatedAt as number) || Date.now(),
    mode: (storyObj.mode as any) || 'storymap',
    brand: storyObj.brand as any,
    appearance: {
      theme: 'auto',
      font: 'Inter',
      accentColor: '#0b7fb0',
      panelPosition: 'left',
      showProgress: true,
      autoplayInterval: 5000,
    },
    mapStyle,
    layers,
    steps: steps.length > 0 ? steps : [{
      id: 'step-1',
      title: 'Première étape',
      description: '',
      camera: { center: [2.3522, 48.8566], zoom: 12, pitch: 0, bearing: 0 },
    }],
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
      id: st.id, title: st.title, text: st.description, image: imgName,
      imageCaption: st.media?.caption, imageAlt: st.media?.alt, imageCredit: st.media?.credit,
      view: { center: st.camera.center, zoom: st.camera.zoom, pitch: st.camera.pitch, bearing: st.camera.bearing },
    };
  });

  const geodata: Record<string, unknown> = {};
  const dataLayers = (story.layers || []).map((l) => {
    if (l.data) geodata[l.id] = l.data;
    return { id: l.id, name: l.name, type: l.type };
  });

  return {
    format: 'storymap',
    version: 2,
    generator: 'StoryMap 2.0.0',
    exportedAt: new Date().toISOString(),
    story: {
      title: story.title,
      subtitle: story.subtitle,
      byline: story.author,
      style: story.mapStyle,
      mode: story.mode,
      brand: story.brand,
      data: dataLayers.length > 0 ? dataLayers : undefined,
      chapters,
    },
    images,
    geodata,
  };
}
