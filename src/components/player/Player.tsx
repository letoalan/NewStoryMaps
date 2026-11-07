/**
 * StoryMap — Lecteur immersif de StoryMap (Player)
 */

import React, { useEffect, useRef, useState } from 'react';
import { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStory } from '../../context/StoryContext';
import { ChevronLeft, ChevronRight, Play, Pause, X } from 'lucide-react';
import { resolveMapStyle } from '../../types/map';

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

  // Animation de caméra à chaque étape
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentStep) return;

    map.flyTo({
      center: currentStep.camera.center,
      zoom: currentStep.camera.zoom,
      pitch: currentStep.camera.pitch,
      bearing: currentStep.camera.bearing,
      duration: 2000,
      essential: true,
    });

    if (markerRef.current) markerRef.current.remove();
    markerRef.current = new Marker({ color: '#0b7fb0' })
      .setLngLat(currentStep.camera.center)
      .addTo(map);
  }, [currentIdx, currentStep]);

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

  if (!story || steps.length === 0) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Bouton Quitter */}
      {onExit && (
        <button
          className="btn btn-ghost btn-icon"
          onClick={onExit}
          style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20, background: 'var(--surface)' }}
          title="Quitter la lecture"
        >
          <X size={20} />
        </button>
      )}

      {/* Panneau latéral du récit */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          bottom: '20px',
          width: 'min(420px, calc(100vw - 40px))',
          background: 'var(--surface)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="badge badge-accent">
            Étape {currentIdx + 1} sur {steps.length}
          </span>
          <h2 style={{ margin: '8px 0 0', fontSize: '18px', fontWeight: 700 }}>
            {currentStep.title}
          </h2>
        </div>

        <div className="scroll" style={{ flex: 1, padding: '20px' }}>
          {currentStep.media?.url && (
            <div style={{ marginBottom: '16px' }}>
              <img
                src={currentStep.media.url}
                alt={currentStep.title}
                style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
              />
              {currentStep.media.caption && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                  {currentStep.media.caption}
                </p>
              )}
            </div>
          )}

          <div
            style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text)' }}
            dangerouslySetInnerHTML={{ __html: currentStep.description }}
          />
        </div>

        {/* Barre de navigation */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-2)',
          }}
        >
          <button className="btn btn-ghost btn-icon" onClick={prevStep} disabled={currentIdx === 0}>
            <ChevronLeft size={20} />
          </button>

          <button
            className="btn btn-ghost"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ gap: '6px' }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span>{isPlaying ? 'Pause' : 'Lecture auto'}</span>
          </button>

          <button
            className="btn btn-ghost btn-icon"
            onClick={nextStep}
            disabled={currentIdx === steps.length - 1}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

