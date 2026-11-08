/**
 * StoryMap — Script client de préparation cartographique et gestion d'impression Brochure (P5 — C04/C05)
 */

export function getBrochureRuntimeScript(safeAccent: string): string {
  return `const storyData = JSON.parse(document.getElementById('storymap-data').textContent);
let isReadyForPrint = false;
const mapStates = {};
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
function checkReadiness(totalCount) {
    const statusEl = document.getElementById('print-status');
    const printBtn = document.getElementById('btn-print');
    const ids = Object.keys(mapStates);
    const errors = ids.filter(id => mapStates[id].state === 'error' || mapStates[id].state === 'timeout');
    const readyCount = ids.filter(id => mapStates[id].state === 'ready').length;
    if (errors.length > 0) {
        isReadyForPrint = false;
        if (printBtn) printBtn.disabled = true;
        if (statusEl) {
            statusEl.style.background = '#dc2626';
            statusEl.style.color = '#fff';
            statusEl.textContent = 'Erreur cartographique (' + errors.length + ' carte(s)) — Impression verrouillée';
        }
        return;
    }
    if (readyCount === totalCount) {
        isReadyForPrint = true;
        if (printBtn) printBtn.disabled = false;
        if (statusEl) {
            statusEl.style.background = '#15803d';
            statusEl.style.color = '#fff';
            statusEl.textContent = 'Prêt pour impression PDF A4 (' + totalCount + '/' + totalCount + ' cartes validées)';
        }
    } else {
        if (statusEl) statusEl.textContent = 'Préparation cartographique (' + readyCount + '/' + totalCount + ')…';
    }
}
function initBrochureMaps() {
    const maps = storyData.maps || [];
    const els = Array.from(document.querySelectorAll('.doc-map-canvas'));
    const statusEl = document.getElementById('print-status'), printBtn = document.getElementById('btn-print');
    if (!els.length || typeof maplibregl === 'undefined') {
        isReadyForPrint = true;
        if (printBtn) printBtn.disabled = false;
        if (statusEl) { statusEl.style.background = '#15803d'; statusEl.style.color = '#fff'; statusEl.textContent = 'Prêt pour impression PDF A4'; }
        return;
    }
    els.forEach(el => { mapStates[el.id] = { state: 'loading', settled: false }; });
    const settle = (id, st, detail) => {
        if (mapStates[id] && mapStates[id].settled) return;
        mapStates[id] = { state: st, settled: true, detail };
        checkReadiness(els.length);
    };
    const timer = setTimeout(() => {
        els.forEach(el => { if (!mapStates[el.id] || !mapStates[el.id].settled) settle(el.id, 'timeout', 'Délai d’attente dépassé (10s)'); });
    }, 10000);
    els.forEach((el) => {
        const mapId = el.getAttribute('data-map-id'), targetFeatId = el.getAttribute('data-target-feature');
        const scene = maps.find(m => m.id === mapId) || maps[0];
        if (!scene) { settle(el.id, 'ready'); return; }
        const v = scene.view || { center: [2.3522, 48.8566], zoom: 11, pitch: 0, bearing: 0 };
        try {
            const map = new maplibregl.Map({ container: el, style: resolveStyle(scene.mapStyle), center: v.center, zoom: v.zoom, pitch: v.pitch || 0, bearing: v.bearing || 0, interactive: false, attributionControl: false, preserveDrawingBuffer: true });
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
                map.once('idle', () => settle(el.id, 'ready'));
            });
            map.on('error', (err) => settle(el.id, 'error', String(err && err.error ? err.error.message : err)));
        } catch (ex) {
            settle(el.id, 'error', String(ex));
        }
    });
}
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn && btn.getAttribute('data-action') === 'print') {
        if (!isReadyForPrint) { alert("Impression indisponible : chargement des cartes incomplet ou en échec."); return; }
        window.print();
    }
});
window.addEventListener('beforeprint', (e) => {
    if (!isReadyForPrint) { alert("Impression annulée : attente de la stabilisation des cartes."); if (e && e.preventDefault) e.preventDefault(); }
});
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        if (!isReadyForPrint) { e.preventDefault(); alert("Impression bloquée : les cartes ne sont pas prêtes."); }
    }
});
window.addEventListener('unload', () => { Object.keys(mapInstances).forEach(k => { try { mapInstances[k].remove(); } catch (_) {} }); });
window.addEventListener('DOMContentLoaded', initBrochureMaps);`;
}

