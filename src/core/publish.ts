/**
 * StoryMap — Générateur et extracteur de page HTML autonome sécurisé (Mode 1 + N2/N3/N4)
 */

import type { StoryMap } from '../types/story';
import { convertLegacyToModern } from './adapter';
import { sanitizeHTML, escapeAttr } from './sanitize';
import { extractProjectThemeTokens, resolveVisualStyle } from './themeResolver';
import { renderPublishedHeroHTML } from './heroRenderer';
import { VEHICLE_SVG_PATHS } from './vehicleCatalog';

export function generateStandaloneHTML(story: StoryMap): string {
  const tokens = extractProjectThemeTokens(story);
  const vStyle = resolveVisualStyle(story, null, null, 'web-interactive');
  const safeAccent = /^#[0-9a-fA-F]{3,8}$/.test(tokens.accentColor || '') ? tokens.accentColor : '#0b7fb0';
  const isRight = story.appearance?.panelPosition === 'right', isCenter = story.appearance?.panelPosition === 'center';
  const title = story.title || 'StoryMap';

  const cleanStory: StoryMap = { ...story, steps: (story.steps || []).map((s) => ({ ...s, description: sanitizeHTML(s.description || '') })) };
  const storyJson = JSON.stringify(cleanStory).replace(/</g, '\\u003c');
  const heroHtml = cleanStory.hero?.enabled ? renderPublishedHeroHTML(cleanStory.hero, cleanStory.title || '', cleanStory.subtitle || '', cleanStory.brand?.logo || '', 'web-interactive', 'story') : '';
  const panelPosCss = isCenter ? 'left: 50%; transform: translateX(-50%); bottom: 20px; top: auto; max-height: 55vh;' : isRight ? 'top: 20px; right: 20px; left: auto; bottom: 20px;' : 'top: 20px; left: 20px; bottom: 20px;';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css">
    <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <style>
        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; font-family: ${escapeAttr(vStyle.bodyFont)}, system-ui, sans-serif; overflow: hidden; background: #0f1216; }
        #map { position: absolute; inset: 0; width: 100%; height: 100%; }
        #map-fallback { display: none; position: absolute; inset: 0; background: #1a202c; color: #a0aec0; align-items: center; justify-content: center; text-align: center; padding: 2rem; }
        .panel { position: absolute; ${panelPosCss} width: min(420px, calc(100vw - 40px)); background: ${escapeAttr(vStyle.surfaceCssBackground)}; color: ${escapeAttr(vStyle.textColor)}; border: ${escapeAttr(vStyle.borderCss)}; border-radius: ${escapeAttr(vStyle.radiusCss)}; box-shadow: 0 20px 40px rgba(0,0,0,0.3); z-index: 10; display: flex; flex-direction: column; overflow: hidden; }
        .panel-header { padding: 16px 20px; border-bottom: 1px solid #e2e5eb; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #e5f2f8; color: ${safeAccent}; font-size: 11px; font-weight: 600; }
        .panel-title { margin: 8px 0 0; font-size: 18px; font-weight: 700; color: ${escapeAttr(vStyle.textColor)}; font-family: ${escapeAttr(vStyle.headingFont)}, sans-serif; }
        .panel-body { flex: 1; padding: 20px; overflow-y: auto; font-size: 14px; line-height: 1.6; color: ${escapeAttr(vStyle.textColor)}; }
        .panel-body img { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; }
        .panel-footer { padding: 12px 20px; border-top: 1px solid #e2e5eb; display: flex; align-items: center; justify-content: space-between; background: #f7f8fa; }
        .panel-meta { padding: 6px 16px; font-size: 10.5px; color: #858e9e; border-top: 1px solid #e2e5eb; background: #fafbfc; }
        .btn { padding: 8px 14px; border: 1px solid #ccd2db; border-radius: 6px; background: #fff; cursor: pointer; font-weight: 600; font-size: 13px; }
        .btn:disabled { opacity: 0.4; cursor: default; }
    </style></head><body>
    <div id="map"></div><div id="map-fallback"><div><h3>Mode dégradé hors-ligne</h3><p>Fond cartographique indisponible sans connexion.</p></div></div>
    <div class="panel">
        <div class="panel-header"><span class="badge" id="step-badge">Étape 1</span><h2 class="panel-title" id="step-title"></h2></div>
        <div class="panel-body" id="step-body"></div>
        <div class="panel-footer"><button class="btn" id="btn-prev" onclick="prevStep()">Précédent</button><span id="step-count" style="font-size:12px;color:#858e9e"></span><button class="btn" id="btn-next" onclick="nextStep()">Suivant</button></div>
        <div class="panel-meta">StoryMap (MIT) · Cartographie © OpenStreetMap, CARTO, Esri</div>
    </div>
    <div id="hero-template" style="display:none">${heroHtml}</div>
    <script id="storymap-data" type="application/json">${storyJson}</script><script id="story-data" type="application/json">${storyJson}</script>
    <script>
        const story = JSON.parse(document.getElementById('storymap-data').textContent);
        const steps = (story.steps || []).filter(s => !s.hidden);
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const vehiclePaths = ${JSON.stringify(VEHICLE_SVG_PATHS)};
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
                map = new maplibregl.Map({ container: 'map', style: getStyle(), center: step.camera.center, zoom: step.camera.zoom, pitch: step.camera.pitch, bearing: step.camera.bearing });
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
            const paint = { 'line-color': '${safeAccent}', 'line-width': 3 };
            if (dash) paint['line-dasharray'] = dash;
            map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
            map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: paint });
        }

        function animateSegmentVehicle(fromCam, toCam, animCfg) {
            if (vehicleTimer) { clearInterval(vehicleTimer); vehicleTimer = null; }
            if (vehicleMarker) { vehicleMarker.remove(); vehicleMarker = null; }
            if (!map || !toCam) return false;
            const fromCoord = fromCam && fromCam.center ? fromCam.center : null, toCoord = toCam.center;
            const hasV = animCfg && animCfg.enabled && animCfg.vehicle !== 'none';
            if (!hasV || !toCoord) {
                map.flyTo({ center: toCoord, zoom: toCam.zoom, pitch: toCam.pitch, bearing: toCam.bearing, essential: true, duration: reducedMotion ? 0 : 1800 });
                return false;
            }
            const nextCam = steps[currentIdx + 1] && steps[currentIdx + 1].camera ? steps[currentIdx + 1].camera : null;
            const pts = fromCoord ? buildSegCoords(fromCoord, toCoord) : (nextCam ? buildSegCoords(toCoord, nextCam.center) : [toCoord, toCoord]);
            const calcBrg = (a, b) => (Math.atan2((b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180), b[1] - a[1]) * 180 / Math.PI + 360) % 360;
            const wrap = document.createElement('div'); wrap.className = 'vehicle-marker-wrap'; wrap.style.cssText = 'width:28px;height:28px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:25;';
            const icon = document.createElement('div'); icon.className = 'vehicle-marker-icon';
            icon.style.cssText = 'width:100%;height:100%;transform:rotate(' + calcBrg(pts[0], pts[1] || pts[0]).toFixed(1) + 'deg);';
            icon.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="${safeAccent}" stroke="#fff" stroke-width="1.5"><path d="' + (vehiclePaths[animCfg.vehicle] || vehiclePaths.airplane) + '"/></svg>';
            wrap.appendChild(icon);
            if (!fromCoord || reducedMotion) {
                vehicleMarker = new maplibregl.Marker({ element: wrap }).setLngLat(toCoord).addTo(map);
                map.jumpTo({ center: toCoord, zoom: toCam.zoom, pitch: toCam.pitch, bearing: toCam.bearing });
                return 0;
            }
            vehicleMarker = new maplibregl.Marker({ element: wrap }).setLngLat(pts[0]).addTo(map);
            const fZoom = fromCam.zoom || toCam.zoom, fPitch = fromCam.pitch || 0, fBearing = fromCam.bearing || 0;
            map.jumpTo({ center: pts[0], zoom: fZoom, pitch: fPitch, bearing: fBearing });
            const distDeg = Math.hypot((toCoord[0] - fromCoord[0]) * Math.cos(((fromCoord[1] + toCoord[1]) / 2) * Math.PI / 180), toCoord[1] - fromCoord[1]);
            const baseMs = Math.max(1000, (animCfg.durationSec || 4.8) * 1000), dur = Math.round(baseMs * Math.min(1.15, Math.max(0.88, 0.88 + Math.log10(Math.max(0.01, distDeg) + 1) * 0.16)));
            const targetMidZoom = Math.max(1.8, Math.min(Math.min(fZoom, toCam.zoom) - 0.25, Math.log2((360 * 350 * (dur / 1000)) / (256 * Math.max(0.01, distDeg)))));
            let elapsed = 0; const nSeg = pts.length - 1;
            vehicleTimer = setInterval(() => {
                if (document.hidden) return;
                elapsed += 35; const t = Math.min(1, elapsed / dur), idx = Math.min(nSeg - 1, Math.floor(t * nSeg)), lt = t * nSeg - idx;
                const a = pts[idx], b = pts[idx + 1], curPos = [a[0] + (b[0] - a[0]) * lt, a[1] + (b[1] - a[1]) * lt];
                const linZ = fZoom + (toCam.zoom - fZoom) * t, curZ = distDeg > 0.05 ? linZ - Math.max(0, linZ - targetMidZoom) * Math.sin(t * Math.PI) : linZ;
                vehicleMarker.setLngLat(curPos); icon.style.transform = 'rotate(' + calcBrg(a, b).toFixed(1) + 'deg)';
                if (animCfg.cameraFollow !== false) map.jumpTo({ center: curPos, zoom: curZ, pitch: fPitch + ((toCam.pitch || 0) - fPitch) * t, bearing: fBearing + ((toCam.bearing || 0) - fBearing) * t });
                if (t >= 1) { clearInterval(vehicleTimer); vehicleTimer = null; }
            }, 35);
            return dur;
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
                (step.markers || [{ coordinates: step.camera.center }]).forEach(m => activeMarkers.push(new maplibregl.Marker({ color: '${safeAccent}' }).setLngLat(m.coordinates).addTo(map)));
                const prevS = currentIdx > 0 ? steps[currentIdx - 1] : null;
                const fDur = animateSegmentVehicle(prevS && prevS.camera ? prevS.camera : null, step.camera, step.routeAnimation || story.routeAnimation) || 0;
                if (autoplayTimer) clearTimeout(autoplayTimer);
                if (currentIdx < steps.length - 1) autoplayTimer = setTimeout(() => { nextStep(); }, ((story.appearance && story.appearance.autoplayInterval) || 5000) + fDur);
            }
        }

        function nextStep() { if (currentIdx < steps.length - 1) { currentIdx++; renderStep(); } }
        function prevStep() { if (currentIdx > 0) { currentIdx--; renderStep(); } }
        window.addEventListener('DOMContentLoaded', initMap);
    </script>
</body>
</html>`;
}

export function extractStoryFromHTML(html: string): StoryMap {
  let content = '';
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const el = doc.getElementById('storymap-data') || doc.getElementById('story-data') || doc.getElementById('atelier-storymap-data');
    content = el?.textContent || '';
  } else {
    const match = html.match(/<script[^>]*id="(?:storymap-data|story-data|atelier-storymap-data)"[^>]*>([\s\S]*?)<\/script>/i);
    content = match ? match[1] : '';
  }
  if (!content) throw new Error('Aucune donnée StoryMap intégrée trouvée dans ce document HTML.');
  return convertLegacyToModern(JSON.parse(content));
}

function escapeHtml(text: string): string { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
