/**
 * StoryMap — Lecteur plein écran interactif avec tracé multi-styles, marqueurs & diagnostics
 */

import React, { useState, useEffect, useRef } from 'react';
import { Map as MLMap, Marker, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStory } from '../../context/StoryContext';
import { resolveMapStyle } from '../../types/map';
import { createRouteGeoJSON, getRouteLayerConfig } from '../../core/route';
import { getRouteIconSVG, registerRouteIcon } from '../../core/mapIcons';
import { attachMapDiagnostics } from '../../core/mapDiagnostics';
import { createMarkerElement } from '../common/markerElement';
import { PlayerNarrative } from './PlayerNarrative';
import { RefreshCw, X } from 'lucide-react';

interface PlayerProps {
  onExit?: () => void;
}

export const Player: React.FC<PlayerProps> = ({ onExit }) => {
  const { story } = useStory();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const currentStyleRef = useRef<string>(story?.mapStyle || '');

  const steps = story?.steps.filter((s) => !s.hidden) || [];
  const currentStep = steps[currentIdx];

  // Initialisation carte avec diagnostics
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !story) return;
    container.innerHTML = '';

    const initialCamera = currentStep?.camera || { center: [2.3522, 48.8566], zoom: 10, pitch: 0, bearing: 0 };
    const resolvedStyle = resolveMapStyle(story.mapStyle);
    const map = new MLMap({
      container,
      style: resolvedStyle,
      center: initialCamera.center,
      zoom: initialCamera.zoom,
      pitch: initialCamera.pitch,
      bearing: initialCamera.bearing,
      interactive: true,
    });

    const detachDiagnostics = attachMapDiagnostics(map, container, 'Player', resolvedStyle);
    let isUnmounting = false;
    const canvas = map.getCanvas();
    const handleContextLost = (e: Event) => {
      if (isUnmounting) return;
      e.preventDefault();
      console.warn('[StoryMap:Player] Événement webglcontextlost détecté en cours d’exécution');
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      console.info('[StoryMap:Player] Événement webglcontextrestored reçu');
      setWebglLost(false);
    };
    canvas?.addEventListener('webglcontextlost', handleContextLost);
    canvas?.addEventListener('webglcontextrestored', handleContextRestored);

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

  // Style cartographique
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story?.mapStyle || (map as any)._removed) return;
    if (currentStyleRef.current === story.mapStyle) return;
    currentStyleRef.current = story.mapStyle;
    map.setStyle(resolveMapStyle(story.mapStyle));
  }, [story?.mapStyle]);

  // Tracé GeoJSON multi-styles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story) return;

    const rStyle = story.appearance.routeStyle || 'dashed';
    const rColor = story.appearance.routeColor || story.appearance.accentColor || '#0b7fb0';
    const routeData = createRouteGeoJSON(story.steps, { style: rStyle, color: rColor });
    const cfg = getRouteLayerConfig(rStyle, rColor);

    let isCancelled = false;
    const updateRoute = async () => {
      if (isCancelled || (map as any)._removed || !map.getCanvas()) return;
      const src = map.getSource('player-route') as GeoJSONSource;
      const layoutObj = cfg.layout || {};
      if (src) {
        src.setData(routeData);
      } else if (rStyle !== 'none') {
        map.addSource('player-route', { type: 'geojson', data: routeData });
      }

      if (map.getLayer('player-route-line')) map.removeLayer('player-route-line');
      if (rStyle !== 'none' && !isCancelled && !(map as any)._removed) {
        map.addLayer({ id: 'player-route-line', type: 'line', source: 'player-route', paint: cfg.paint as any, layout: layoutObj as any });
      }

      if (map.getLayer('player-route-symbols')) map.removeLayer('player-route-symbols');
      const iconSvg = getRouteIconSVG(rStyle, rColor);
      if (iconSvg && rStyle !== 'none' && !isCancelled) {
        const iconId = `p-icon-${rStyle}-${rColor.replace('#', '')}`;
        await registerRouteIcon(map, iconId, iconSvg);
        if (!isCancelled && !(map as any)._removed && !map.getLayer('player-route-symbols') && map.getSource('player-route')) {
          map.addLayer({
            id: 'player-route-symbols', type: 'symbol', source: 'player-route',
            layout: {
              'symbol-placement': 'line', 'symbol-spacing': rStyle === 'airplane' || rStyle === 'ship' ? 120 : 65,
              'icon-image': iconId, 'icon-size': rStyle === 'airplane' || rStyle === 'ship' ? 0.8 : 0.6,
              'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-rotation-alignment': 'map', 'icon-keep-upright': false,
            },
          });
        }
      }
    };

    const safeUpdate = () => { if (!isCancelled && !(map as any)._removed) updateRoute(); };
    if (map.isStyleLoaded()) safeUpdate(); else map.once('style.load', safeUpdate);
    return () => { isCancelled = true; };
  }, [story?.steps, story?.mapStyle, story?.appearance.routeStyle, story?.appearance.accentColor, story?.appearance.routeColor]);

  // Synchronisation caméra et marqueurs stylisés
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentStep || !story) return;

    map.flyTo({
      center: currentStep.camera.center, zoom: currentStep.camera.zoom,
      pitch: currentStep.camera.pitch, bearing: currentStep.camera.bearing, duration: 1800, essential: true,
    });

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const col = story.appearance.accentColor || '#0b7fb0';
    const shape = story.appearance.markerShape || 'pin';
    const showAll = story.appearance.showAllMarkers ?? true;

    steps.forEach((step, idx) => {
      const isActive = idx === currentIdx;
      if (!showAll && !isActive) return;

      const el = createMarkerElement({ shape, color: col, index: idx, isActive });
      const marker = new Marker({ element: el }).setLngLat(step.camera.center).addTo(map);
      if (!isActive) el.addEventListener('click', (e) => { e.stopPropagation(); setCurrentIdx(idx); });
      markersRef.current.push(marker);
    });
  }, [currentIdx, currentStep, story?.appearance.accentColor, story?.appearance.markerShape, story?.appearance.showAllMarkers, steps]);

  // Autoplay & Clavier
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => setCurrentIdx((p) => (p < steps.length - 1 ? p + 1 : 0)), story?.appearance.autoplayInterval || 5000);
    return () => clearInterval(interval);
  }, [isPlaying, steps.length, story?.appearance.autoplayInterval]);

  const nextStep = () => setCurrentIdx((p) => Math.min(steps.length - 1, p + 1));
  const prevStep = () => setCurrentIdx((p) => Math.max(0, p - 1));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextStep();
      else if (e.key === 'ArrowLeft') prevStep();
      else if (e.key === 'Escape' && onExit) onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit, steps.length]);

  return (
    <div className="player" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '480px', overflow: 'hidden' }}>
      <div ref={mapContainerRef} className="player-map" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {onExit && (
        <button className="btn btn-ghost btn-sm" onClick={onExit} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20, background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
          <X size={15} /> <span>Quitter</span>
        </button>
      )}
      {webglLost && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.92)', color: '#fff', padding: '16px', textAlign: 'center', gap: '10px' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>Le contexte WebGL 3D a été suspendu par le navigateur.</p>
          <button className="btn btn-primary btn-sm" onClick={() => { setWebglLost(false); setReloadKey((k) => k + 1); }}>
            <RefreshCw size={14} style={{ marginRight: '6px' }} /> Recharger la carte
          </button>
        </div>
      )}
      {currentStep && (
        <PlayerNarrative
          step={currentStep} index={currentIdx} total={steps.length} isPlaying={isPlaying}
          position={story?.appearance.panelPosition} font={story?.appearance.font}
          onPrev={prevStep} onNext={nextStep} onTogglePlay={() => setIsPlaying(!isPlaying)}
        />
      )}
    </div>
  );
};
