/**
 * StoryMap — Canevas de carte interactif MapLibre GL avec tracé multi-styles, marqueurs & diagnostics (C10/C11)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStory } from '../../context/StoryContext';
import { Compass, Camera, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { resolveMapStyle } from '../../types/map';
import { attachMapDiagnostics } from '../../core/mapDiagnostics';
import { syncRouteLayer, syncCanvasMarkers } from '../../core/canvasLayers';
import { GeocoderSearch } from './GeocoderSearch';
import { GeoSearchResult } from '../../core/geocoder';

export const Canvas: React.FC = () => {
  const { story, activeStepIndex, setActiveStepIndex, updateStep } = useStory();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const currentStyleRef = useRef<string>(story?.mapStyle || '');
  const [webglLost, setWebglLost] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const currentStep = story?.steps[activeStepIndex];

  // Reconstitution complète de la carte, du style, des couches et des marqueurs
  const rebuildAllContents = useCallback((map: MLMap) => {
    if (!story || (map as any)._removed) return;
    syncRouteLayer(map, story.steps, story.appearance).catch(() => {});
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = syncCanvasMarkers(
      map, story.steps, activeStepIndex, story.appearance,
      (idx) => setActiveStepIndex(idx),
      (coords) => {
        if (currentStep) updateStep(activeStepIndex, { camera: { ...currentStep.camera, center: coords } });
      }
    );
  }, [story, activeStepIndex, currentStep?.camera, setActiveStepIndex, updateStep]);

  // Cycle de vie de l'instance MapLibre
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !story) return;
    container.innerHTML = '';

    const initialCamera = currentStep?.camera || { center: [2.3522, 48.8566], zoom: 12, pitch: 0, bearing: 0 };
    const resolvedStyle = resolveMapStyle(story.mapStyle);
    const map = new MLMap({
      container,
      style: resolvedStyle,
      center: initialCamera.center,
      zoom: initialCamera.zoom,
      pitch: initialCamera.pitch,
      bearing: initialCamera.bearing,
    });

    const detachDiagnostics = attachMapDiagnostics(map, container, 'Canvas', resolvedStyle);
    let isUnmounting = false;
    const canvas = map.getCanvas();
    const handleContextLost = (e: Event) => {
      if (isUnmounting) return;
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
      setReloadKey((k) => k + 1);
    };
    canvas?.addEventListener('webglcontextlost', handleContextLost);
    canvas?.addEventListener('webglcontextrestored', handleContextRestored);

    map.on('load', () => rebuildAllContents(map));
    mapRef.current = map;

    return () => {
      isUnmounting = true;
      detachDiagnostics();
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      canvas?.removeEventListener('webglcontextrestored', handleContextRestored);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [reloadKey]);

  // Synchronisation dynamique du style de fond
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story?.mapStyle || (map as any)._removed) return;
    if (currentStyleRef.current === story.mapStyle) return;
    currentStyleRef.current = story.mapStyle;
    map.setStyle(resolveMapStyle(story.mapStyle));
    map.once('style.load', () => rebuildAllContents(map));
  }, [story?.mapStyle, rebuildAllContents]);

  // Synchronisation caméra et marqueurs stylisés
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story || !currentStep || (map as any)._removed) return;
    map.flyTo({
      center: currentStep.camera.center, zoom: currentStep.camera.zoom,
      pitch: currentStep.camera.pitch, bearing: currentStep.camera.bearing, essential: true, duration: 1200,
    });
    rebuildAllContents(map);
  }, [activeStepIndex, currentStep?.camera, story?.appearance, rebuildAllContents, reloadKey]);

  const handleCaptureView = () => {
    const map = mapRef.current;
    if (!map || !currentStep) return;
    const center = map.getCenter();
    updateStep(activeStepIndex, { camera: { center: [center.lng, center.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() } });
  };

  const handleSelectPlace = (r: GeoSearchResult) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [r.lng, r.lat], zoom: 13, essential: true });
    updateStep(activeStepIndex, { camera: { ...currentStep?.camera, center: [r.lng, r.lat], zoom: 13, pitch: 0, bearing: 0 } });
  };

  return (
    <main className="canvas">
      <div className="canvas-toolbar">
        <span className="canvas-label">Étape <strong>{activeStepIndex + 1}</strong> : {currentStep?.title || 'Sans titre'}</span>
        <GeocoderSearch onSelectPlace={handleSelectPlace} />
        <div className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={handleCaptureView} title="Capturer la vue actuelle pour cette étape">
          <Camera size={15} /> <span>Capturer cette vue</span>
        </button>
      </div>

      <div className="canvas-stage" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        {webglLost && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.92)', color: '#fff', padding: '16px', textAlign: 'center', gap: '10px' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>Le contexte 3D WebGL a été suspendu par le navigateur.</p>
            <button className="btn btn-primary btn-sm" onClick={() => { setWebglLost(false); setReloadKey((k) => k + 1); }}>
              <RefreshCw size={14} style={{ marginRight: '6px' }} /> Recharger la carte
            </button>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() || 10) + 1 })}><ZoomIn size={18} /></button>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() || 10) - 1 })}><ZoomOut size={18} /></button>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 0 })}><Compass size={18} /></button>
        </div>
      </div>
    </main>
  );
};
