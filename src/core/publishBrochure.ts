/**
 * StoryMap — Générateur de Brochure statique A4 & impression PDF (P5 / N2 / N3 / N4)
 */

import type { StoryMap } from '../types/story';
import { getGridDimensions } from './grid';
import { escapeAttr } from './sanitize';
import { renderPublishedBlockHTML, sanitizePublishedStory } from './publishDocumentBlocks';
import { convertRichDocumentToBrochure } from './brochure';
import { getBrochurePrintStyles } from './publishStyles';
import { getBrochureRuntimeScript } from './publishBrochureRuntime';
import { extractProjectThemeTokens, resolveVisualStyle } from './themeResolver';
import { renderPublishedHeroHTML } from './heroRenderer';

export function generateBrochurePrintHTML(story: StoryMap): string {
  const tokens = extractProjectThemeTokens(story);
  const safeAccent = /^#[0-9a-f]{3,8}$/i.test(tokens.accentColor || '')
    ? tokens.accentColor
    : '#0b7fb0';
  const cleanStory = sanitizePublishedStory(story, safeAccent);
  const { brochure } = convertRichDocumentToBrochure(cleanStory);
  const targetFormat: 'a4-portrait' | 'a4-landscape' =
    cleanStory.format === 'a4-landscape' ? 'a4-landscape' : 'a4-portrait';
  const dims = getGridDimensions(targetFormat);
  const pageOrientation = targetFormat === 'a4-landscape' ? 'landscape' : 'portrait';
  const safeTitle = escapeAttr(cleanStory.title || 'Brochure StoryMap');
  const safeAuthor = escapeAttr(cleanStory.author || '');

  const reimportableStory: StoryMap = {
    ...cleanStory, mode: 'brochure', format: targetFormat, pages: brochure.pages,
  };
  const storyJson = JSON.stringify(reimportableStory).replace(/</g, '\\u003c');
  const pages = brochure.pages || [];

  const sheetsHtml = pages
    .map((page, pIdx) => {
      const pageStyle = resolveVisualStyle(cleanStory, page, null, 'print');
      const heroConfig = page.hero?.enabled ? page.hero : pIdx === 0 && cleanStory.hero?.enabled ? cleanStory.hero : undefined;
      const heroHtml = heroConfig
        ? renderPublishedHeroHTML(heroConfig, page.title || cleanStory.title || '', cleanStory.subtitle || '', cleanStory.brand?.logo || '', 'print', `sheet${pIdx}`)
        : '';
      const blocksHtml = (page.blocks || []).map((b) => renderPublishedBlockHTML(b, safeAccent, cleanStory, page, 'print')).join('\n');
      const pageTitle = escapeAttr(page.title || `Page ${pIdx + 1}`);
      return `<article class="brochure-sheet" id="sheet-${pIdx}" aria-label="${pageTitle}" style="background:${escapeAttr(pageStyle.pageBackground)};color:${escapeAttr(pageStyle.textColor)};font-family:${escapeAttr(pageStyle.bodyFont)},sans-serif;">
        <header class="sheet-header">
          <div>
            <strong style="color:${escapeAttr(pageStyle.accentColor)};font-size:13px;font-family:${escapeAttr(pageStyle.headingFont)},sans-serif;">${safeTitle}</strong>
            ${pIdx === 0 && safeAuthor ? `<span style="margin-left:10px;color:#475569;font-size:11px;">Par ${safeAuthor}</span>` : ''}
          </div>
          <span style="font-size:11px;color:#64748b;">${pageTitle}</span>
        </header>
        ${heroHtml}
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

  const styles = getBrochurePrintStyles(safeAccent, pageOrientation, dims);
  const runtimeScript = getBrochureRuntimeScript(safeAccent);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} — Brochure A4</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css">
    <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <style>${styles}</style>
</head>
<body>
    <div class="print-toolbar no-print">
        <div style="display:flex;align-items:center;gap:12px;">
            <strong>${safeTitle}</strong>
            <span style="font-size:12px;color:#94a3b8;">Format A4 ${pageOrientation === 'landscape' ? 'Paysage (297×210 mm)' : 'Portrait (210×297 mm)'} · ${pages.length} page(s)</span>
            <span id="print-status" style="font-size:11px;padding:2px 8px;border-radius:999px;background:#1e293b;color:#38bdf8;">Préparation des cartes…</span>
        </div>
        <button type="button" class="btn-print" id="btn-print" disabled data-action="print">Imprimer / Enregistrer en PDF A4</button>
    </div>
    <main class="sheets-container">${sheetsHtml}</main>
    <script id="storymap-data" type="application/json">${storyJson}</script>
    <script>${runtimeScript}</script>
</body>
</html>`;
}
