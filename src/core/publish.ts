/**
 * StoryMap — Générateur et extracteur de page HTML autonome
 */

import type { StoryMap } from '../types/story';
import { convertLegacyToModern } from './adapter';

export function generateStandaloneHTML(story: StoryMap): string {
  const storyJson = JSON.stringify(story).replace(/</g, '\\u003c');
  const title = story.title || 'StoryMap';
  const accent = story.appearance?.accentColor || '#0b7fb0';
  const isRight = story.appearance?.panelPosition === 'right';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css">
    <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <style>
        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; background: #0f1216; }
        #map { position: absolute; inset: 0; width: 100%; height: 100%; }
        #map-fallback { display: none; position: absolute; inset: 0; background: #1a202c; color: #a0aec0; align-items: center; justify-content: center; text-align: center; padding: 2rem; }
        .panel { position: absolute; top: 20px; ${isRight ? 'right: 20px; left: auto;' : 'left: 20px;'} bottom: 20px; width: min(420px, calc(100vw - 40px)); background: #ffffff; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); z-index: 10; display: flex; flex-direction: column; overflow: hidden; }
        .panel-header { padding: 16px 20px; border-bottom: 1px solid #e2e5eb; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #e5f2f8; color: ${accent}; font-size: 11px; font-weight: 600; }
        .panel-title { margin: 8px 0 0; font-size: 18px; font-weight: 700; color: #161b25; }
        .panel-body { flex: 1; padding: 20px; overflow-y: auto; font-size: 14px; line-height: 1.6; color: #4d5667; }
        .panel-body img { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; }
        .panel-footer { padding: 12px 20px; border-top: 1px solid #e2e5eb; display: flex; align-items: center; justify-content: space-between; background: #f7f8fa; }
        .panel-meta { padding: 6px 16px; font-size: 10.5px; color: #858e9e; border-top: 1px solid #e2e5eb; background: #fafbfc; }
        .btn { padding: 8px 14px; border: 1px solid #ccd2db; border-radius: 6px; background: #fff; cursor: pointer; font-weight: 600; font-size: 13px; }
        .btn:disabled { opacity: 0.4; cursor: default; }
    </style>
</head>
<body>
    <div id="map"></div>
    <div id="map-fallback"><div><h3>Mode dégradé hors-ligne</h3><p>Fond cartographique indisponible sans connexion.</p></div></div>
    <div class="panel">
        <div class="panel-header">
            <span class="badge" id="step-badge">Étape 1</span>
            <h2 class="panel-title" id="step-title"></h2>
        </div>
        <div class="panel-body" id="step-body"></div>
        <div class="panel-footer">
            <button class="btn" id="btn-prev" onclick="prevStep()">Précédent</button>
            <span id="step-count" style="font-size:12px;color:#858e9e"></span>
            <button class="btn" id="btn-next" onclick="nextStep()">Suivant</button>
        </div>
        <div class="panel-meta">StoryMap (MIT) · Cartographie © OpenStreetMap, CARTO, Esri</div>
    </div>

    <script id="storymap-data" type="application/json">${storyJson}</script>
    <script id="story-data" type="application/json">${storyJson}</script>
    <script>
        const story = JSON.parse(document.getElementById('storymap-data').textContent);
        let currentIdx = 0;
        let map, marker;

        function getStyle() {
            const s = story.mapStyle || 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
            if (s === 'esri-satellite' || s === 'satellite') {
                return {
                    version: 8,
                    sources: { satellite: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 } },
                    layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }]
                };
            }
            if (s === 'esri-hybrid' || s === 'hybrid') {
                return {
                    version: 8,
                    sources: {
                        satellite: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 },
                        labels: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 }
                    },
                    layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }, { id: 'labels', type: 'raster', source: 'labels' }]
                };
            }
            return s;
        }

        function initMap() {
            try {
                if (typeof maplibregl === 'undefined') throw new Error('CDN indisponible');
                const step = story.steps[0] || { camera: { center: [2.35, 48.85], zoom: 4, pitch: 0, bearing: 0 } };
                map = new maplibregl.Map({
                    container: 'map',
                    style: getStyle(),
                    center: step.camera.center,
                    zoom: step.camera.zoom,
                    pitch: step.camera.pitch,
                    bearing: step.camera.bearing
                });
                map.on('error', () => { document.getElementById('map-fallback').style.display = 'flex'; });
                map.on('load', addRoute);
            } catch (e) {
                document.getElementById('map-fallback').style.display = 'flex';
            }
            renderStep();
        }

        function addRoute() {
            if (!map) return;
            const coords = (story.steps || []).map(s => s.camera.center);
            if (coords.length < 2) return;
            map.addSource('route', {
                type: 'geojson',
                data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } }
            });
            map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                paint: { 'line-color': '${accent}', 'line-width': 3, 'line-dasharray': [2, 2] }
            });
        }

        function renderStep() {
            const step = (story.steps && story.steps[currentIdx]) || { title: '', description: '' };
            document.getElementById('step-badge').textContent = 'Étape ' + (currentIdx + 1);
            document.getElementById('step-title').textContent = step.title;
            let html = '';
            if (step.media && step.media.url) {
                html += '<img src="' + step.media.url + '" alt="' + (step.title || '') + '">';
            }
            html += step.description || '';
            document.getElementById('step-body').innerHTML = html;
            const total = (story.steps && story.steps.length) || 1;
            document.getElementById('step-count').textContent = (currentIdx + 1) + ' / ' + total;
            document.getElementById('btn-prev').disabled = currentIdx === 0;
            document.getElementById('btn-next').disabled = currentIdx === total - 1;

            if (map && step.camera) {
                map.flyTo({
                    center: step.camera.center,
                    zoom: step.camera.zoom,
                    pitch: step.camera.pitch,
                    bearing: step.camera.bearing,
                    essential: true,
                    duration: 1800
                });
                if (marker) marker.remove();
                marker = new maplibregl.Marker({ color: '${accent}' })
                    .setLngLat(step.camera.center)
                    .addTo(map);
            }
        }

        function nextStep() {
            if (story.steps && currentIdx < story.steps.length - 1) { currentIdx++; renderStep(); }
        }

        function prevStep() {
            if (currentIdx > 0) { currentIdx--; renderStep(); }
        }

        window.addEventListener('DOMContentLoaded', initMap);
    </script>
</body>
</html>`;
}

export function extractStoryFromHTML(html: string): StoryMap {
  let content = '';
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const el = doc.getElementById('storymap-data') ||
               doc.getElementById('story-data') ||
               doc.getElementById('atelier-storymap-data');
    content = el?.textContent || '';
  } else {
    const match = html.match(/<script[^>]*id="(?:storymap-data|story-data|atelier-storymap-data)"[^>]*>([\s\S]*?)<\/script>/i);
    content = match ? match[1] : '';
  }

  if (!content) {
    throw new Error('Aucune donnée StoryMap intégrée trouvée dans ce document HTML.');
  }
  const raw = JSON.parse(content);
  return convertLegacyToModern(raw);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
