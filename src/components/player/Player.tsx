/**
 * StoryMap — Lecteur plein écran interactif avec tracé multi-styles & marqueurs stylisés
 */

import React, { useState, useEffect, useRef } from 'react';
import { Map as MLMap, Marker, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStory } from '../../context/StoryContext';
import { resolveMapStyle } from '../../types/map';
import { createRouteGeoJSON, getRouteLayerConfig } from '../../core/route';
import { createMarkerElement } from '../common/markerElement';
import { PlayerNarrative } from './PlayerNarrative';

interface PlayerProps {
  onExit?: () => void;
}

export const Player: React.FC<PlayerProps> = ({ onExit }) => {
  const { story } = useStory();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const steps = story?.steps.filter((s) => !s.hidden) || [];
  const currentStep = steps[currentIdx];

  // Initialisation carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !story) return;

    const initialCamera = currentStep?.camera || { center: [2.3522, 48.8566], zoom: 10, pitch: 0, bearing: 0 };
    const map = new MLMap({
      container: mapContainerRef.current,
      style: resolveMapStyle(story.mapStyle),
      center: initialCamera.center,
      zoom: initialCamera.zoom,
      pitch: initialCamera.pitch,
      bearing: initialCamera.bearing,
      interactive: true,
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Style cartographique
  useEffect(() => {
    const map = mapRef.current;
    if (map && story?.mapStyle) map.setStyle(resolveMapStyle(story.mapStyle));
  }, [story?.mapStyle]);

  // Tracé GeoJSON multi-styles (pleine, pointillée, incurvée, avion, navire...)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story) return;

    const rStyle = story.appearance.routeStyle || 'dashed';
    const rColor = story.appearance.routeColor || story.appearance.accentColor || '#0b7fb0';
    const routeData = createRouteGeoJSON(story.steps, { style: rStyle, color: rColor });
    const cfg = getRouteLayerConfig(rStyle, rColor);

    const updateRoute = () => {
      const src = map.getSource('player-route') as GeoJSONSource;
      const layoutObj = cfg.layout || {};
      if (src) {
        src.setData(routeData);
        if (map.getLayer('player-route-line')) {
          map.removeLayer('player-route-line');
          map.addLayer({ id: 'player-route-line', type: 'line', source: 'player-route', paint: cfg.paint as any, layout: layoutObj as any });
        }
      } else if (rStyle !== 'none') {
        map.addSource('player-route', { type: 'geojson', data: routeData });
        map.addLayer({ id: 'player-route-line', type: 'line', source: 'player-route', paint: cfg.paint as any, layout: layoutObj as any });
      }
    };

    if (map.isStyleLoaded()) updateRoute(); else map.once('style.load', updateRoute);
  }, [story?.steps, story?.mapStyle, story?.appearance.routeStyle, story?.appearance.accentColor, story?.appearance.routeColor]);

  // Synchronisation caméra et marqueurs stylisés
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentStep || !story) return;

    map.flyTo({
      center: currentStep.camera.center,
      zoom: currentStep.camera.zoom,
      pitch: currentStep.camera.pitch,
      bearing: currentStep.camera.bearing,
      duration: 1800,
      essential: true,
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
      const marker = new Marker({ element: el })
        .setLngLat(step.camera.center)
        .addTo(map);

      if (!isActive) {
        el.addEventListener('click', (e) => { e.stopPropagation(); setCurrentIdx(idx); });
      }

      markersRef.current.push(marker);
    });
  }, [currentIdx, currentStep, story?.appearance.accentColor, story?.appearance.markerShape, story?.appearance.showAllMarkers, steps]);

  // Autoplay
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev < steps.length - 1 ? prev + 1 : 0));
    }, story?.appearance.autoplayInterval || 5000);
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
    <div className="player">
      <div ref={mapContainerRef} className="player-map" />
      {currentStep && (
        <PlayerNarrative
          step={currentStep}
          index={currentIdx}
          total={steps.length}
          isPlaying={isPlaying}
          position={story?.appearance.panelPosition}
          font={story?.appearance.font}
          onPrev={prevStep}
          onNext={nextStep}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
        />
      )}
    </div>
  );
};
