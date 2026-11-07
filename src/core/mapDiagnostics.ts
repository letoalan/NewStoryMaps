/**
 * StoryMap — Diagnostics structurés pour le cycle de vie MapLibre GL & WebGL
 */

import type { Map as MLMap } from 'maplibre-gl';

export function attachMapDiagnostics(
  map: MLMap,
  container: HTMLElement,
  componentName: 'Canvas' | 'Player' | 'MapStudio' | 'MapBlock',
  styleSource: unknown
): () => void {
  const prefix = `[StoryMap:${componentName}]`;
  const rect = container.getBoundingClientRect();
  const styleDesc = typeof styleSource === 'string' ? styleSource : 'Style Objet (Raster/OSM)';

  console.info(`${prefix} Initialisation MapLibre`, {
    containerSize: `${Math.round(rect.width)}x${Math.round(rect.height)}px`,
    clientSize: `${container.clientWidth}x${container.clientHeight}px`,
    style: styleDesc,
  });

  if (container.clientWidth === 0 || container.clientHeight === 0) {
    console.error(
      `${prefix} ALERTE : Le conteneur DOM a une taille nulle (${container.clientWidth}x${container.clientHeight}px) ! La carte sera invisible.`
    );
  }

  const onLoad = () => {
    const canvas = map.getCanvas();
    console.info(`${prefix} Événement 'load' reçu — Carte prête`, {
      canvasBuffer: `${canvas?.width}x${canvas?.height}px`,
      center: map.getCenter().toArray().map((n) => Number(n.toFixed(4))),
      zoom: Number(map.getZoom().toFixed(2)),
    });
    map.resize();
  };

  const onStyleLoad = () => {
    console.info(`${prefix} Événement 'style.load' reçu`);
  };

  const onError = (e: unknown) => {
    console.error(`${prefix} Erreur MapLibre / réseau :`, e);
  };

  map.on('load', onLoad);
  map.on('style.load', onStyleLoad);
  map.on('error', onError);

  const resizeObserver = new ResizeObserver(() => {
    if (!(map as any)._removed) {
      map.resize();
    }
  });
  resizeObserver.observe(container);

  return () => {
    resizeObserver.disconnect();
    map.off('load', onLoad);
    map.off('style.load', onStyleLoad);
    map.off('error', onError);
    console.info(`${prefix} Nettoyage et démontage de l'instance MapLibre`);
  };
}

