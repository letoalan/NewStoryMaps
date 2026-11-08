/**
 * StoryMap — Générateur d'export HTML autonome pour documents enrichis avec cartes MapLibre (P4 — V01/V04/V05/V08)
 */

import type { StoryMap } from '../types/story';
import type { PageFormat } from '../types/grid';
import { escapeAttr } from './sanitize';
import { renderPublishedPageHTML, sanitizePublishedStory } from './publishDocumentBlocks';

export function generateDocumentHTML(story: StoryMap): string {
  const safeAccent = /^#[0-9a-f]{6}$/i.test(story.appearance?.accentColor || '')
    ? story.appearance.accentColor
    : '#0b7fb0';
  const cleanStory = sanitizePublishedStory(story, safeAccent);
  const safeTitle = escapeAttr(cleanStory.title || 'Document StoryMap');
  const storyJson = JSON.stringify(cleanStory).replace(/</g, '\\u003c');

  const pages = cleanStory.pages && cleanStory.pages.length > 0 ? cleanStory.pages : [{
    id: 'p1', title: 'Page 1', layout: { format: 'a4-portrait' as PageFormat, gridColumns: 6, gridRows: 8 }, blocks: [],
  }];
  const pagesHtml = pages.map((p, idx) => renderPublishedPageHTML(p, idx, story.format || 'a4-portrait', safeAccent)).join('\n');
  const sommaireHtml = pages.map((p, idx) => `<button type="button" class="toc-item" id="toc-${idx}" onclick="setPage(${idx});toggleToc(false)"><strong>${idx + 1}.</strong> ${escapeAttr(p.title || `Page ${idx + 1}`)}</button>`).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css">
    <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <style>
        * { box-sizing: border-box; }
        body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#0f172a; color:#f8fafc; min-height:100vh; display:flex; flex-direction:column; }
        header { height:52px; background:rgba(15,23,42,0.95); border-bottom:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:space-between; padding:0 16px; z-index:20; }
        footer { height:48px; background:rgba(15,23,42,0.95); border-top:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; gap:16px; }
        main { flex:1; overflow:auto; display:flex; justify-content:center; align-items:center; padding:24px; gap:28px; }
        main.profile-vertical { flex-direction:column; align-items:center; justify-content:flex-start; }
        main.profile-horizontal { flex-direction:row; align-items:flex-start; justify-content:flex-start; }
        .btn { padding:6px 11px; background:#1e293b; color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:6px; cursor:pointer; font-weight:600; font-size:12px; }
        .btn:disabled { opacity:0.35; cursor:default; }
        .btn.active, .btn-primary { background:${safeAccent}; border-color:${safeAccent}; }
        .dot { width:10px; height:10px; padding:0; border:none; border-radius:5px; background:rgba(255,255,255,0.35); cursor:pointer; transition:all 0.2s; }
        .dot[aria-current="page"] { width:20px; background:${safeAccent}; }
        .binding-pill { display:inline-flex; align-items:center; gap:3px; background:rgba(11,127,176,0.12); color:${safeAccent}; border:1px solid ${safeAccent}; padding:1px 7px; border-radius:999px; font-size:10px; font-weight:600; margin-bottom:4px; cursor:pointer; }
        #toc-drawer { display:none; position:fixed; top:52px; left:0; bottom:0; width:260px; background:#1e293b; border-right:1px solid rgba(255,255,255,0.12); z-index:30; padding:14px; overflow-y:auto; }
        .toc-item { display:block; width:100%; text-align:left; padding:8px 10px; border:0; border-radius:6px; background:transparent; color:#cbd5e1; cursor:pointer; font-size:13px; margin-bottom:4px; }
        .toc-item[aria-current="page"] { background:${safeAccent}; color:#fff; }
    </style>
</head>
<body>
    <header>
        <div style="display:flex;align-items:center;gap:10px;">
            <button type="button" class="btn" id="toc-btn" aria-expanded="false" onclick="toggleToc()">Sommaire</button>
            <span style="font-weight:700;font-size:14px;">${safeTitle}</span>
        </div>
        <div role="group" aria-label="Profil de présentation" style="display:flex;gap:4px;">
            <button type="button" class="btn active" id="prof-slide" onclick="setProfile('slide')">Diapositive</button>
            <button type="button" class="btn" id="prof-vertical" onclick="setProfile('vertical')">Vertical</button>
            <button type="button" class="btn" id="prof-horizontal" onclick="setProfile('horizontal')">Horizontal</button>
        </div>
        <button type="button" class="btn" id="fs-btn" onclick="toggleFs()">Plein écran</button>
    </header>
    <aside id="toc-drawer" aria-label="Sommaire du document">
        <h3 style="margin:0 0 10px;font-size:13px;color:#f8fafc;">Sommaire</h3>
        ${sommaireHtml}
    </aside>
    <main id="main-stage" class="profile-slide">${pagesHtml}</main>
    <footer id="slide-footer">
        <button type="button" class="btn" id="prev-btn" aria-label="Page précédente" onclick="setPage(curPage - 1)">Précédent</button>
        <div role="navigation" aria-label="Pagination" style="display:flex;gap:6px;align-items:center;" id="dots-container"></div>
        <span id="page-num" aria-live="polite" style="font-size:12px;color:#94a3b8;"></span>
        <button type="button" class="btn" id="next-btn" aria-label="Page suivante" onclick="setPage(curPage + 1)">Suivant</button>
    </footer>
    <script id="storymap-data" type="application/json">${storyJson}</script>
    <script>
        const storyData = JSON.parse(document.getElementById('storymap-data').textContent);
        const total = ${pages.length}, reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let curPage = 0, curProfile = 'slide';
        const mapInstances = {};
        const RAST_SAT = { version: 8, sources: { satellite: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 } }, layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }] };
        const RAST_HYB = { version: 8, sources: { satellite: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 }, labels: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 } }, layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }, { id: 'labels', type: 'raster', source: 'labels' }] };
        function resolveStyle(s) {
            if (!s || s === 'positron') return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
            if (s === 'voyager') return 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
            if (s === 'dark-matter' || s === 'dark') return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
            if (s === 'liberty') return 'https://tiles.openfreemap.org/styles/liberty';
            if (s === 'bright') return 'https://tiles.openfreemap.org/styles/bright';
            if (s === 'fiord') return 'https://tiles.openfreemap.org/styles/fiord';
            if (s === 'ofm-positron') return 'https://tiles.openfreemap.org/styles/positron';
            if (s === 'ofm-dark') return 'https://tiles.openfreemap.org/styles/dark';
            if (s === 'satellite' || s === 'esri-satellite') return RAST_SAT;
            if (s === 'hybrid' || s === 'esri-hybrid') return RAST_HYB;
            if (/^(https?:|data:|\/)/.test(s)) return s;
            return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
        }
        function featCenter(f) {
            const c = f && f.coordinates;
            if (!Array.isArray(c) || !c.length) return null;
            if (f.geometryType === 'Point') return [c[0], c[1]];
            if (f.geometryType === 'LineString') return c[Math.floor(c.length / 2)];
            return (f.geometryType === 'Polygon' && Array.isArray(c[0]) && c[0].length) ? c[0][0] : null;
        }
        function initDocMaps() {
            const maps = storyData.maps || [];
            document.querySelectorAll('.doc-map-canvas').forEach((el) => {
                if (mapInstances[el.id]) { mapInstances[el.id].resize(); return; }
                const mapId = el.getAttribute('data-map-id'), targetFeatId = el.getAttribute('data-target-feature');
                const scene = maps.find(m => m.id === mapId) || maps[0];
                if (typeof maplibregl === 'undefined' || !scene) {
                    const fb = document.getElementById(el.id.replace('doc-map-', 'doc-map-fb-'));
                    if (fb) fb.style.display = 'flex';
                    return;
                }
                const v = scene.view || { center: [2.3522, 48.8566], zoom: 11, pitch: 0, bearing: 0 };
                const map = new maplibregl.Map({ container: el, style: resolveStyle(scene.mapStyle), center: v.center, zoom: v.zoom, pitch: v.pitch || 0, bearing: v.bearing || 0, attributionControl: false });
                mapInstances[el.id] = map;
                map.on('load', () => {
                    const feats = [];
                    (scene.layers || []).forEach(l => {
                        if (!l.visible) return;
                        (l.features || []).forEach(f => {
                            const col = (targetFeatId && f.id === targetFeatId) ? '#e11d48' : (f.color || l.color || '${safeAccent}');
                            feats.push({ type: 'Feature', geometry: { type: f.geometryType, coordinates: f.coordinates }, properties: { color: col } });
                            const pt = featCenter(f);
                            if (pt) {
                                const mEl = document.createElement('div');
                                mEl.style.cssText = 'width:22px;height:22px;border-radius:50%;background:' + col + ';color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;';
                                mEl.textContent = String(f.numberIndex || 1);
                                new maplibregl.Marker({ element: mEl }).setLngLat(pt).addTo(map);
                            }
                        });
                    });
                    map.addSource('scene-shapes', { type: 'geojson', data: { type: 'FeatureCollection', features: feats } });
                    map.addLayer({ id: 'scene-polygons-fill', type: 'fill', source: 'scene-shapes', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.3 } });
                    map.addLayer({ id: 'scene-lines-layer', type: 'line', source: 'scene-shapes', filter: ['!=', ['geometry-type'], 'Point'], paint: { 'line-color': ['get', 'color'], 'line-width': 3.5 } });
                });
            });
        }
        function triggerNarrativeBinding(mapId, featId, action) {
            const maps = storyData.maps || [], scene = maps.find(m => m.id === mapId) || maps[0];
            if (!scene) return;
            let targetFeat = null;
            (scene.layers || []).forEach(l => (l.features || []).forEach(f => { if (f.id === featId) targetFeat = f; }));
            const pt = featCenter(targetFeat);
            if (pt) document.querySelectorAll('.doc-map-canvas').forEach(el => { const m = mapInstances[el.id]; if (m) m.flyTo({ center: pt, zoom: action === 'zoom' ? 14 : m.getZoom(), duration: reducedMotion ? 0 : 900 }); });
        }
        function stepGallery(id, delta) {
            const box = document.getElementById('gal-' + id);
            if (!box) return;
            const count = Number(box.getAttribute('data-count')) || 1, cur = ((Number(box.getAttribute('data-cur')) || 0) + delta + count) % count;
            box.setAttribute('data-cur', String(cur));
            document.querySelectorAll('.gallery-slide[data-gallery="' + id + '"]').forEach((img, idx) => { img.style.display = idx === cur ? 'block' : 'none'; });
            const lbl = document.getElementById('gal-lbl-' + id);
            if (lbl) lbl.textContent = (cur + 1) + '/' + count;
        }
        function setProfile(p) {
            curProfile = p; document.getElementById('main-stage').className = 'profile-' + p;
            ['slide', 'vertical', 'horizontal'].forEach(k => document.getElementById('prof-' + k).classList.toggle('active', k === p));
            document.getElementById('slide-footer').style.display = p === 'slide' ? 'flex' : 'none'; updateUI();
        }
        function toggleToc(force) {
            const dr = document.getElementById('toc-drawer'), open = typeof force === 'boolean' ? force : dr.style.display !== 'block';
            dr.style.display = open ? 'block' : 'none'; document.getElementById('toc-btn').setAttribute('aria-expanded', String(open));
        }
        function updateUI() {
            for (let i = 0; i < total; i++) {
                const el = document.getElementById('page-' + i), toc = document.getElementById('toc-' + i);
                if (el) el.style.display = (curProfile !== 'slide' || i === curPage) ? 'inline-block' : 'none';
                if (toc) { if (i === curPage) toc.setAttribute('aria-current', 'page'); else toc.removeAttribute('aria-current'); }
            }
            document.getElementById('prev-btn').disabled = curPage <= 0; document.getElementById('next-btn').disabled = curPage >= total - 1;
            document.getElementById('page-num').textContent = (curPage + 1) + ' / ' + total;
            const dc = document.getElementById('dots-container'); dc.innerHTML = '';
            for (let i = 0; i < total; i++) {
                const d = document.createElement('button'); d.type = 'button'; d.className = 'dot'; d.setAttribute('aria-label', 'Aller à la page ' + (i + 1));
                if (i === curPage) d.setAttribute('aria-current', 'page'); d.onclick = () => setPage(i); dc.appendChild(d);
            }
            setTimeout(initDocMaps, 30);
        }
        function setPage(n) {
            if (n >= 0 && n < total) { curPage = n; updateUI(); if (curProfile !== 'slide') { const el = document.getElementById('page-' + n); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }); } }
        }
        function toggleFs() { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen().catch(() => {}); }
        document.addEventListener('fullscreenchange', () => { document.getElementById('fs-btn').textContent = document.fullscreenElement ? 'Quitter plein écran' : 'Plein écran'; });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { toggleToc(false); return; }
            const t = e.target;
            if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName) || (t.closest && (t.closest('.maplibregl-map') || t.closest('[data-carousel-control="true"]'))))) return;
            if (e.key === 'ArrowRight' || e.key === 'PageDown') setPage(curPage + 1); else if (e.key === 'ArrowLeft' || e.key === 'PageUp') setPage(curPage - 1);
        });
        window.addEventListener('DOMContentLoaded', updateUI); updateUI();
    </script>
</body>
</html>`;
}
