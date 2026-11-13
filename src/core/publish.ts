/**
 * StoryMap — Générateur et extracteur de page HTML autonome sécurisé (Mode 1 + N2/N3/N4)
 */

import type { StoryMap } from '../types/story';
import { convertLegacyToModern } from './adapter';
import { sanitizeHTML, escapeAttr } from './sanitize';
import { extractProjectThemeTokens, resolveVisualStyle } from './themeResolver';
import { renderPublishedHeroHTML } from './heroRenderer';
import { buildStoryRuntimeScript } from './publishStoryRuntime';

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
  const runtimeScript = buildStoryRuntimeScript(safeAccent);

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
${runtimeScript}
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
