/**
 * StoryMap — Diagnostics structurés pour le cycle de vie MapLibre GL & WebGL (C10 / C11)
 */

import type { Map as MLMap } from 'maplibre-gl';

export interface StoryMapDiagEntry {
  timestamp: number;
  component: 'Canvas' | 'Player' | 'MapStudio' | 'MapBlock';
  event: string;
  drawingBuffer?: string;
  canvasSize?: string;
  details?: Record<string, unknown>;
}

declare global {
  interface Window {
    __STORYMAP_DIAG__?: StoryMapDiagEntry[];
  }
}

export function logMapDiag(entry: StoryMapDiagEntry) {
  if (typeof window !== 'undefined') {
    if (!window.__STORYMAP_DIAG__) window.__STORYMAP_DIAG__ = [];
    window.__STORYMAP_DIAG__.push(entry);
    if (window.__STORYMAP_DIAG__.length > 100) window.__STORYMAP_DIAG__.shift();
  }
}

export function attachMapDiagnostics(
  map: MLMap,
  container: HTMLElement,
  componentName: 'Canvas' | 'Player' | 'MapStudio' | 'MapBlock',
  styleSource: unknown
): () => void {
  const prefix = `[StoryMap:${componentName}]`;
  const rect = container.getBoundingClientRect();
  const styleDesc = typeof styleSource === 'string' ? styleSource : 'Style Objet (Raster/OSM)';

  logMapDiag({
    timestamp: Date.now(), component: componentName, event: 'init',
    canvasSize: `${Math.round(rect.width)}x${Math.round(rect.height)}px`,
    details: { clientSize: `${container.clientWidth}x${container.clientHeight}px`, style: styleDesc },
  });

  if (container.clientWidth === 0 || container.clientHeight === 0) {
    console.warn(`${prefix} Avertissement : Le conteneur DOM a une taille nulle (${container.clientWidth}x${container.clientHeight}px).`);
  }

  const onLoad = () => {
    const canvas = map.getCanvas();
    const gl = (canvas?.getContext('webgl2') || canvas?.getContext('webgl')) as WebGLRenderingContext | null;
    const bufW = gl ? gl.drawingBufferWidth : canvas?.width;
    const bufH = gl ? gl.drawingBufferHeight : canvas?.height;

    logMapDiag({
      timestamp: Date.now(), component: componentName, event: 'load',
      drawingBuffer: `${bufW}x${bufH}px`, canvasSize: `${canvas?.width}x${canvas?.height}px`,
      details: { center: map.getCenter().toArray().map((n) => Number(n.toFixed(4))), zoom: Number(map.getZoom().toFixed(2)) },
    });
    map.resize();
  };

  const onStyleLoad = () => {
    logMapDiag({ timestamp: Date.now(), component: componentName, event: 'style.load' });
  };

  const onError = (e: unknown) => {
    console.error(`${prefix} Erreur MapLibre :`, e);
    logMapDiag({ timestamp: Date.now(), component: componentName, event: 'error', details: { error: String(e) } });
  };

  map.on('load', onLoad);
  map.on('style.load', onStyleLoad);
  map.on('error', onError);

  const resizeObserver = new ResizeObserver(() => {
    if (!(map as any)._removed) map.resize();
  });
  resizeObserver.observe(container);

  return () => {
    resizeObserver.disconnect();
    map.off('load', onLoad);
    map.off('style.load', onStyleLoad);
    map.off('error', onError);
    logMapDiag({ timestamp: Date.now(), component: componentName, event: 'destroy' });
  };
}
