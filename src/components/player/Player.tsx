/**
 * StoryMap — Lecteur plein écran interactif avec tracé multi-styles, véhicule animé (N4) & diagnostics
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStory } from '../../context/StoryContext';
import { resolveMapStyle } from '../../types/map';
import { attachMapDiagnostics } from '../../core/mapDiagnostics';
import { syncRouteLayer, syncCanvasMarkers } from '../../core/canvasLayers';
import { createVehicleController, createTwoLevelVehicleDomElement, VehicleController } from '../../core/vehicleController';
import { PlayerNarrative } from './PlayerNarrative';
import { RefreshCw, X } from 'lucide-react';

export const Player: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const { story } = useStory();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const vehicleMarkerRef = useRef<Marker | null>(null);
  const vehicleCtrlRef = useRef<VehicleController | null>(null);
  const currentStyleRef = useRef<string>(story?.mapStyle || '');

  const steps = story?.steps.filter((s) => !s.hidden) || [];
  const currentStep = steps[currentIdx];

  const rebuildPlayerContents = useCallback((map: MLMap) => {
    if (!story || (map as any)._removed) return;
    syncRouteLayer(map, story.steps, story.appearance, 'player-route').catch(() => {});
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = syncCanvasMarkers(map, story.steps, currentIdx, story.appearance, (idx) => setCurrentIdx(idx));
  }, [story, currentIdx]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !story) return;
    container.innerHTML = '';

    const initialCamera = currentStep?.camera || { center: [2.3522, 48.8566], zoom: 10, pitch: 0, bearing: 0 };
    const resolvedStyle = resolveMapStyle(story.mapStyle);
    const map = new MLMap({
      container, style: resolvedStyle, center: initialCamera.center, zoom: initialCamera.zoom,
      pitch: initialCamera.pitch, bearing: initialCamera.bearing, interactive: true,
    });

    const detachDiagnostics = attachMapDiagnostics(map, container, 'Player', resolvedStyle);
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

    map.on('dragstart', () => vehicleCtrlRef.current?.notifyUserMapInteraction());
    map.on('zoomstart', () => vehicleCtrlRef.current?.notifyUserMapInteraction());
    map.on('load', () => rebuildPlayerContents(map));
    mapRef.current = map;

    return () => {
      isUnmounting = true;
      detachDiagnostics();
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      canvas?.removeEventListener('webglcontextrestored', handleContextRestored);
      vehicleCtrlRef.current?.destroy();
      vehicleMarkerRef.current?.remove();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [reloadKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story?.mapStyle || (map as any)._removed) return;
    if (currentStyleRef.current === story.mapStyle) return;
    currentStyleRef.current = story.mapStyle;
    map.setStyle(resolveMapStyle(story.mapStyle));
    map.once('style.load', () => rebuildPlayerContents(map));
  }, [story?.mapStyle, rebuildPlayerContents]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story || !currentStep || (map as any)._removed) return;
    map.flyTo({
      center: currentStep.camera.center, zoom: currentStep.camera.zoom,
      pitch: currentStep.camera.pitch, bearing: currentStep.camera.bearing, essential: true, duration: 1600,
    });
    rebuildPlayerContents(map);

    vehicleCtrlRef.current?.destroy();
    vehicleMarkerRef.current?.remove();
    vehicleMarkerRef.current = null;

    const animCfg = currentStep.routeAnimation || story.routeAnimation;
    if (animCfg && animCfg.enabled && animCfg.vehicle !== 'none' && currentIdx > 0) {
      const prevStep = steps[currentIdx - 1];
      const coords: Array<[number, number]> = [prevStep.camera.center, currentStep.camera.center];
      const { wrapper, innerIcon } = createTwoLevelVehicleDomElement(
        document,
        animCfg,
        story.appearance?.accentColor || '#d97706',
        0
      );
      const mk = new Marker({ element: wrapper }).setLngLat(coords[0]).addTo(map);
      vehicleMarkerRef.current = mk;
      const reduced = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
      const ctrl = createVehicleController({
        coords,
        config: animCfg,
        prefersReducedMotion: reduced,
        onSample: (sample) => {
          mk.setLngLat(sample.coordinates);
          if (animCfg.orientToRoute !== false) {
            innerIcon.style.transform = `rotate(${sample.bearing}deg)`;
          }
        },
      });
      vehicleCtrlRef.current = ctrl;
      ctrl.play();
    }
  }, [currentIdx, currentStep?.camera, story?.appearance, rebuildPlayerContents]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => {
        if (prev >= steps.length - 1) { setIsPlaying(false); return prev; }
        return prev + 1;
      });
    }, story?.appearance?.autoplayInterval || 5000);
    return () => clearInterval(timer);
  }, [isPlaying, steps.length, story?.appearance?.autoplayInterval]);

  return (
    <div className="player">
      <div ref={mapContainerRef} className="player-canvas" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {webglLost && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.92)', color: '#fff', padding: '16px', textAlign: 'center', gap: '10px' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>Le contexte 3D WebGL a été suspendu par le navigateur.</p>
          <button className="btn btn-primary btn-sm" onClick={() => { setWebglLost(false); setReloadKey((k) => k + 1); }}>
            <RefreshCw size={14} style={{ marginRight: '6px' }} /> Recharger le lecteur
          </button>
        </div>
      )}
      {onExit && (
        <button className="btn btn-ghost btn-icon player-close" onClick={onExit} title="Quitter la lecture (Échap)" style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 30, background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
          <X size={20} />
        </button>
      )}
      {currentStep && (
        <PlayerNarrative
          step={currentStep} index={currentIdx} total={steps.length} story={story}
          isPlaying={isPlaying} onNext={() => setCurrentIdx((i) => Math.min(steps.length - 1, i + 1))}
          onPrev={() => setCurrentIdx((i) => Math.max(0, i - 1))} onTogglePlay={() => setIsPlaying(!isPlaying)}
        />
      )}
    </div>
  );
};
