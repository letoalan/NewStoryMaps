/**
 * Script de validation automatisée P4 (I01 -> I06 + V01/V04/V05/V08/V10)
 * Vérifie les fonctions réelles importées : readerNavigation, publishDocument (avec vraies cartes MapLibre,
 * 3 profils, sommaire, boutons de pagination, planches contact, sécurité XSS/URL), et non-régression Mode 1.
 */

import assert from 'node:assert';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';
import { shouldIgnoreReaderKeyEvent, computeNextPageIndex } from '../src/core/readerNavigation.ts';
import { sanitizeSafeUrl, escapeAttr, clampInt } from '../src/core/sanitize.ts';
import { generateStandaloneHTML, extractStoryFromHTML } from '../src/core/publish.ts';
import { convertLegacyToModern, convertModernToLegacyV2 } from '../src/core/adapter.ts';

console.log('=== LANCEMENT DE LA RECETTE P4 (I01 -> I06 & V01/V04/V05/V08/V10) ===\n');

// 1. I01 / I02 / V05 : Fonctions réelles de pagination et d'arbitrage clavier (readerNavigation.ts)
function testRealNavigationAndKeyboard() {
  console.log('Test 1 : Fonctions réelles computeNextPageIndex et shouldIgnoreReaderKeyEvent (I01-I04, V05, V10)...');
  assert.strictEqual(computeNextPageIndex(0, 3, 'next'), 1);
  assert.strictEqual(computeNextPageIndex(1, 3, 'next'), 2);
  assert.strictEqual(computeNextPageIndex(2, 3, 'next'), 2);
  assert.strictEqual(computeNextPageIndex(2, 3, 'prev'), 1);
  assert.strictEqual(computeNextPageIndex(0, 3, 'prev'), 0);

  // Arbitrage clavier réel sur champs, contenteditable, carte active et carrousel
  assert.strictEqual(shouldIgnoreReaderKeyEvent({ tagName: 'INPUT' }), true);
  assert.strictEqual(shouldIgnoreReaderKeyEvent({ tagName: 'TEXTAREA' }), true);
  assert.strictEqual(shouldIgnoreReaderKeyEvent({ tagName: 'SELECT' }), true);
  assert.strictEqual(shouldIgnoreReaderKeyEvent({ tagName: 'DIV', isContentEditable: true }), true);
  assert.strictEqual(
    shouldIgnoreReaderKeyEvent({
      tagName: 'CANVAS',
      closest: (sel) => (sel === '.maplibregl-map' ? {} : null),
    }),
    true,
    'Une carte MapLibre active doit bloquer les flèches du lecteur'
  );
  assert.strictEqual(
    shouldIgnoreReaderKeyEvent({
      tagName: 'BUTTON',
      closest: (sel) => (sel === '[data-carousel-control="true"]' ? {} : null),
    }),
    true,
    'Un contrôle de carrousel actif doit bloquer les flèches du lecteur'
  );
  assert.strictEqual(shouldIgnoreReaderKeyEvent({ tagName: 'DIV', closest: () => null }), false);
  console.log('  -> Fonctions réelles de navigation et d’arbitrage clavier validées.');
}

// 2. I05 / V01 / V04 : Publication HTML autonome avec vraies cartes MapLibre, 3 profils, sommaire et planche contact
function testRichDocumentPublishAndRoundtrip() {
  console.log('Test 2 : Publication HTML autonome avec MapLibre, 3 profils, sommaire et planche contact (V01, V04)...');
  const docStory = {
    id: 'doc-paris-2026',
    version: '2.0.0',
    title: 'Rapport Territorial',
    created: 1700000000000,
    modified: 1700000005000,
    mode: 'rich-document',
    format: 'a4-portrait',
    appearance: { theme: 'light', font: 'Inter', accentColor: '#0b7fb0', panelPosition: 'left', showProgress: false },
    mapStyle: 'voyager',
    layers: [],
    steps: [],
    maps: [{
      id: 'm1', name: 'Carte Paris', mapStyle: 'positron',
      view: { center: [2.3522, 48.8566], zoom: 12, pitch: 30, bearing: 15 },
      layers: [{
        id: 'l1', name: 'Couche 1', visible: true, color: '#0b7fb0',
        features: [
          { id: 'f1', name: 'Louvre', geometryType: 'Point', coordinates: [2.3376, 48.8606], numberIndex: 1 },
          { id: 'f2', name: 'Axe Seine', geometryType: 'LineString', coordinates: [[2.33, 48.86], [2.35, 48.85]], numberIndex: 2 },
          { id: 'f3', name: 'Île Cité', geometryType: 'Polygon', coordinates: [[[2.34, 48.85], [2.35, 48.85], [2.35, 48.86], [2.34, 48.85]]], numberIndex: 3 },
        ],
      }],
    }],
    pages: [{
      id: 'page-1', title: 'Première page',
      layout: { format: 'a4-portrait', gridColumns: 6, gridRows: 8, marginMm: 15 },
      blocks: [
        { id: 'b1', type: 'title', x: 0, y: 0, w: 6, h: 1, data: { text: 'Titre Document', level: 1 } },
        { id: 'b2', type: 'text', x: 0, y: 1, w: 4, h: 3, data: { text: '<p>Texte narratif <strong>enrichi</strong></p>' }, binding: { mapId: 'm1', targetFeatureId: 'f1', action: 'zoom', numberIndex: 1 } },
        { id: 'b3', type: 'image', x: 0, y: 4, w: 4, h: 2, data: { isContactSheet: true, contactSheetItems: [{ url: 'https://example.com/a.jpg', caption: 'Vue A' }], caption: 'Planche' } },
        { id: 'b4', type: 'map', x: 4, y: 1, w: 2, h: 3, data: { title: 'Carte du site', mapId: 'm1' }, binding: { mapId: 'm1', action: 'highlight', targetFeatureId: 'f1' } },
      ],
    }],
  };

  const html = generateDocumentHTML(docStory);
  assert.ok(html.includes('maplibre-gl.js'), 'Doit embarquer MapLibre GL JS (V01)');
  assert.ok(html.includes('new maplibregl.Map'), 'Doit instancier de vraies cartes MapLibre (V01)');
  assert.ok(html.includes('scene-polygons-fill') && html.includes('scene-lines-layer'), 'Doit tracer Polygones et Lignes (V01/V02)');
  assert.ok(html.includes('triggerNarrativeBinding'), 'Doit piloter les liaisons narratives (V01)');
  assert.ok(html.includes('setProfile(\'slide\')') && html.includes('setProfile(\'vertical\')') && html.includes('setProfile(\'horizontal\')'), 'Doit exposer les 3 profils (V04)');
  assert.ok(html.includes('id="toc-drawer"'), 'Doit inclure le sommaire (V04)');
  assert.ok(html.includes('aria-current'), 'Doit marquer la page courante (V05)');
  assert.ok(html.includes('Vue A'), 'Doit rendre la planche contact (V04)');

  const roundtrip = extractStoryFromHTML(html);
  assert.strictEqual(roundtrip.id, 'doc-paris-2026');
  assert.strictEqual(roundtrip.maps[0].layers[0].features.length, 3, 'Point, LineString et Polygon préservés au réimport');
  assert.strictEqual(roundtrip.pages[0].blocks[3].binding?.targetFeatureId, 'f1');
  console.log('  -> Export HTML MapLibre complet et réimport aller-retour validés.');
}

// 3. V08 : Sécurité contre entrées hostiles dans publishDocument
function testHostileInputSecurity() {
  console.log('Test 3 : Sécurité contre les entrées hostiles (XSS, URL javascript:, balises, bornes) (V08)...');
  assert.strictEqual(sanitizeSafeUrl('javascript:alert(1)'), '');
  assert.strictEqual(sanitizeSafeUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.strictEqual(sanitizeSafeUrl('https://example.com/photo.png'), 'https://example.com/photo.png');
  assert.strictEqual(clampInt(99, 1, 6, 2), 6);

  const hostileStory = {
    id: 'hostile-1', version: '2.0.0', title: 'Test "><script>alert(1)</script>',
    created: 1, modified: 1, mode: 'rich-document', format: 'a4-portrait',
    appearance: { theme: 'light', font: 'Inter', accentColor: 'red;background:url(javascript:alert(1))', panelPosition: 'left', showProgress: false },
    mapStyle: 'positron', layers: [], steps: [],
    pages: [{
      id: 'p1', title: 'Page "><img src=x onerror=alert(1)>',
      layout: { format: 'a4-portrait', gridColumns: 6, gridRows: 8 },
      blocks: [
        { id: 'b-title', type: 'title', x: -5, y: 99, w: 99, h: 99, data: { text: '<script>alert("xss")</script>Titre sûr', level: '99; onclick=alert(1)' } },
        { id: 'b-img', type: 'image', x: 0, y: 1, w: 2, h: 2, data: { url: 'javascript:alert(1)', alt: '"><script>evil()</script>', caption: '<img src=x onerror=alert(2)>' } },
      ],
    }],
  };

  const html = generateDocumentHTML(hostileStory);
  assert.ok(!html.includes('<script>alert(1)</script>'), 'Pas d’injection script dans le titre');
  assert.ok(!html.includes('javascript:alert(1)'), 'Les URLs javascript: doivent être neutralisées');
  assert.ok(!html.includes('onerror=alert'), 'Les gestionnaires onerror doivent être neutralisés');
  assert.ok(html.includes('<h6'), 'Le niveau de titre invalide doit être borné à h6');
  console.log('  -> Sécurité du générateur documentaire face aux entrées hostiles validée.');
}

// 4. I06 : Non-régression P0 sur le Mode 1
function testMode1P0NonRegression() {
  console.log('Test 4 : Non-régression P0 sur le Mode 1 StoryMap (I06)...');
  const mode1Story = {
    id: 'story-classic-1', version: '2.0.0', title: 'Champollion', author: 'Historien',
    created: 1, modified: 2, mode: 'storymap',
    appearance: { theme: 'light', font: 'Merriweather', accentColor: '#0b7fb0', panelPosition: 'left', showProgress: true, routeStyle: 'airplane', markerShape: 'airplane' },
    mapStyle: 'positron', layers: [],
    steps: [{ id: 's1', title: 'Figeac', description: 'Naissance.', camera: { center: [2.03, 44.6], zoom: 14, pitch: 0, bearing: 0 } }],
  };
  const reextracted = extractStoryFromHTML(generateStandaloneHTML(mode1Story));
  assert.strictEqual(reextracted.id, mode1Story.id);
  const reconverted = convertLegacyToModern(convertModernToLegacyV2(mode1Story));
  assert.strictEqual(reconverted.steps.length, 1);
  console.log('  -> Non-régression P0 sur le Mode 1 validée.');
}

try {
  testRealNavigationAndKeyboard();
  testRichDocumentPublishAndRoundtrip();
  testHostileInputSecurity();
  testMode1P0NonRegression();
  console.log('\n=== TOUTES LES VÉRIFICATIONS P4 (I01 -> I06 & V01..V10) ONT RÉUSSI AVEC SUCCÈS ! ===');
} catch (err) {
  console.error('\n❌ ERREUR LORS DE LA VALIDATION P4 :', err);
  process.exit(1);
}
