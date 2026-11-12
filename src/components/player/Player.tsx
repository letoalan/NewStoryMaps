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
import { buildSegmentPathCoords } from '../../core/route';
import { computeSegmentBearing, computeAdaptiveFlightDurationMs } from '../../core/routeInterpolation';
import { createVehicleController, createTwoLevelVehicleDomElement, VehicleController } from '../../core/vehicleController';
import { createFlightPlan } from '../../core/flightPlanner';
import { PlayerNarrative } from './PlayerNarrative';
import { RefreshCw, X } from 'lucide-react';

export const Player: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const { story } = useStory();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
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
    const handleContextLost = (e: Event) => { if (!isUnmounting) { e.preventDefault(); setWebglLost(true); } };
    const handleContextRestored = () => { setWebglLost(false); setReloadKey((k) => k + 1); };
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
    rebuildPlayerContents(map);

    vehicleCtrlRef.current?.destroy();
    vehicleMarkerRef.current?.remove();
    vehicleMarkerRef.current = null;

    const animCfg = currentStep.routeAnimation || story.routeAnimation;
    const rStyle = story.appearance?.routeStyle || 'dashed';
    const vColor = story.appearance?.accentColor || '#d97706';
    const reduced = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const hasVehicle = Boolean(animCfg && animCfg.enabled && animCfg.vehicle !== 'none');

    if (currentIdx > 0 && !reduced) {
      const prevCam = steps[currentIdx - 1].camera, nextCam = currentStep.camera;
      const coords = buildSegmentPathCoords(prevCam.center, nextCam.center, rStyle);
      const vp = { width: map.getContainer()?.clientWidth || 1024, height: map.getContainer()?.clientHeight || 768 };
      const plan = createFlightPlan(coords, prevCam, nextCam, vp, animCfg?.pace || 'normal', animCfg?.climbProfile || 'balanced');
      const initBrg = coords.length >= 2 ? computeSegmentBearing(coords[0], coords[1]) : 0;
      const effectiveCfg = animCfg || { enabled: true, vehicle: 'airplane', durationSec: 4 };
      const { wrapper, innerIcon } = createTwoLevelVehicleDomElement(document, effectiveCfg, vColor, initBrg);
      const mk = new Marker({ element: wrapper }).setLngLat(coords[0]).addTo(map);
      vehicleMarkerRef.current = mk;
      map.jumpTo({ center: coords[0], zoom: prevCam.zoom, pitch: prevCam.pitch, bearing: prevCam.bearing });

      const ctrl = createVehicleController({
        coords,
        config: { ...effectiveCfg, durationSec: plan.estimatedDurationMs / 1000, cameraFollow: effectiveCfg.cameraFollow !== false },
        prefersReducedMotion: reduced,
        onSample: (_s, state) => {
          const sample = plan.sampleAtProgress(ctrl.getProgress());
          mk.setLngLat(sample.coordinates);
          if (effectiveCfg.orientToRoute !== false) innerIcon.style.transform = `rotate(${sample.bearing}deg)`;
          if (ctrl.isCameraFollowActive()) {
            map.jumpTo({ center: sample.coordinates, zoom: sample.zoom, pitch: sample.pitch, bearing: sample.bearing });
          }
          if (state === 'completed' && ctrl.isCameraFollowActive()) {
            map.easeTo({ center: nextCam.center, zoom: nextCam.zoom, pitch: nextCam.pitch, bearing: nextCam.bearing, duration: 180 });
          }
        },
      });
      vehicleCtrlRef.current = ctrl;
      ctrl.play();
    } else {
      map.flyTo({
        center: currentStep.camera.center, zoom: currentStep.camera.zoom,
        pitch: currentStep.camera.pitch, bearing: currentStep.camera.bearing, essential: true, duration: reduced ? 0 : 1600,
      });
      if (hasVehicle && animCfg) {
        const nextCam = steps[currentIdx + 1]?.camera;
        const seg = nextCam ? buildSegmentPathCoords(currentStep.camera.center, nextCam.center, rStyle) : [currentStep.camera.center];
        const initBrg = seg.length >= 2 ? computeSegmentBearing(seg[0], seg[1]) : 0;
        const { wrapper } = createTwoLevelVehicleDomElement(document, animCfg, vColor, initBrg);
        vehicleMarkerRef.current = new Marker({ element: wrapper }).setLngLat(currentStep.camera.center).addTo(map);
      }
    }
  }, [currentIdx, currentStep?.camera, story?.appearance, story?.routeAnimation, rebuildPlayerContents]);

  useEffect(() => {
    if (!isPlaying) return;
    const baseWait = story?.appearance?.autoplayInterval || 5000;
    const prevCam = currentIdx > 0 ? steps[currentIdx - 1]?.camera : null;
    const flightMs = prevCam && currentStep?.camera ? computeAdaptiveFlightDurationMs(Math.hypot(currentStep.camera.center[0] - prevCam.center[0], currentStep.camera.center[1] - prevCam.center[1]), (currentStep.routeAnimation || story?.routeAnimation)?.durationSec || 4) : 0;
    const timer = setTimeout(() => {
      setCurrentIdx((prev) => {
        if (prev >= steps.length - 1) { setIsPlaying(false); return prev; }
        return prev + 1;
      });
    }, baseWait + flightMs);
    return () => clearTimeout(timer);
  }, [isPlaying, currentIdx, steps.length, story?.appearance?.autoplayInterval]);

  const tok = story?.themeTokens;
  return (
    <div className="player" style={{ '--charter-primary': tok?.primaryColor, '--charter-secondary': tok?.secondaryColor, '--charter-text': tok?.textColor, '--charter-background': tok?.pageBackground, '--charter-surface': tok?.surfaceBackground } as React.CSSProperties}>
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
