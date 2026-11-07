/**
 * StoryMap — Canevas de carte interactif MapLibre GL avec tracé multi-styles, marqueurs & diagnostics
 */

import React, { useState, useEffect, useRef } from 'react';
import { Map as MLMap, Marker, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStory } from '../../context/StoryContext';
import { Compass, Camera, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { resolveMapStyle } from '../../types/map';
import { createRouteGeoJSON, getRouteLayerConfig } from '../../core/route';
import { getRouteIconSVG, registerRouteIcon } from '../../core/mapIcons';
import { attachMapDiagnostics } from '../../core/mapDiagnostics';
import { createMarkerElement } from '../common/markerElement';
import { GeocoderSearch } from './GeocoderSearch';
import { GeoSearchResult } from '../../core/geocoder';

export const Canvas: React.FC = () => {
  const { story, activeStepIndex, setActiveStepIndex, updateStep } = useStory();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const currentStyleRef = useRef<string>(story?.mapStyle || '');
  const [webglLost, setWebglLost] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const currentStep = story?.steps[activeStepIndex];

  // Initialisation et cycle de vie de la carte MapLibre avec diagnostics
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !story) return;
    container.innerHTML = '';

    const initialCamera = currentStep?.camera || { center: [2.3522, 48.8566], zoom: 12, pitch: 0, bearing: 0 };
    const resolvedStyle = resolveMapStyle(story.mapStyle);
    const map = new MLMap({
      container,
      style: resolvedStyle,
      center: initialCamera.center,
      zoom: initialCamera.zoom,
      pitch: initialCamera.pitch,
      bearing: initialCamera.bearing,
    });

    const detachDiagnostics = attachMapDiagnostics(map, container, 'Canvas', resolvedStyle);
    let isUnmounting = false;
    const canvas = map.getCanvas();
    const handleContextLost = (e: Event) => {
      if (isUnmounting) return;
      e.preventDefault();
      console.warn('[StoryMap:Canvas] Événement webglcontextlost détecté en cours d’exécution');
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      console.info('[StoryMap:Canvas] Événement webglcontextrestored reçu');
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

  // Synchronisation dynamique du style de fond
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story?.mapStyle || (map as any)._removed) return;
    if (currentStyleRef.current === story.mapStyle) return;
    currentStyleRef.current = story.mapStyle;
    map.setStyle(resolveMapStyle(story.mapStyle));
  }, [story?.mapStyle]);

  // Synchronisation caméra et marqueurs stylisés
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !story || !currentStep) return;

    map.flyTo({
      center: currentStep.camera.center, zoom: currentStep.camera.zoom,
      pitch: currentStep.camera.pitch, bearing: currentStep.camera.bearing, essential: true, duration: 1400,
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
      const marker = new Marker({ element: el, draggable: isActive }).setLngLat(step.camera.center).addTo(map);

      if (isActive) {
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          updateStep(activeStepIndex, { camera: { ...currentStep.camera, center: [lngLat.lng, lngLat.lat] } });
        });
      } else {
        el.addEventListener('click', (e) => { e.stopPropagation(); setActiveStepIndex(idx); });
      }
      markersRef.current.push(marker);
    });
  }, [activeStepIndex, currentStep?.camera, story?.appearance.accentColor, story?.appearance.markerShape, story?.appearance.showAllMarkers, story?.steps]);

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
      const src = map.getSource('story-route') as GeoJSONSource;
      const layoutObj = cfg.layout || {};
      if (src) {
        src.setData(routeData);
      } else if (rStyle !== 'none') {
        map.addSource('story-route', { type: 'geojson', data: routeData });
      }

      if (map.getLayer('story-route-line')) map.removeLayer('story-route-line');
      if (rStyle !== 'none' && !isCancelled && !(map as any)._removed) {
        map.addLayer({ id: 'story-route-line', type: 'line', source: 'story-route', paint: cfg.paint as any, layout: layoutObj as any });
      }

      if (map.getLayer('story-route-symbols')) map.removeLayer('story-route-symbols');
      const iconSvg = getRouteIconSVG(rStyle, rColor);
      if (iconSvg && rStyle !== 'none' && !isCancelled) {
        const iconId = `icon-${rStyle}-${rColor.replace('#', '')}`;
        await registerRouteIcon(map, iconId, iconSvg);
        if (!isCancelled && !(map as any)._removed && !map.getLayer('story-route-symbols') && map.getSource('story-route')) {
          map.addLayer({
            id: 'story-route-symbols', type: 'symbol', source: 'story-route',
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

  const handleCaptureView = () => {
    const map = mapRef.current;
    if (!map || !currentStep) return;
    const center = map.getCenter();
    updateStep(activeStepIndex, { camera: { center: [center.lng, center.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() } });
  };

  const handleSelectPlace = (r: GeoSearchResult) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [r.lng, r.lat], zoom: 13, essential: true });
    updateStep(activeStepIndex, { camera: { ...currentStep?.camera, center: [r.lng, r.lat], zoom: 13, pitch: 0, bearing: 0 } });
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
        <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        {webglLost && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.92)', color: '#fff', padding: '16px', textAlign: 'center', gap: '10px' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>Le contexte 3D WebGL a été suspendu par le navigateur.</p>
            <button className="btn btn-primary btn-sm" onClick={() => { setWebglLost(false); setReloadKey((k) => k + 1); }}>
              <RefreshCw size={14} style={{ marginRight: '6px' }} /> Recharger la carte
            </button>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 10 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() || 10) + 1 })}><ZoomIn size={18} /></button>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() || 10) - 1 })}><ZoomOut size={18} /></button>
          <button className="btn btn-ghost btn-icon" onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 0 })}><Compass size={18} /></button>
        </div>
      </div>
    </main>
  );
};
