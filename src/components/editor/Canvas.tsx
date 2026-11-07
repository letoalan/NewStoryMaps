/**
 * StoryMap — Canevas de carte interactif MapLibre GL
 */

import React, { useEffect, useRef } from 'react';
import { Map as MLMap, Marker, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStory } from '../../context/StoryContext';
import { Compass, Camera, ZoomIn, ZoomOut } from 'lucide-react';
import { resolveMapStyle } from '../../types/map';
import { createRouteGeoJSON } from '../../core/route';
import { GeocoderSearch } from './GeocoderSearch';
import { GeoSearchResult } from '../../core/geocoder';

export const Canvas: React.FC = () => {
  const { story, activeStepIndex, updateStep } = useStory();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

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
    if (map && story?.mapStyle) {
      map.setStyle(resolveMapStyle(story.mapStyle));
    }
  }, [story?.mapStyle]);

  // Synchronisation de la caméra et du marqueur
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
    const marker = new Marker({ color: story?.appearance.accentColor || '#0b7fb0', draggable: true })
      .setLngLat(currentStep.camera.center)
      .addTo(map);

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      updateStep(activeStepIndex, {
        camera: { ...currentStep.camera, center: [lngLat.lng, lngLat.lat] },
      });
    });

    markerRef.current = marker;
  }, [activeStepIndex, currentStep?.camera, story?.appearance.accentColor]);

  // Tracé GeoJSON de parcours reliant les étapes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story) return;

    const routeData = createRouteGeoJSON(story.steps);

    const updateRoute = () => {
      const src = map.getSource('story-route') as GeoJSONSource;
      if (src) {
        src.setData(routeData);
      } else {
        map.addSource('story-route', { type: 'geojson', data: routeData });
        map.addLayer({
          id: 'story-route-line',
          type: 'line',
          source: 'story-route',
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

  const handleSelectPlace = (r: GeoSearchResult) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [r.lng, r.lat], zoom: 13, essential: true });
    updateStep(activeStepIndex, {
      camera: { ...currentStep?.camera, center: [r.lng, r.lat], zoom: 13, pitch: 0, bearing: 0 },
    });
  };

  return (
    <main className="canvas">
      <div className="canvas-toolbar">
        <span className="canvas-label">
          Étape <strong>{activeStepIndex + 1}</strong> : {currentStep?.title || 'Sans titre'}
        </span>

        <GeocoderSearch onSelectPlace={handleSelectPlace} />

        <div className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={handleCaptureView}>
          <Camera size={15} />
          <span>Capturer cette vue</span>
        </button>
      </div>

      <div className="canvas-stage" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

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
