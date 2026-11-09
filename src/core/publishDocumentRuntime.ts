/**
 * StoryMap — Script client autonome embarqué pour documents interactifs (P4 / N3 / N4)
 */

export function getDocumentRuntimeScript(total: number, safeAccent: string): string {
  return `const storyData = JSON.parse(document.getElementById('storymap-data').textContent);
const total = ${total}, reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let curPage = 0, curProfile = 'slide';
const mapInstances = {}, vehicleTimers = {};
const RAST_SAT = { version: 8, sources: { satellite: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 } }, layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }] };
const RAST_HYB = { version: 8, sources: { satellite: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 }, labels: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 } }, layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }, { id: 'labels', type: 'raster', source: 'labels' }] };
function resolveStyle(s) {
    if (!s || s === 'positron' || s === 'voyager') return 'https://basemaps.cartocdn.com/gl/' + (s || 'positron') + '-gl-style/style.json';
    if (s === 'dark-matter' || s === 'dark') return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
    if (s === 'liberty' || s === 'bright' || s === 'fiord') return 'https://tiles.openfreemap.org/styles/' + s;
    if (s === 'ofm-positron' || s === 'ofm-dark') return 'https://tiles.openfreemap.org/styles/' + s.slice(4);
    return (s === 'satellite' || s === 'esri-satellite') ? RAST_SAT : (s === 'hybrid' || s === 'esri-hybrid') ? RAST_HYB : /^(https?:|data:|\\/)/.test(s) ? s : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}
function featCenter(f) {
    const c = f && f.coordinates;
    if (!Array.isArray(c) || !c.length) return null;
    return f.geometryType === 'Point' ? [c[0], c[1]] : f.geometryType === 'LineString' ? c[Math.floor(c.length / 2)] : (f.geometryType === 'Polygon' && Array.isArray(c[0]) && c[0].length) ? c[0][0] : null;
}
function expandLineCoords(base) {
    const rStyle = (storyData.appearance && storyData.appearance.routeStyle) || 'dashed';
    if (!Array.isArray(base) || base.length < 2 || (rStyle !== 'curved' && rStyle !== 'airplane' && rStyle !== 'ship')) return base || [];
    const out = [];
    for (let k = 0; k < base.length - 1; k++) {
        const p1 = base[k], p2 = base[k + 1], dLng = p2[0] - p1[0], dLat = p2[1] - p1[1];
        if (Math.hypot(dLng, dLat) < 0.001) { if (k === 0) out.push(p1); out.push(p2); continue; }
        const cLng = (p1[0] + p2[0]) / 2 - dLat * 0.18, cLat = (p1[1] + p2[1]) / 2 + dLng * 0.18;
        for (let i = (k === 0 ? 0 : 1); i <= 16; i++) { const t = i / 16, u = 1 - t; out.push([u * u * p1[0] + 2 * u * t * cLng + t * t * p2[0], u * u * p1[1] + 2 * u * t * cLat + t * t * p2[1]]); }
    }
    return out;
}
function attachLineVehicle(map, elId, rawCoords, animCfg, col) {
    const coords = expandLineCoords(rawCoords);
    if (!animCfg || !animCfg.enabled || animCfg.vehicle === 'none' || !Array.isArray(coords) || coords.length < 2) return;
    const wrap = document.createElement('div'); wrap.className = 'vehicle-marker-wrap'; wrap.style.cssText = 'width:26px;height:26px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:20;';
    const icon = document.createElement('div'); icon.className = 'vehicle-marker-icon'; icon.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;transform-origin:center center;';
    const initBrg = (Math.atan2(coords[1][0] - coords[0][0], coords[1][1] - coords[0][1]) * 180 / Math.PI + 360) % 360;
    icon.style.transform = 'rotate(' + initBrg.toFixed(1) + 'deg)';
    icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="' + col + '" stroke="#fff" stroke-width="1.5"><path d="M12 2L16 10H14V18H10V10H8L12 2Z"/></svg>';
    wrap.appendChild(icon);
    const mk = new maplibregl.Marker({ element: wrap }).setLngLat(reducedMotion ? coords[coords.length - 1] : coords[0]).addTo(map);
    if (reducedMotion) return;
    let userPausedFollow = false; map.on('dragstart', () => { userPausedFollow = true; }); map.on('zoomstart', () => { userPausedFollow = true; });
    const baseZ = (map.getZoom && map.getZoom()) || 11, first = coords[0], last = coords[coords.length - 1];
    const distDeg = Math.hypot(last[0] - first[0], last[1] - first[1]);
    const baseMs = Math.max(1000, (animCfg.durationSec || 4.8) * 1000), dur = Math.round(baseMs * Math.min(1.15, Math.max(0.88, 0.88 + Math.log10(Math.max(0.01, distDeg) + 1) * 0.16)));
    const midZ = Math.max(1.8, Math.min(baseZ - 0.25, Math.log2((360 * 350 * (dur / 1000)) / (256 * Math.max(0.01, distDeg)))));
    if (animCfg.cameraFollow !== false && map.jumpTo) map.jumpTo({ center: coords[0], zoom: baseZ });
    vehicleTimers[elId] = setInterval(() => {
        if (document.hidden) return;
        t = (t + 40) % dur; const p = t / dur, idx = Math.min(coords.length - 2, Math.floor(p * (coords.length - 1))), lt = (p * (coords.length - 1)) - idx;
        const a = coords[idx], b = coords[idx + 1], ang = (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI + 360) % 360;
        const curPos = [a[0] + (b[0] - a[0]) * lt, a[1] + (b[1] - a[1]) * lt], curZ = distDeg > 0.05 ? baseZ - Math.max(0, baseZ - midZ) * Math.sin(p * Math.PI) : baseZ;
        mk.setLngLat(curPos); icon.style.transform = 'rotate(' + ang.toFixed(1) + 'deg)';
        if (animCfg.cameraFollow !== false && !userPausedFollow && map.jumpTo) map.jumpTo({ center: curPos, zoom: curZ });
    }, 40);
}
function initDocMaps() {
    const maps = storyData.maps || [];
    document.querySelectorAll('.doc-map-canvas').forEach((el) => {
        if (mapInstances[el.id]) { mapInstances[el.id].resize(); return; }
        const mapId = el.getAttribute('data-map-id'), targetFeatId = el.getAttribute('data-target-feature');
        const scene = mapId ? maps.find(m => m.id === mapId) : maps[0];
        if (typeof maplibregl === 'undefined' || !scene) {
            const fb = document.getElementById(el.id.replace('doc-map-', 'doc-map-fb-'));
            if (fb) { fb.style.display = 'flex'; if (!scene && mapId) { const p = fb.querySelector('p'); if (p) p.textContent = 'Scène cartographique "' + mapId + '" introuvable'; } }
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
                    const fCoords = f.geometryType === 'LineString' ? expandLineCoords(f.coordinates) : f.coordinates;
                    feats.push({ type: 'Feature', id: f.id, geometry: { type: f.geometryType, coordinates: fCoords }, properties: { id: f.id, color: col } });
                    const pt = featCenter(f);
                    if (pt) {
                        const wrap = document.createElement('div'); wrap.className = 'doc-map-marker-wrap'; wrap.setAttribute('data-feat-id', f.id);
                        wrap.style.cssText = 'width:24px;height:24px;display:flex;align-items:center;justify-content:center;pointer-events:auto;';
                        const pin = document.createElement('div'); pin.className = 'doc-map-marker-pin';
                        pin.style.cssText = 'width:22px;height:22px;border-radius:50%;background:' + col + ';color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;transition:transform 0.3s ease,box-shadow 0.3s ease;';
                        pin.textContent = String(f.numberIndex || 1); wrap.appendChild(pin);
                        new maplibregl.Marker({ element: wrap }).setLngLat(pt).addTo(map);
                    }
                    if (f.geometryType === 'LineString') attachLineVehicle(map, el.id + '-' + f.id, f.coordinates, f.routeAnimation || scene.routeAnimation || storyData.routeAnimation, col);
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
        const m = mapInstances[el.id]; if (!m) return;
        if (action === 'zoom' && pt) m.flyTo({ center: pt, zoom: 14, duration: reducedMotion ? 0 : 800 });
        else if (action === 'highlight') {
            if (pt) m.panTo(pt, { duration: reducedMotion ? 0 : 500 });
            el.querySelectorAll('.doc-map-marker-wrap').forEach(w => {
                const pin = w.querySelector('.doc-map-marker-pin');
                if (pin && w.getAttribute('data-feat-id') === featId) {
                    w.style.zIndex = '100'; pin.style.transform = 'scale(1.4)'; pin.style.boxShadow = '0 0 0 4px #e11d48';
                    setTimeout(() => { w.style.zIndex = '1'; pin.style.transform = 'scale(1)'; pin.style.boxShadow = 'none'; }, 2500);
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
                const isReset = (el.getAttribute('data-active-filter') === featId);
                if (isReset || !targetFeat) {
                    el.removeAttribute('data-active-filter'); m.setFilter('scene-lines-layer', ['!=', ['geometry-type'], 'Point']); m.setFilter('scene-polygons-fill', ['==', ['geometry-type'], 'Polygon']);
                    el.querySelectorAll('.doc-map-marker-wrap').forEach(w => { w.style.display = 'flex'; });
                } else {
                    el.setAttribute('data-active-filter', featId); m.setFilter('scene-lines-layer', ['==', ['get', 'id'], featId]); m.setFilter('scene-polygons-fill', ['==', ['get', 'id'], featId]);
                    el.querySelectorAll('.doc-map-marker-wrap').forEach(w => { w.style.display = (w.getAttribute('data-feat-id') === featId) ? 'flex' : 'none'; });
                }
            } catch (_) {}
        }
    });
}
function stepGallery(id, delta) {
    const box = document.getElementById('gal-' + id); if (!box) return;
    const count = Number(box.getAttribute('data-count')) || 1, cur = ((Number(box.getAttribute('data-cur')) || 0) + delta + count) % count;
    box.setAttribute('data-cur', String(cur));
    document.querySelectorAll('.gallery-slide[data-gallery="' + id + '"]').forEach((img, idx) => { img.style.display = idx === cur ? 'block' : 'none'; });
    const lbl = document.getElementById('gal-lbl-' + id); if (lbl) lbl.textContent = (cur + 1) + '/' + count;
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
    setTimeout(() => { initDocMaps(); document.querySelectorAll('video').forEach((v) => { v.defaultMuted = true; v.muted = true; v.playsInline = true; v.play().catch(()=>{}); }); }, 30);
}
function setPage(n) { if (n >= 0 && n < total) { curPage = n; updateUI(); if (curProfile !== 'slide') { const el = document.getElementById('page-' + n); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }); } } }
function toggleFs() { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen().catch(() => {}); }
document.addEventListener('fullscreenchange', () => { document.getElementById('fs-btn').textContent = document.fullscreenElement ? 'Quitter plein écran' : 'Plein écran'; });
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]'); if (!btn) return;
    const act = btn.getAttribute('data-action');
    if (act === 'narrative-binding') triggerNarrativeBinding(btn.getAttribute('data-map-id'), btn.getAttribute('data-feature-id'), btn.getAttribute('data-binding-action'));
    else if (act === 'toggle-hero-video') { const v = document.getElementById(btn.getAttribute('data-video-id')); if (v) { if (v.paused) { v.play().catch(()=>{}); btn.textContent = 'Pause vidéo'; } else { v.pause(); btn.textContent = 'Lire vidéo'; } } }
    else if (act === 'gallery-prev' || act === 'gallery-next') stepGallery(btn.getAttribute('data-gallery-id'), act === 'gallery-prev' ? -1 : 1);
    else if (act === 'goto-page') { setPage(Number(btn.getAttribute('data-page-idx'))); toggleToc(false); }
    else if (act === 'toggle-toc') toggleToc(); else if (act === 'set-profile') setProfile(btn.getAttribute('data-profile'));
    else if (act === 'toggle-fs') toggleFs(); else if (act === 'prev-page') setPage(curPage - 1); else if (act === 'next-page') setPage(curPage + 1);
});
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { toggleToc(false); return; }
    const t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName) || (t.closest && (t.closest('.maplibregl-map') || t.closest('[data-carousel-control="true"]'))))) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') setPage(curPage + 1); else if (e.key === 'ArrowLeft' || e.key === 'PageUp') setPage(curPage - 1);
});
window.addEventListener('DOMContentLoaded', updateUI); updateUI();`;
}
