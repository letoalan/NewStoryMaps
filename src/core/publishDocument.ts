/**
 * StoryMap — Générateur d'export HTML autonome pour documents enrichis (Mode 2 / Mode 3, P4 — I05)
 */

import type { StoryMap } from '../types/story';
import { sanitizeHTML } from './sanitize';
import { getGridDimensions } from './grid';
import type { PageFormat } from '../types/grid';

export function generateDocumentHTML(story: StoryMap): string {
  const safeTitle = (story.title || 'Document StoryMap').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeAccent = /^#[0-9a-f]{6}$/i.test(story.appearance?.accentColor) ? story.appearance.accentColor : '#0b7fb0';
  const cleanStory: StoryMap = { ...story, steps: story.steps || [] };
  const storyJson = JSON.stringify(cleanStory).replace(/</g, '\\u003c');

  const pages = story.pages && story.pages.length > 0 ? story.pages : [{
    id: 'p1', title: 'Page 1', layout: { format: 'a4-portrait' as PageFormat, gridColumns: 6, gridRows: 8 }, blocks: [],
  }];

  const pagesHtml = pages.map((page, pIdx) => {
    const fmt = page.layout.format || story.format || 'a4-portrait';
    const dims = getGridDimensions(fmt);

    const blocksHtml = page.blocks.map((b) => {
      let content = '';
      if (b.type === 'title') {
        const lvl = (b.data.level as number) || 2;
        content = `<h${lvl} style="margin:0;color:#1e293b;">${sanitizeHTML((b.data.text as string) || '')}</h${lvl}>`;
      } else if (b.type === 'callout') {
        content = `<div style="padding:10px;background:#f0f9ff;border-left:4px solid ${safeAccent};border-radius:4px;">${sanitizeHTML((b.data.text as string) || '')}</div>`;
      } else if (b.type === 'table') {
        const rows = (b.data.rows as string[][]) || [['-']];
        const rowsMarkup = rows.map((r, ri) => `<tr>${r.map(c => ri === 0 ? `<th style="border:1px solid #cbd5e1;padding:6px;background:#f8fafc;">${sanitizeHTML(c)}</th>` : `<td style="border:1px solid #cbd5e1;padding:6px;">${sanitizeHTML(c)}</td>`).join('')}</tr>`).join('');
        content = `<table style="width:100%;border-collapse:collapse;font-size:12px;">${rowsMarkup}</table>`;
      } else if (b.type === 'image') {
        content = `<img src="${(b.data.url as string) || ''}" alt="${sanitizeHTML((b.data.caption as string) || '')}" style="max-width:100%;max-height:100%;object-fit:cover;border-radius:4px;"/>`;
      } else if (b.type === 'map') {
        content = `<div style="background:#1e293b;color:#f8fafc;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;border-radius:4px;padding:8px;"><span style="font-weight:600;font-size:13px;">${sanitizeHTML((b.data.title as string) || 'Carte')}</span>${b.binding ? `<span style="font-size:11px;color:${safeAccent};">Liaison : ${b.binding.action || 'focus'}</span>` : ''}</div>`;
      } else {
        content = `<div style="font-size:13px;line-height:1.5;">${sanitizeHTML((b.data.text as string) || '')}</div>`;
      }

      return `<div class="block" style="grid-column:${b.x + 1} / span ${b.w};grid-row:${b.y + 1} / span ${b.h};background:#fff;border-radius:6px;padding:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:auto;">${content}</div>`;
    }).join('\n');

    return `<div class="doc-page ${pIdx === 0 ? 'active' : ''}" id="page-${pIdx}" style="display:${pIdx === 0 ? 'inline-block' : 'none'};padding:${dims.marginMm}mm;background:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);margin:20px auto;">
      <div style="display:grid;grid-template-columns:repeat(${dims.cols}, ${dims.cellWidthPx}px);grid-template-rows:repeat(${dims.rows}, ${dims.cellHeightPx}px);gap:${dims.gapPx}px;">
        ${blocksHtml}
      </div>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <style>
        * { box-sizing: border-box; }
        body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#0f172a; color:#f8fafc; min-height:100vh; display:flex; flex-direction:column; }
        header { height:52px; background:rgba(15,23,42,0.95); border-bottom:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:space-between; padding:0 20px; }
        footer { height:52px; background:rgba(15,23,42,0.95); border-top:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; gap:16px; }
        main { flex:1; overflow:auto; display:flex; justify-content:center; align-items:center; padding:24px; }
        .btn { padding:6px 12px; background:#1e293b; color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:6px; cursor:pointer; font-weight:600; font-size:13px; }
        .btn:disabled { opacity:0.3; cursor:default; }
        .btn-primary { background:${safeAccent}; border-color:${safeAccent}; }
        .dot { width:8px; height:8px; border-radius:4px; background:rgba(255,255,255,0.3); cursor:pointer; transition:all 0.2s; }
        .dot.active { width:20px; background:${safeAccent}; }
    </style>
</head>
<body>
    <header>
        <span style="font-weight:700;font-size:15px;">${safeTitle}</span>
        <button class="btn" onclick="toggleFs()">Plein écran</button>
    </header>
    <main id="main-stage">
        ${pagesHtml}
    </main>
    <footer>
        <button class="btn" id="prev-btn" onclick="setPage(curPage - 1)">Précédent</button>
        <div style="display:flex;gap:6px;align-items:center;" id="dots-container"></div>
        <span id="page-num" style="font-size:12px;color:#94a3b8;"></span>
        <button class="btn" id="next-btn" onclick="setPage(curPage + 1)">Suivant</button>
    </footer>
    <script id="storymap-data" type="application/json">${storyJson}</script>
    <script>
        const total = ${pages.length};
        let curPage = 0;
        function updateUI() {
            for (let i = 0; i < total; i++) {
                const el = document.getElementById('page-' + i);
                if (el) el.style.display = i === curPage ? 'inline-block' : 'none';
            }
            document.getElementById('prev-btn').disabled = curPage <= 0;
            document.getElementById('next-btn').disabled = curPage >= total - 1;
            document.getElementById('page-num').textContent = (curPage + 1) + ' / ' + total;
            const dc = document.getElementById('dots-container');
            dc.innerHTML = '';
            for (let i = 0; i < total; i++) {
                const d = document.createElement('div');
                d.className = 'dot' + (i === curPage ? ' active' : '');
                d.onclick = () => setPage(i);
                dc.appendChild(d);
            }
        }
        function setPage(n) { if (n >= 0 && n < total) { curPage = n; updateUI(); } }
        function toggleFs() { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') setPage(curPage + 1);
            else if (e.key === 'ArrowLeft') setPage(curPage - 1);
        });
        updateUI();
    </script>
</body>
</html>`;
}
