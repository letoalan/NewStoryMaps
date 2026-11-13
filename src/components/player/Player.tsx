/**
 * StoryMap — Lecteur plein écran interactif avec passage automatique et traversée unique
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStory } from '../../context/StoryContext';
import { resolveMapStyle } from '../../types/map';
import { attachMapDiagnostics } from '../../core/mapDiagnostics';
import { syncRouteLayer, syncCanvasMarkers } from '../../core/canvasLayers';
import { buildSegmentPathCoords } from '../../core/route';
import { computeSegmentBearing } from '../../core/routeInterpolation';
import { createVehicleController, createTwoLevelVehicleDomElement, VehicleController } from '../../core/vehicleController';
import { createStoryLegPath } from '../../core/storyCameraPath';
import { PlayerNarrative, PlayerTransferState } from './PlayerNarrative';
import { RefreshCw, X } from 'lucide-react';

export const Player: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const { story } = useStory();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [transfer, setTransfer] = useState<PlayerTransferState | null>(null);
  const [webglLost, setWebglLost] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null), mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]), vehicleMarkerRef = useRef<Marker | null>(null);
  const vehicleCtrlRef = useRef<VehicleController | null>(null), currentStyleRef = useRef<string>(story?.mapStyle || '');
  const steps = story?.steps.filter((s) => !s.hidden) || [];
  const currentStep = steps[currentIdx];

  const rebuildPlayerContents = useCallback((map: MLMap, activeIdx: number) => {
    if (!story || (map as any)._removed) return;
    syncRouteLayer(map, story.steps, story.appearance, 'player-route').catch(() => {});
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = syncCanvasMarkers(map, story.steps, activeIdx, story.appearance, (idx) => {
      vehicleCtrlRef.current?.destroy(); setTransfer(null); setCurrentIdx(idx);
    });
  }, [story]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !story) return;
    container.innerHTML = '';
    const initCam = currentStep?.camera || { center: [2.3522, 48.8566], zoom: 10, pitch: 0, bearing: 0 };
    const resolvedStyle = resolveMapStyle(story.mapStyle);
    const map = new MLMap({
      container, style: resolvedStyle, center: initCam.center, zoom: initCam.zoom,
      pitch: initCam.pitch, bearing: 0, interactive: true,
    });
    const detachDiagnostics = attachMapDiagnostics(map, container, 'Player', resolvedStyle);
    let isUnmounting = false;
    const canvas = map.getCanvas();
    const handleContextLost = (e: Event) => { if (!isUnmounting) { e.preventDefault(); setWebglLost(true); } };
    const handleContextRestored = () => { setWebglLost(false); setReloadKey((k) => k + 1); };
    canvas?.addEventListener('webglcontextlost', handleContextLost);
    canvas?.addEventListener('webglcontextrestored', handleContextRestored);
    const onUserInteract = (e: any) => { if (e?.originalEvent) vehicleCtrlRef.current?.notifyUserMapInteraction(); };
    map.on('dragstart', onUserInteract); map.on('zoomstart', onUserInteract);
    map.on('load', () => rebuildPlayerContents(map, currentIdx));
    mapRef.current = map;
    return () => {
      isUnmounting = true; detachDiagnostics();
      canvas?.removeEventListener('webglcontextlost', handleContextLost);
      canvas?.removeEventListener('webglcontextrestored', handleContextRestored);
      vehicleCtrlRef.current?.destroy(); vehicleMarkerRef.current?.remove();
      markersRef.current.forEach((m) => m.remove()); markersRef.current = [];
      map.remove(); mapRef.current = null;
    };
  }, [reloadKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story?.mapStyle || (map as any)._removed || currentStyleRef.current === story.mapStyle) return;
    currentStyleRef.current = story.mapStyle;
    map.setStyle(resolveMapStyle(story.mapStyle));
    map.once('style.load', () => rebuildPlayerContents(map, currentIdx));
  }, [story?.mapStyle, rebuildPlayerContents, currentIdx]);

  const startTransfer = useCallback((targetIdx: number) => {
    const map = mapRef.current;
    if (!map || !story || targetIdx < 0 || targetIdx >= steps.length) return;
    const fromStep = steps[currentIdx], toStep = steps[targetIdx];
    const animCfg = toStep.routeAnimation || story.routeAnimation;
    const rStyle = story.appearance?.routeStyle || 'dashed', vColor = story.appearance?.accentColor || '#d97706';
    const reduced = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const hasVehicle = Boolean(animCfg && animCfg.enabled && animCfg.vehicle !== 'none');

    vehicleCtrlRef.current?.destroy(); vehicleMarkerRef.current?.remove(); vehicleMarkerRef.current = null;
    if (!reduced && hasVehicle) {
      setTransfer({ fromStep, toStep, progress: 0 });
      const coords = buildSegmentPathCoords(fromStep.camera.center, toStep.camera.center, rStyle);
      const vp = map.getContainer()?.clientWidth || 1024;
      const leg = createStoryLegPath(coords, fromStep.camera, toStep.camera, vp, animCfg?.pace);
      const initBrg = coords.length >= 2 ? computeSegmentBearing(coords[0], coords[1]) : 0;
      const effectiveCfg = animCfg || { enabled: true, vehicle: 'airplane', durationSec: leg.durationMs / 1000 };
      const { wrapper, innerIcon } = createTwoLevelVehicleDomElement(document, effectiveCfg, vColor, initBrg);
      const mk = new Marker({ element: wrapper }).setLngLat(coords[0]).addTo(map);
      vehicleMarkerRef.current = mk;
      map.jumpTo({ center: coords[0], zoom: fromStep.camera.zoom, pitch: fromStep.camera.pitch || 0, bearing: 0 });

      let finished = false;
      const ctrl = createVehicleController({
        coords,
        config: { ...effectiveCfg, loop: false, durationSec: leg.durationMs / 1000, cameraFollow: effectiveCfg.cameraFollow !== false },
        prefersReducedMotion: reduced,
        onSample: (_s, state) => {
          if (finished) return;
          const progress = ctrl.getProgress();
          const sample = leg.sampleAtProgress(progress);
          mk.setLngLat(sample.coordinates);
          if (effectiveCfg.orientToRoute !== false) innerIcon.style.transform = `rotate(${sample.heading}deg)`;
          if (ctrl.isCameraFollowActive()) map.jumpTo({ center: sample.coordinates, zoom: sample.zoom, pitch: sample.pitch, bearing: 0 });
          setTransfer({ fromStep, toStep, progress });
          if (state === 'completed' || progress >= 1) {
            finished = true;
            ctrl.destroy();
            vehicleCtrlRef.current = null;
            if (ctrl.isCameraFollowActive()) {
              map.easeTo({ center: toStep.camera.center, zoom: toStep.camera.zoom, pitch: toStep.camera.pitch || 0, bearing: 0, duration: 180 });
            }
            setTransfer(null);
            setCurrentIdx(targetIdx);
          }
        },
      });
      vehicleCtrlRef.current = ctrl; ctrl.play();
    } else {
      map.flyTo({ center: toStep.camera.center, zoom: toStep.camera.zoom, pitch: toStep.camera.pitch || 0, bearing: 0, essential: true, duration: reduced ? 0 : 1600 });
      setTransfer(null); setCurrentIdx(targetIdx);
    }
  }, [currentIdx, steps, story]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story || !currentStep || transfer) return;
    rebuildPlayerContents(map, currentIdx);
    const animCfg = currentStep.routeAnimation || story.routeAnimation;
    const vColor = story.appearance?.accentColor || '#d97706';
    if (animCfg && animCfg.enabled && animCfg.vehicle !== 'none' && !vehicleMarkerRef.current) {
      const { wrapper } = createTwoLevelVehicleDomElement(document, animCfg, vColor, 0);
      vehicleMarkerRef.current = new Marker({ element: wrapper }).setLngLat(currentStep.camera.center).addTo(map);
    }
  }, [currentIdx, currentStep, transfer, story, rebuildPlayerContents]);

  // Enchaînement automatique : à la fin du temps d'étape statique, traversée unique vers l'étape suivante
  useEffect(() => {
    if (!isPlaying || transfer) return;
    const dwell = story?.appearance?.autoplayInterval || 5000;
    const timer = setTimeout(() => {
      if (currentIdx < steps.length - 1) startTransfer(currentIdx + 1);
      else setIsPlaying(false);
    }, dwell);
    return () => clearTimeout(timer);
  }, [isPlaying, transfer, currentIdx, steps.length, story?.appearance?.autoplayInterval, startTransfer]);

  const handleNext = () => {
    if (transfer) { vehicleCtrlRef.current?.destroy(); setTransfer(null); setCurrentIdx(steps.indexOf(transfer.toStep)); }
    else if (currentIdx < steps.length - 1) startTransfer(currentIdx + 1);
  };
  const handlePrev = () => {
    if (transfer) { vehicleCtrlRef.current?.destroy(); setTransfer(null); }
    else if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  const tok = story?.themeTokens;
  return (
    <div className="player" style={{ '--charter-primary': tok?.primaryColor, '--charter-secondary': tok?.secondaryColor, '--charter-text': tok?.textColor, '--charter-background': tok?.pageBackground, '--charter-surface': tok?.surfaceBackground } as React.CSSProperties}>
      <div ref={mapContainerRef} className="player-canvas" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {webglLost && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.92)', color: '#fff', padding: '16px', textAlign: 'center', gap: '10px' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>Le contexte 3D WebGL a été suspendu par le navigateur.</p>
          <button className="btn btn-primary btn-sm" onClick={() => { setWebglLost(false); setReloadKey((k) => k + 1); }}><RefreshCw size={14} style={{ marginRight: '6px' }} /> Recharger le lecteur</button>
        </div>
      )}
      {onExit && (
        <button className="btn btn-ghost btn-icon player-close" onClick={onExit} title="Quitter la lecture (Échap)" style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 30, background: 'rgba(0,0,0,0.5)', color: '#fff' }}><X size={20} /></button>
      )}
      {currentStep && (
        <PlayerNarrative
          step={currentStep} index={currentIdx} total={steps.length} isPlaying={isPlaying} transfer={transfer}
          onNext={handleNext} onPrev={handlePrev} onTogglePlay={() => setIsPlaying(!isPlaying)} story={story}
        />
      )}
    </div>
  );
};
