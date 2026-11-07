/**
 * StoryMap — Canevas de carte interactif MapLibre GL
 */

import React, { useEffect, useRef, useState } from 'react';
import { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStory } from '../../context/StoryContext';
import { Compass, Camera, ZoomIn, ZoomOut, Search, MapPin } from 'lucide-react';
import { searchPlaces, GeoSearchResult } from '../../core/geocoder';
import { resolveMapStyle } from '../../types/map';

export const Canvas: React.FC = () => {
  const { story, activeStepIndex, updateStep } = useStory();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoSearchResult[]>([]);

  const currentStep = story?.steps[activeStepIndex];

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !story) return;

    const initialCamera = currentStep?.camera || {
      center: [2.3522, 48.8566],
      zoom: 12,
      pitch: 0,
      bearing: 0,
    };

    const map = new MLMap({
      container: mapContainerRef.current,
      style: resolveMapStyle(story.mapStyle),
      center: initialCamera.center,
      zoom: initialCamera.zoom,
      pitch: initialCamera.pitch,
      bearing: initialCamera.bearing,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Synchronisation dynamique du style vectoriel ou satellite
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story?.mapStyle) return;
    map.setStyle(resolveMapStyle(story.mapStyle));
  }, [story?.mapStyle]);

  // Synchronisation lors du changement d'étape
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentStep) return;

    map.flyTo({
      center: currentStep.camera.center,
      zoom: currentStep.camera.zoom,
      pitch: currentStep.camera.pitch,
      bearing: currentStep.camera.bearing,
      essential: true,
      duration: 1400,
    });

    if (markerRef.current) markerRef.current.remove();
    const marker = new Marker({ color: '#0b7fb0', draggable: true })
      .setLngLat(currentStep.camera.center)
      .addTo(map);

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      updateStep(activeStepIndex, {
        camera: { ...currentStep.camera, center: [lngLat.lng, lngLat.lat] },
      });
    });

    markerRef.current = marker;
  }, [activeStepIndex, currentStep?.camera]);

  const handleCaptureView = () => {
    const map = mapRef.current;
    if (!map || !currentStep) return;

    const center = map.getCenter();
    updateStep(activeStepIndex, {
      camera: {
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      },
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelectPlace = (place: GeoSearchResult) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [place.lng, place.lat], zoom: 12 });
    updateStep(activeStepIndex, {
      camera: {
        center: [place.lng, place.lat],
        zoom: 12,
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      },
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <main className="canvas">
      <div className="canvas-toolbar">
        <span className="canvas-label">
          Étape <strong>{activeStepIndex + 1}</strong> : {currentStep?.title || 'Sans titre'}
        </span>

        {/* Barre de recherche de lieu */}
        <form onSubmit={handleSearch} style={{ position: 'relative', width: '260px' }}>
          <div className="input-affix">
            <Search size={14} className="icon" />
            <input
              type="text"
              className="input input-sm"
              placeholder="Chercher un lieu, une ville…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="geo-results open" style={{ top: '34px', width: '320px' }}>
              {searchResults.map((r, i) => (
                <div key={i} className="geo-item" onClick={() => handleSelectPlace(r)}>
                  <MapPin size={14} className="icon" />
                  <div className="geo-text">
                    <div className="geo-label">{r.name}</div>
                    <div className="geo-sub">{r.displayName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </form>

        <div className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={handleCaptureView}>
          <Camera size={15} />
          <span>Capturer cette vue</span>
        </button>
      </div>

      <div className="canvas-stage" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Contrôles HUD de la carte */}
        <div style={{ position: 'absolute', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() || 10) + 1 })}>
            <ZoomIn size={18} />
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() || 10) - 1 })}>
            <ZoomOut size={18} />
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 0 })}>
            <Compass size={18} />
          </button>
        </div>
      </div>
    </main>
  );
};
