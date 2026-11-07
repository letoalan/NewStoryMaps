/**
 * StoryMap — Canevas de carte interactif MapLibre GL avec tracé multi-styles & marqueurs
 */

import React, { useEffect, useRef } from 'react';
import { Map as MLMap, Marker, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStory } from '../../context/StoryContext';
import { Compass, Camera, ZoomIn, ZoomOut } from 'lucide-react';
import { resolveMapStyle } from '../../types/map';
import { createRouteGeoJSON, getRouteLayerConfig } from '../../core/route';
import { createMarkerElement } from '../common/markerElement';
import { GeocoderSearch } from './GeocoderSearch';
import { GeoSearchResult } from '../../core/geocoder';

export const Canvas: React.FC = () => {
  const { story, activeStepIndex, setActiveStepIndex, updateStep } = useStory();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const currentStep = story?.steps[activeStepIndex];

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !story) return;

    const initialCamera = currentStep?.camera || { center: [2.3522, 48.8566], zoom: 12, pitch: 0, bearing: 0 };
    const map = new MLMap({
      container: mapContainerRef.current,
      style: resolveMapStyle(story.mapStyle),
      center: initialCamera.center,
      zoom: initialCamera.zoom,
      pitch: initialCamera.pitch,
      bearing: initialCamera.bearing,
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Synchronisation dynamique du style de fond
  useEffect(() => {
    const map = mapRef.current;
    if (map && story?.mapStyle) map.setStyle(resolveMapStyle(story.mapStyle));
  }, [story?.mapStyle]);

  // Synchronisation caméra et marqueurs stylisés
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story || !currentStep) return;

    map.flyTo({
      center: currentStep.camera.center,
      zoom: currentStep.camera.zoom,
      pitch: currentStep.camera.pitch,
      bearing: currentStep.camera.bearing,
      essential: true,
      duration: 1400,
    });

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const col = story.appearance.accentColor || '#0b7fb0';
    const shape = story.appearance.markerShape || 'pin';
    const showAll = story.appearance.showAllMarkers ?? true;

    story.steps.forEach((step, idx) => {
      const isActive = idx === activeStepIndex;
      if (!showAll && !isActive) return;

      const el = createMarkerElement({ shape, color: col, index: idx, isActive });
      const marker = new Marker({ element: el, draggable: isActive })
        .setLngLat(step.camera.center)
        .addTo(map);

      if (isActive) {
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          updateStep(activeStepIndex, {
            camera: { ...currentStep.camera, center: [lngLat.lng, lngLat.lat] },
          });
        });
      } else {
        el.addEventListener('click', (e) => { e.stopPropagation(); setActiveStepIndex(idx); });
      }

      markersRef.current.push(marker);
    });
  }, [activeStepIndex, currentStep?.camera, story?.appearance.accentColor, story?.appearance.markerShape, story?.appearance.showAllMarkers, story?.steps]);

  // Tracé GeoJSON multi-styles (pleines, pointillées, incurvées, avion, navire...)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story) return;

    const rStyle = story.appearance.routeStyle || 'dashed';
    const rColor = story.appearance.routeColor || story.appearance.accentColor || '#0b7fb0';
    const routeData = createRouteGeoJSON(story.steps, { style: rStyle, color: rColor });
    const cfg = getRouteLayerConfig(rStyle, rColor);

    const updateRoute = () => {
      const src = map.getSource('story-route') as GeoJSONSource;
      const layoutObj = cfg.layout || {};
      if (src) {
        src.setData(routeData);
        if (map.getLayer('story-route-line')) {
          map.removeLayer('story-route-line');
          map.addLayer({ id: 'story-route-line', type: 'line', source: 'story-route', paint: cfg.paint as any, layout: layoutObj as any });
        }
      } else if (rStyle !== 'none') {
        map.addSource('story-route', { type: 'geojson', data: routeData });
        map.addLayer({ id: 'story-route-line', type: 'line', source: 'story-route', paint: cfg.paint as any, layout: layoutObj as any });
      }
    };

    if (map.isStyleLoaded()) updateRoute(); else map.once('style.load', updateRoute);
  }, [story?.steps, story?.mapStyle, story?.appearance.routeStyle, story?.appearance.accentColor, story?.appearance.routeColor]);

  const handleCaptureView = () => {
    const map = mapRef.current;
    if (!map || !currentStep) return;
    const center = map.getCenter();
    updateStep(activeStepIndex, {
      camera: { center: [center.lng, center.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() },
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
        <span className="canvas-label">Étape <strong>{activeStepIndex + 1}</strong> : {currentStep?.title || 'Sans titre'}</span>
        <GeocoderSearch onSelectPlace={handleSelectPlace} />
        <div className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={handleCaptureView} title="Capturer la vue actuelle pour cette étape">
          <Camera size={15} /> <span>Capturer cette vue</span>
        </button>
      </div>

      <div className="canvas-stage" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() || 10) + 1 })}><ZoomIn size={18} /></button>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() || 10) - 1 })}><ZoomOut size={18} /></button>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 0 })}><Compass size={18} /></button>
        </div>
      </div>
    </main>
  );
};
