/**
 * StoryMap — Générateur d'export HTML autonome pour documents enrichis avec cartes MapLibre (P4 — V01/V04/V05/V08)
 */

import type { StoryMap } from '../types/story';
import type { PageFormat } from '../types/grid';
import { escapeAttr } from './sanitize';
import { renderPublishedPageHTML, sanitizePublishedStory } from './publishDocumentBlocks';
import { getDocumentViewerStyles } from './publishStyles';
import { getDocumentRuntimeScript } from './publishDocumentRuntime';

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
  const sommaireHtml = pages.map((p, idx) => `<button type="button" class="toc-item" id="toc-${idx}" data-action="goto-page" data-page-idx="${idx}"><strong>${idx + 1}.</strong> ${escapeAttr(p.title || `Page ${idx + 1}`)}</button>`).join('\n');
  const styles = getDocumentViewerStyles(safeAccent);
  const scriptContent = getDocumentRuntimeScript(pages.length, safeAccent);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css">
    <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <style>${styles}</style>
</head>
<body>
    <header>
        <div style="display:flex;align-items:center;gap:10px;">
            <button type="button" class="btn" id="toc-btn" aria-expanded="false" data-action="toggle-toc">Sommaire</button>
            <span style="font-weight:700;font-size:14px;">${safeTitle}</span>
        </div>
        <div role="group" aria-label="Profil de présentation" style="display:flex;gap:4px;">
            <button type="button" class="btn active" id="prof-slide" data-action="set-profile" data-profile="slide">Diapositive</button>
            <button type="button" class="btn" id="prof-vertical" data-action="set-profile" data-profile="vertical">Vertical</button>
            <button type="button" class="btn" id="prof-horizontal" data-action="set-profile" data-profile="horizontal">Horizontal</button>
        </div>
        <button type="button" class="btn" id="fs-btn" data-action="toggle-fs">Plein écran</button>
    </header>
    <aside id="toc-drawer" aria-label="Sommaire du document">
        <h3 style="margin:0 0 10px;font-size:13px;color:#f8fafc;">Sommaire</h3>
        ${sommaireHtml}
    </aside>
    <main id="main-stage" class="profile-slide">${pagesHtml}</main>
    <footer id="slide-footer">
        <button type="button" class="btn" id="prev-btn" aria-label="Page précédente" data-action="prev-page">Précédent</button>
        <div role="navigation" aria-label="Pagination" style="display:flex;gap:6px;align-items:center;" id="dots-container"></div>
        <span id="page-num" aria-live="polite" style="font-size:12px;color:#94a3b8;"></span>
        <button type="button" class="btn" id="next-btn" aria-label="Page suivante" data-action="next-page">Suivant</button>
    </footer>
    <script id="storymap-data" type="application/json">${storyJson}</script>
    <script>${scriptContent}</script>
</body>
</html>`;
}
