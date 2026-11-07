/**
 * StoryMap — Gestion des scènes cartographiques et liaisons narratives (P3 — H01 à H09)
 */

import type { Block, MapFeature, MapView, NarrativeBinding, Page, ProjectMap } from '../types/project';

export function createDefaultProjectMap(id = `map-${Date.now()}`, name = 'Carte principale'): ProjectMap {
  return {
    id,
    name,
    mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    view: {
      center: [2.3522, 48.8566],
      zoom: 12,
      pitch: 0,
      bearing: 0,
      bounds: [[2.2, 48.8], [2.4, 48.9]],
    },
    layers: [
      {
        id: `layer-${Date.now()}`,
        name: 'Points d’intérêt',
        visible: true,
        opacity: 1,
        color: '#0b7fb0',
        features: [
          {
            id: `feat-1`,
            name: 'Repère initial',
            geometryType: 'Point',
            coordinates: [2.3522, 48.8566],
            color: '#0b7fb0',
            numberIndex: 1,
          },
        ],
      },
    ],
  };
}

export function updateMapView(map: ProjectMap, view: Partial<MapView>): ProjectMap {
  return {
    ...map,
    view: { ...map.view, ...view },
  };
}

export function addFeatureToLayer(
  map: ProjectMap,
  layerId: string,
  feature: MapFeature
): ProjectMap {
  const layers = (map.layers || []).map((layer) => {
    if (layer.id !== layerId) return layer;
    return {
      ...layer,
      features: [...(layer.features || []), feature],
    };
  });
  return { ...map, layers };
}

export function deleteFeatureFromLayer(
  map: ProjectMap,
  layerId: string,
  featureId: string
): ProjectMap {
  const layers = (map.layers || []).map((layer) => {
    if (layer.id !== layerId) return layer;
    return {
      ...layer,
      features: (layer.features || []).filter((f) => f.id !== featureId),
    };
  });
  return { ...map, layers };
}

export function bindBlockToFeature(
  block: Block,
  mapId: string,
  featureId?: string,
  action: 'highlight' | 'zoom' | 'filter' = 'highlight',
  numberIndex?: number
): Block {
  const binding: NarrativeBinding = {
    mapId,
    targetFeatureId: featureId,
    action,
    numberIndex,
  };
  return { ...block, binding };
}

export function unbindBlock(block: Block): Block {
  const { binding: _, ...rest } = block;
  return rest as Block;
}

export function findFeatureInMap(map: ProjectMap, featureId: string): MapFeature | null {
  for (const layer of map.layers || []) {
    const found = (layer.features || []).find((f) => f.id === featureId);
    if (found) return found;
  }
  return null;
}

export interface BindingValidationResult {
  valid: boolean;
  brokenCount: number;
  orphanBlockIds: string[];
  cleanPages: Page[];
}

export function validateNarrativeBindings(pages: Page[], maps: ProjectMap[]): BindingValidationResult {
  const mapIds = new Set(maps.map((m) => m.id));
  const featureIds = new Set<string>();

  maps.forEach((m) => {
    (m.layers || []).forEach((l) => {
      (l.features || []).forEach((f) => featureIds.add(f.id));
    });
  });

  let brokenCount = 0;
  const orphanBlockIds: string[] = [];

  const cleanPages = pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (!block.binding) return block;
      const { mapId, targetFeatureId } = block.binding;
      const mapExists = mapIds.has(mapId);
      const featureExists = !targetFeatureId || featureIds.has(targetFeatureId);

      if (!mapExists || !featureExists) {
        brokenCount++;
        orphanBlockIds.push(block.id);
        // Nettoyage défensif
        const { binding: _, ...unbound } = block;
        return unbound as Block;
      }
      return block;
    }),
  }));

  return {
    valid: brokenCount === 0,
    brokenCount,
    orphanBlockIds,
    cleanPages,
  };
}

