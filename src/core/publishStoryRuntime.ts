/**
 * StoryMap — Script runtime autonome pour export Mode 1 (StoryMap)
 * Intègre le modèle van Wijk & Nuij, maintien du Nord caméra, et autoplay centré sur les étapes.
 */

import { VEHICLE_SVG_PATHS } from './vehicleCatalog';
import { createStoryLegPath } from './storyCameraPath';

export function buildStoryRuntimeScript(safeAccent: string): string {
  const vehiclePathsJson = JSON.stringify(VEHICLE_SVG_PATHS);
  const legFnCode = createStoryLegPath.toString();

  return `
    const story = JSON.parse(document.getElementById('storymap-data').textContent);
    const steps = (story.steps || []).filter(s => !s.hidden);
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vehiclePaths = ${vehiclePathsJson};
    const ${legFnCode};
    const safeAccent = '${safeAccent}';
    let currentIdx = 0, map, activeMarkers = [], vehicleMarker = null, vehicleTimer = null, autoplayTimer = null;

    function buildSegCoords(p1, p2) {
      const rStyle = (story.appearance && story.appearance.routeStyle) || 'dashed';
      if (rStyle !== 'curved' && rStyle !== 'airplane' && rStyle !== 'ship') return [p1, p2];
      const dLng = p2[0] - p1[0], dLat = p2[1] - p1[1];
      if (Math.hypot(dLng, dLat) < 0.001) return [p1, p2];
      const cLng = (p1[0] + p2[0]) / 2 - dLat * 0.18, cLat = (p1[1] + p2[1]) / 2 + dLng * 0.18, pts = [];
      for (let i = 0; i <= 16; i++) { const t = i / 16, u = 1 - t; pts.push([u * u * p1[0] + 2 * u * t * cLng + t * t * p2[0], u * u * p1[1] + 2 * u * t * cLat + t * t * p2[1]]); }
      return pts;
    }

    function getStyle() {
      const s = story.mapStyle || 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
      if (s === 'esri-satellite' || s === 'satellite') return { version: 8, sources: { satellite: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 } }, layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }] };
      if (s === 'esri-hybrid' || s === 'hybrid') return { version: 8, sources: { satellite: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 }, labels: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 } }, layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }, { id: 'labels', type: 'raster', source: 'labels' }] };
      if (s === 'positron' || s === 'voyager') return 'https://basemaps.cartocdn.com/gl/' + s + '-gl-style/style.json';
      if (s === 'dark-matter' || s === 'dark') return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
      if (s === 'liberty' || s === 'bright' || s === 'fiord') return 'https://tiles.openfreemap.org/styles/' + s;
      if (s === 'ofm-positron' || s === 'ofm-dark') return 'https://tiles.openfreemap.org/styles/' + s.slice(4);
      return /^(https?:|data:|\\/)/.test(s) ? s : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
    }

    function initMap() {
      try {
        if (typeof maplibregl === 'undefined') throw new Error('CDN indisponible');
        const step = steps[0] || { camera: { center: [2.35, 48.85], zoom: 4, pitch: 0, bearing: 0 } };
        map = new maplibregl.Map({ container: 'map', style: getStyle(), center: step.camera.center, zoom: step.camera.zoom, pitch: step.camera.pitch || 0, bearing: 0 });
        map.on('error', () => { document.getElementById('map-fallback').style.display = 'flex'; });
        map.on('load', () => { addRoute(); renderStep(); });
      } catch (e) { document.getElementById('map-fallback').style.display = 'flex'; renderStep(); }
    }

    function addRoute() {
      if (!map) return;
      const base = steps.map(s => s.camera.center);
      if (base.length < 2) return;
      const rStyle = (story.appearance && story.appearance.routeStyle) || 'dashed';
      if (rStyle === 'none') return;
      const coords = [];
      for (let i = 0; i < base.length - 1; i++) { const seg = buildSegCoords(base[i], base[i + 1]); if (i > 0) seg.shift(); coords.push(...seg); }
      let dash = rStyle === 'solid' ? undefined : rStyle === 'dotted' ? [1, 2] : rStyle === 'ship' ? [5, 3] : [4, 2];
      const paint = { 'line-color': safeAccent, 'line-width': 3 };
      if (dash) paint['line-dasharray'] = dash;
      map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: paint });
    }

    function scheduleAutoplay() {
      if (autoplayTimer) clearTimeout(autoplayTimer);
      const dwell = (story.appearance && story.appearance.autoplayInterval) || 5000;
      if (currentIdx < steps.length - 1) {
        autoplayTimer = setTimeout(() => { nextStep(); }, dwell);
      }
    }

    function animateSegmentVehicle(fromCam, toCam, animCfg) {
      if (vehicleTimer) { clearInterval(vehicleTimer); vehicleTimer = null; }
      if (vehicleMarker) { vehicleMarker.remove(); vehicleMarker = null; }
      if (!map || !toCam) { scheduleAutoplay(); return; }
      const fromCoord = fromCam && fromCam.center ? fromCam.center : null, toCoord = toCam.center;
      const hasV = animCfg && animCfg.enabled && animCfg.vehicle !== 'none';
      if (!hasV || !toCoord) {
        map.flyTo({ center: toCoord, zoom: toCam.zoom, pitch: toCam.pitch || 0, bearing: 0, essential: true, duration: reducedMotion ? 0 : 1800 });
        scheduleAutoplay();
        return;
      }
      const nextCam = steps[currentIdx + 1] && steps[currentIdx + 1].camera ? steps[currentIdx + 1].camera : null;
      const pts = fromCoord ? buildSegCoords(fromCoord, toCoord) : (nextCam ? buildSegCoords(toCoord, nextCam.center) : [toCoord, toCoord]);
      const wrap = document.createElement('div'); wrap.className = 'vehicle-marker-wrap';
      wrap.style.cssText = 'width:28px;height:28px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:25;';
      const icon = document.createElement('div'); icon.className = 'vehicle-marker-icon';
      icon.style.cssText = 'width:100%;height:100%;';
      icon.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="' + safeAccent + '" stroke="#fff" stroke-width="1.5"><path d="' + (vehiclePaths[animCfg.vehicle] || vehiclePaths.airplane) + '"/></svg>';
      wrap.appendChild(icon);
      if (!fromCoord || reducedMotion) {
        vehicleMarker = new maplibregl.Marker({ element: wrap }).setLngLat(toCoord).addTo(map);
        map.jumpTo({ center: toCoord, zoom: toCam.zoom, pitch: toCam.pitch || 0, bearing: 0 });
        scheduleAutoplay();
        return;
      }
      vehicleMarker = new maplibregl.Marker({ element: wrap }).setLngLat(pts[0]).addTo(map);
      const vp = (map.getContainer() && map.getContainer().clientWidth) || 1024;
      const leg = createStoryLegPath(pts, fromCam, toCam, vp, animCfg.pace);
      map.jumpTo({ center: pts[0], zoom: fromCam.zoom, pitch: fromCam.pitch || 0, bearing: 0 });
      let start = performance.now();
      vehicleTimer = setInterval(() => {
        if (document.hidden) return;
        const now = performance.now();
        const t = Math.min(1, (now - start) / leg.durationMs);
        const sample = leg.sampleAtProgress(t);
        vehicleMarker.setLngLat(sample.coordinates);
        if (animCfg.orientToRoute !== false) icon.style.transform = 'rotate(' + sample.heading.toFixed(1) + 'deg)';
        if (animCfg.cameraFollow !== false) map.jumpTo({ center: sample.coordinates, zoom: sample.zoom, pitch: sample.pitch, bearing: 0 });
        if (t >= 1) {
          clearInterval(vehicleTimer); vehicleTimer = null;
          if (animCfg.cameraFollow !== false) map.easeTo({ center: toCam.center, zoom: toCam.zoom, pitch: toCam.pitch || 0, bearing: 0, duration: 180 });
          scheduleAutoplay();
        }
      }, 35);
    }

    function renderStep() {
      const step = steps[currentIdx] || { title: '', description: '' };
      document.getElementById('step-badge').textContent = 'Étape ' + (currentIdx + 1);
      document.getElementById('step-title').textContent = step.title;
      const body = document.getElementById('step-body'); body.textContent = '';
      if (currentIdx === 0) { const tpl = document.getElementById('hero-template'); if (tpl && tpl.innerHTML) { const h = document.createElement('div'); h.innerHTML = tpl.innerHTML; body.appendChild(h); } }
      if (step.media && step.media.url) { const img = document.createElement('img'); img.src = step.media.url; img.alt = step.media.alt || step.title || ''; body.appendChild(img); }
      const desc = document.createElement('div'); desc.innerHTML = step.description || ''; body.appendChild(desc);
      const total = steps.length || 1;
      document.getElementById('step-count').textContent = (currentIdx + 1) + ' / ' + total;
      document.getElementById('btn-prev').disabled = currentIdx === 0; document.getElementById('btn-next').disabled = currentIdx === total - 1;
      if (map && step.camera) {
        activeMarkers.forEach(m => m.remove()); activeMarkers = [];
        (step.markers || [{ coordinates: step.camera.center }]).forEach(m => activeMarkers.push(new maplibregl.Marker({ color: safeAccent }).setLngLat(m.coordinates).addTo(map)));
        const prevS = currentIdx > 0 ? steps[currentIdx - 1] : null;
        animateSegmentVehicle(prevS && prevS.camera ? prevS.camera : null, step.camera, step.routeAnimation || story.routeAnimation);
      } else {
        scheduleAutoplay();
      }
    }

    function nextStep() { if (currentIdx < steps.length - 1) { currentIdx++; renderStep(); } }
    function prevStep() { if (currentIdx > 0) { currentIdx--; renderStep(); } }
    window.addEventListener('DOMContentLoaded', initMap);
  `;
}
