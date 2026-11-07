/**
 * StoryMap — Lecteur immersif de StoryMap (Player)
 */

import React, { useEffect, useRef, useState } from 'react';
import { Map as MLMap, Marker, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStory } from '../../context/StoryContext';
import { X } from 'lucide-react';
import { resolveMapStyle } from '../../types/map';
import { createRouteGeoJSON } from '../../core/route';
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
  const markerRef = useRef<Marker | null>(null);

  const steps = story?.steps || [];
  const currentStep = steps[currentIdx];

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !story || !currentStep) return;

    const map = new MLMap({
      container: mapContainerRef.current,
      style: resolveMapStyle(story.mapStyle),
      center: currentStep.camera.center,
      zoom: currentStep.camera.zoom,
      pitch: currentStep.camera.pitch,
      bearing: currentStep.camera.bearing,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map && story?.mapStyle) map.setStyle(resolveMapStyle(story.mapStyle));
  }, [story?.mapStyle]);

  // Tracé GeoJSON reliant les étapes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story) return;

    const routeData = createRouteGeoJSON(story.steps);
    const updateRoute = () => {
      const src = map.getSource('player-route') as GeoJSONSource;
      if (src) {
        src.setData(routeData);
      } else {
        map.addSource('player-route', { type: 'geojson', data: routeData });
        map.addLayer({
          id: 'player-route-line',
          type: 'line',
          source: 'player-route',
          paint: {
            'line-color': story.appearance.accentColor || '#0b7fb0',
            'line-width': 3,
            'line-dasharray': [2, 2],
          },
        });
      }
    };

    if (map.isStyleLoaded()) updateRoute();
    else map.once('style.load', updateRoute);
  }, [story?.steps, story?.mapStyle, story?.appearance.accentColor]);

  // Animation de caméra à chaque étape
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentStep) return;

    map.flyTo({
      center: currentStep.camera.center,
      zoom: currentStep.camera.zoom,
      pitch: currentStep.camera.pitch,
      bearing: currentStep.camera.bearing,
      duration: 1800,
      essential: true,
    });

    if (markerRef.current) markerRef.current.remove();
    markerRef.current = new Marker({ color: story?.appearance.accentColor || '#0b7fb0' })
      .setLngLat(currentStep.camera.center)
      .addTo(map);
  }, [currentIdx, currentStep, story?.appearance.accentColor]);

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
  }, [steps.length, onExit]);

  if (!story || steps.length === 0 || !currentStep) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {onExit && (
        <button
          className="btn btn-ghost btn-icon"
          onClick={onExit}
          style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20, background: 'var(--surface)' }}
          title="Quitter la lecture (Échap)"
        >
          <X size={20} />
        </button>
      )}

      <PlayerNarrative
        step={currentStep}
        index={currentIdx}
        total={steps.length}
        isPlaying={isPlaying}
        position={story.appearance.panelPosition}
        font={story.appearance.font}
        onPrev={prevStep}
        onNext={nextStep}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />
    </div>
  );
};
