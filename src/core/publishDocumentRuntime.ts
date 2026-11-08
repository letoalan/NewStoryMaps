/**
 * StoryMap — Script client autonome embarqué pour documents interactifs (P4 — V01/V04/V05/V08)
 */

export function getDocumentRuntimeScript(total: number, safeAccent: string): string {
  return `const storyData = JSON.parse(document.getElementById('storymap-data').textContent);
const total = ${total}, reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
        const scene = mapId ? maps.find(m => m.id === mapId) : maps[0];
        if (typeof maplibregl === 'undefined' || !scene) {
            const fb = document.getElementById(el.id.replace('doc-map-', 'doc-map-fb-'));
            if (fb) {
                fb.style.display = 'flex';
                if (!scene && mapId) {
                    const p = fb.querySelector('p');
                    if (p) p.textContent = 'Scène cartographique "' + mapId + '" introuvable';
                }
            }
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
                    feats.push({ type: 'Feature', id: f.id, geometry: { type: f.geometryType, coordinates: f.coordinates }, properties: { id: f.id, color: col } });
                    const pt = featCenter(f);
                    if (pt) {
                        const mEl = document.createElement('div');
                        mEl.className = 'doc-map-marker';
                        mEl.setAttribute('data-feat-id', f.id);
                        mEl.style.cssText = 'width:22px;height:22px;border-radius:50%;background:' + col + ';color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;transition:all 0.3s;';
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
    const maps = storyData.maps || [], scene = maps.find(m => m.id === mapId);
    if (!scene) return;
    let targetFeat = null;
    (scene.layers || []).forEach(l => (l.features || []).forEach(f => { if (f.id === featId) targetFeat = f; }));
    const pt = featCenter(targetFeat);
    document.querySelectorAll('.doc-map-canvas').forEach(el => {
        if (el.getAttribute('data-map-id') !== mapId) return;
        const m = mapInstances[el.id];
        if (!m) return;
        if (action === 'zoom' && pt) {
            m.flyTo({ center: pt, zoom: 14, duration: reducedMotion ? 0 : 800 });
        } else if (action === 'highlight') {
            if (pt) m.panTo(pt, { duration: reducedMotion ? 0 : 500 });
            el.querySelectorAll('.doc-map-marker').forEach(mk => {
                if (mk.getAttribute('data-feat-id') === featId) {
                    mk.style.transform = 'scale(1.4)';
                    mk.style.boxShadow = '0 0 0 4px #e11d48';
                    mk.style.zIndex = '100';
                    setTimeout(() => { mk.style.transform = 'scale(1)'; mk.style.boxShadow = 'none'; mk.style.zIndex = '1'; }, 2500);
                }
            });
            try {
                if (m.getLayer('feat-hl')) m.removeLayer('feat-hl');
                if (targetFeat && targetFeat.geometryType !== 'Point') {
                    m.addLayer({ id: 'feat-hl', type: 'line', source: 'scene-shapes', filter: ['==', ['get', 'id'], featId], paint: { 'line-color': '#e11d48', 'line-width': 6 } });
                    setTimeout(() => { try { if (m.getLayer('feat-hl')) m.removeLayer('feat-hl'); } catch (_) {} }, 2500);
                }
            } catch (_) {}
        } else if (action === 'filter') {
            try {
                if (targetFeat) {
                    m.setFilter('scene-lines-layer', ['==', ['get', 'id'], featId]);
                    m.setFilter('scene-polygons-fill', ['==', ['get', 'id'], featId]);
                    el.querySelectorAll('.doc-map-marker').forEach(mk => {
                        mk.style.display = (mk.getAttribute('data-feat-id') === featId) ? 'flex' : 'none';
                    });
                }
            } catch (_) {}
        }
    });
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
        d.setAttribute('data-action', 'goto-page'); d.setAttribute('data-page-idx', String(i));
        if (i === curPage) d.setAttribute('aria-current', 'page'); dc.appendChild(d);
    }
    setTimeout(initDocMaps, 30);
}
function setPage(n) {
    if (n >= 0 && n < total) { curPage = n; updateUI(); if (curProfile !== 'slide') { const el = document.getElementById('page-' + n); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }); } }
}
function toggleFs() { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen().catch(() => {}); }
document.addEventListener('fullscreenchange', () => { document.getElementById('fs-btn').textContent = document.fullscreenElement ? 'Quitter plein écran' : 'Plein écran'; });
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const act = btn.getAttribute('data-action');
    if (act === 'narrative-binding') triggerNarrativeBinding(btn.getAttribute('data-map-id'), btn.getAttribute('data-feature-id'), btn.getAttribute('data-binding-action'));
    else if (act === 'gallery-prev') stepGallery(btn.getAttribute('data-gallery-id'), -1);
    else if (act === 'gallery-next') stepGallery(btn.getAttribute('data-gallery-id'), 1);
    else if (act === 'goto-page') { setPage(Number(btn.getAttribute('data-page-idx'))); toggleToc(false); }
    else if (act === 'toggle-toc') toggleToc();
    else if (act === 'set-profile') setProfile(btn.getAttribute('data-profile'));
    else if (act === 'toggle-fs') toggleFs();
    else if (act === 'prev-page') setPage(curPage - 1);
    else if (act === 'next-page') setPage(curPage + 1);
});
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { toggleToc(false); return; }
    const t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName) || (t.closest && (t.closest('.maplibregl-map') || t.closest('[data-carousel-control="true"]'))))) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') setPage(curPage + 1); else if (e.key === 'ArrowLeft' || e.key === 'PageUp') setPage(curPage - 1);
});
window.addEventListener('DOMContentLoaded', updateUI); updateUI();`;
}

