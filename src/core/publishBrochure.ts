/**
 * StoryMap — Générateur de Brochure statique A4 & impression PDF (P5 — J04 à J09, J11)
 */

import type { StoryMap } from '../types/story';
import { getGridDimensions } from './grid';
import { escapeAttr } from './sanitize';
import { renderPublishedBlockHTML, sanitizePublishedStory } from './publishDocumentBlocks';
import { convertRichDocumentToBrochure } from './brochure';

export function generateBrochurePrintHTML(story: StoryMap): string {
  const safeAccent = /^#[0-9a-f]{6}$/i.test(story.appearance?.accentColor || '')
    ? story.appearance.accentColor
    : '#0b7fb0';
  const cleanStory = sanitizePublishedStory(story, safeAccent);
  const { brochure } = convertRichDocumentToBrochure(cleanStory);
  const targetFormat: 'a4-portrait' | 'a4-landscape' =
    cleanStory.format === 'a4-landscape' ? 'a4-landscape' : 'a4-portrait';
  const dims = getGridDimensions(targetFormat);
  const pageOrientation = targetFormat === 'a4-landscape' ? 'landscape' : 'portrait';
  const safeTitle = escapeAttr(cleanStory.title || 'Brochure StoryMap');
  const safeAuthor = escapeAttr(cleanStory.author || '');

  // Conserve l'identifiant et les scènes cartographiques d'origine pour la réimportation éditable (J11)
  const reimportableStory: StoryMap = {
    ...cleanStory,
    mode: 'brochure',
    format: targetFormat,
    pages: brochure.pages,
  };
  const storyJson = JSON.stringify(reimportableStory).replace(/</g, '\\u003c');
  const pages = brochure.pages || [];

  const sheetsHtml = pages
    .map((page, pIdx) => {
      const blocksHtml = (page.blocks || []).map((b) => renderPublishedBlockHTML(b, safeAccent)).join('\n');
      const pageTitle = escapeAttr(page.title || `Page ${pIdx + 1}`);
      return `<article class="brochure-sheet" id="sheet-${pIdx}" aria-label="${pageTitle}">
        <header class="sheet-header">
          <div>
            <strong style="color:${safeAccent};font-size:13px;">${safeTitle}</strong>
            ${pIdx === 0 && safeAuthor ? `<span style="margin-left:10px;color:#475569;font-size:11px;">Par ${safeAuthor}</span>` : ''}
          </div>
          <span style="font-size:11px;color:#64748b;">${pageTitle}</span>
        </header>
        <div class="sheet-grid" style="display:grid;grid-template-columns:repeat(${dims.cols}, 1fr);grid-template-rows:repeat(${dims.rows}, 1fr);gap:${dims.gapPx}px;flex:1;min-height:0;">
          ${blocksHtml}
        </div>
        <footer class="sheet-footer">
          <span>${safeTitle} · Brochure cartographique A4</span>
          <strong>Page ${pIdx + 1} / ${pages.length}</strong>
        </footer>
      </article>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} — Brochure A4</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css">
    <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <style>
        @page { size: A4 ${pageOrientation}; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#334155; color:#0f172a; }
        .print-toolbar { position:sticky; top:0; z-index:50; height:52px; background:#0f172a; color:#f8fafc; display:flex; align-items:center; justify-content:space-between; padding:0 20px; border-bottom:1px solid rgba(255,255,255,0.12); }
        .btn-print { padding:7px 14px; background:${safeAccent}; color:#fff; border:none; border-radius:6px; font-weight:600; font-size:13px; cursor:pointer; }
        .sheets-container { display:flex; flex-direction:column; align-items:center; padding:24px; gap:24px; }
        .brochure-sheet { width:${dims.physicalWidthMm}mm; height:${dims.physicalHeightMm}mm; padding:${dims.marginMm}mm; background:#ffffff; box-shadow:0 8px 28px rgba(0,0,0,0.35); display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; page-break-after:always; break-after:page; }
        .brochure-sheet:last-child { page-break-after:auto; break-after:auto; }
        .sheet-header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ${safeAccent}; padding-bottom:6px; margin-bottom:10px; }
        .sheet-footer { display:flex; justify-content:space-between; align-items:center; border-top:1px solid #cbd5e1; padding-top:6px; margin-top:10px; font-size:10px; color:#475569; }
        .binding-pill { display:inline-flex; align-items:center; gap:3px; background:#f0f9ff; color:${safeAccent}; border:1px solid ${safeAccent}; padding:1px 7px; border-radius:999px; font-size:10px; font-weight:700; margin-bottom:4px; }
        @media print {
            body { background:#ffffff; }
            .no-print { display:none !important; }
            .sheets-container { padding:0; gap:0; }
            .brochure-sheet { box-shadow:none; margin:0; }
        }
    </style>
</head>
<body>
    <div class="print-toolbar no-print">
        <div style="display:flex;align-items:center;gap:12px;">
            <strong>${safeTitle}</strong>
            <span style="font-size:12px;color:#94a3b8;">Format A4 ${pageOrientation === 'landscape' ? 'Paysage (297×210 mm)' : 'Portrait (210×297 mm)'} · ${pages.length} page(s)</span>
            <span id="print-status" style="font-size:11px;padding:2px 8px;border-radius:999px;background:#1e293b;color:#38bdf8;">Préparation des cartes…</span>
        </div>
        <button type="button" class="btn-print" onclick="window.print()">Imprimer / Enregistrer en PDF A4</button>
    </div>
    <main class="sheets-container">${sheetsHtml}</main>
    <script id="storymap-data" type="application/json">${storyJson}</script>
    <script>
        const storyData = JSON.parse(document.getElementById('storymap-data').textContent);
        function resolveStyle(s) {
            if (!s || s === 'positron') return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
            if (s === 'dark-matter') return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
            if (s === 'voyager') return 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
            return s;
        }
        function featCenter(f) {
            const c = f && f.coordinates;
            if (!Array.isArray(c) || !c.length) return null;
            if (f.geometryType === 'Point') return [c[0], c[1]];
            if (f.geometryType === 'LineString') return c[Math.floor(c.length / 2)];
            if (f.geometryType === 'Polygon' && Array.isArray(c[0]) && c[0].length) return c[0][0];
            return null;
        }
        function initBrochureMaps() {
            const maps = storyData.maps || [];
            const els = Array.from(document.querySelectorAll('.doc-map-canvas'));
            const statusEl = document.getElementById('print-status');
            if (!els.length || typeof maplibregl === 'undefined') {
                if (statusEl) statusEl.textContent = 'Prêt pour impression PDF A4';
                return;
            }
            let pending = els.length;
            const markDone = () => {
                pending = Math.max(0, pending - 1);
                if (pending === 0 && statusEl) statusEl.textContent = 'Prêt pour impression PDF A4';
            };
            setTimeout(() => { if (statusEl) statusEl.textContent = 'Prêt pour impression PDF A4'; }, 4000);
            els.forEach((el) => {
                const mapId = el.getAttribute('data-map-id'), targetFeatId = el.getAttribute('data-target-feature');
                const scene = maps.find(m => m.id === mapId) || maps[0];
                if (!scene) { markDone(); return; }
                const v = scene.view || { center: [2.3522, 48.8566], zoom: 11, pitch: 0, bearing: 0 };
                const map = new maplibregl.Map({ container: el, style: resolveStyle(scene.mapStyle), center: v.center, zoom: v.zoom, pitch: v.pitch || 0, bearing: v.bearing || 0, interactive: false, attributionControl: false, preserveDrawingBuffer: true });
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
                    map.once('idle', markDone);
                });
                map.on('error', markDone);
            });
        }
        window.addEventListener('DOMContentLoaded', initBrochureMaps);
    </script>
</body>
</html>`;
}

