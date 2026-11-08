/**
 * Script de validation automatisée P6 (K01 -> K07)
 * Vérifie : circuit touristique 5 étapes dans les 3 modes (K01), comparaison territoriale multi-cartes (K02),
 * accessibilité, clavier et réduction des mouvements (K03), charge et saturation de grille (K04),
 * résolution précise des associations narratives et réimport médias Mode 2/3.
 */

import assert from 'node:assert';
import { generateStandaloneHTML, extractStoryFromHTML } from '../src/core/publish.ts';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';
import { convertRichDocumentToBrochure, runBrochurePreflight } from '../src/core/brochure.ts';
import { convertLegacyToModern, convertModernToLegacyV2 } from '../src/core/adapter.ts';
import { updateMapView, createDefaultProjectMap } from '../src/core/mapScene.ts';
import { refitBlocksDetailed, hasCollision } from '../src/core/grid.ts';
import { computeNextPageIndex, shouldIgnoreReaderKeyEvent } from '../src/core/readerNavigation.ts';
import { parseStoryFile } from '../src/core/io.ts';
import { createZip } from '../src/core/zip.ts';

console.log('=== LANCEMENT DE LA RECETTE FINALE P6 (K01 -> K07) ===\n');

// 1. K01 : Circuit touristique cinq étapes dans les 3 modes & associations ciblées
function testFiveStepTourInThreeModes() {
  console.log('Test 1 : Circuit touristique 5 étapes dans les 3 modes (K01)...');
  const tourStory = {
    id: 'tour-paris-5', version: '2.0.0', title: 'Circuit Patrimoine Parisien', author: 'Guide Officiel',
    created: 1700000000000, modified: 1700000010000, mode: 'storymap',
    appearance: { theme: 'light', font: 'Inter', accentColor: '#0b7fb0', routeStyle: 'airplane', markerShape: 'pin', showAllMarkers: true },
    mapStyle: 'voyager', layers: [],
    steps: [
      { id: 's1', title: 'Tour Eiffel', description: '<p>Monument phare.</p>', camera: { center: [2.2945, 48.8584], zoom: 14, pitch: 20, bearing: 0 } },
      { id: 's2', title: 'Invalides', description: '<p>Dôme doré.</p>', camera: { center: [2.3126, 48.8566], zoom: 14, pitch: 20, bearing: 15 } },
      { id: 's3', title: 'Louvre', description: '<p>Palais et pyramide.</p>', camera: { center: [2.3376, 48.8606], zoom: 14, pitch: 25, bearing: 30 } },
      { id: 's4', title: 'Notre-Dame', description: '<p>Cathédrale de l’île de la Cité.</p>', camera: { center: [2.3499, 48.8530], zoom: 14, pitch: 10, bearing: 0 } },
      { id: 's5', title: 'Montmartre', description: '<p>Basilique du Sacré-Cœur.</p>', camera: { center: [2.3431, 48.8867], zoom: 14, pitch: 30, bearing: 45 } },
    ],
  };

  // Mode 1 : StoryMap classique
  const htmlMode1 = generateStandaloneHTML(tourStory);
  assert.ok(htmlMode1.includes('Circuit Patrimoine Parisien'));
  assert.ok(htmlMode1.includes('Montmartre'));
  assert.ok(htmlMode1.includes('maplibre-gl'));
  const reopened1 = extractStoryFromHTML(htmlMode1);
  assert.strictEqual(reopened1.steps.length, 5);
  const v2Exchange = convertModernToLegacyV2(tourStory);
  assert.strictEqual(v2Exchange.story?.chapters?.length, 5);
  assert.strictEqual(convertLegacyToModern(v2Exchange).steps.length, 5);

  // Mode 2 : Document enrichi avec ciblage narratif précis par ID
  const docStory = {
    ...tourStory, mode: 'rich-document', format: 'a4-portrait',
    maps: [{
      id: 'map-tour', name: 'Plan du Circuit', mapStyle: 'positron', view: { center: [2.34, 48.86], zoom: 12 },
      layers: [{
        id: 'l-points', name: 'Étapes', visible: true,
        features: tourStory.steps.map((st, i) => ({ id: `f-${st.id}`, name: st.title, geometryType: 'Point', coordinates: st.camera.center, numberIndex: i + 1 })),
      }],
    }],
    pages: [{
      id: 'p-tour-1', title: 'Les 5 merveilles', layout: { format: 'a4-portrait', gridColumns: 6, gridRows: 8 },
      blocks: [
        { id: 'b-title', type: 'title', x: 0, y: 0, w: 6, h: 1, data: { text: 'Parcours des 5 merveilles', level: 1 } },
        { id: 'b-map', type: 'map', x: 0, y: 1, w: 4, h: 4, data: { title: 'Carte interactive', mapId: 'map-tour', caption: '© OpenStreetMap · © CARTO' } },
        { id: 'b-txt', type: 'text', x: 4, y: 1, w: 2, h: 4, data: { text: 'Départ Tour Eiffel.' }, binding: { mapId: 'map-tour', targetFeatureId: 'f-s1', action: 'highlight', numberIndex: 1 } },
      ],
    }],
  };
  const htmlMode2 = generateDocumentHTML(docStory);
  assert.ok(htmlMode2.includes('data-action="narrative-binding"'));
  assert.ok(htmlMode2.includes("['==', ['get', 'id'], featId]"), 'Action narrative filtrée par ID exact de figuré');
  assert.ok(htmlMode2.includes('doc-map-marker'), 'Marqueurs de points identifiés pour actions narratives');
  assert.ok(htmlMode2.includes('scale(1.4)'), 'Surbrillance visuelle animée sur les marqueurs de points');
  const reopened2 = extractStoryFromHTML(htmlMode2);
  assert.strictEqual(reopened2.maps[0].layers[0].features.length, 5);

  // Mode 3 : Brochure statique A4
  const { brochure, report } = convertRichDocumentToBrochure(docStory);
  assert.strictEqual(brochure.mode, 'brochure');
  assert.strictEqual(report.numberedBindingsCount, 1);
  const preflight = runBrochurePreflight(brochure);
  assert.strictEqual(preflight.ready, true);
  const htmlMode3 = generateBrochurePrintHTML(brochure);
  assert.ok(htmlMode3.includes('@page { size: A4 portrait; margin: 0; }'));
  assert.ok(htmlMode3.includes('id="btn-print" disabled'));
  const reopened3 = extractStoryFromHTML(htmlMode3);
  assert.strictEqual(reopened3.mode, 'brochure');
  console.log('  -> Circuit touristique 5 étapes validé dans les 3 modes (K01).');
}

// 2. K02 : Récit historique, comparaison territoriale et anciens formats
function testHistoricalAndTerritorialComparison() {
  console.log('Test 2 : Comparaison territoriale multi-cartes et formats anciens (K02)...');
  const map1850 = createDefaultProjectMap('map-1850', 'Paris en 1850');
  const map2026 = createDefaultProjectMap('map-2026', 'Grand Paris 2026');
  const updated1850 = updateMapView(map1850, { center: [2.32, 48.85], zoom: 13, pitch: 10 });
  const updated2026 = updateMapView(map2026, { center: [2.40, 48.90], zoom: 11, pitch: 40 });

  assert.notDeepStrictEqual(updated1850.view.center, updated2026.view.center);
  assert.notStrictEqual(updated1850.view.zoom, updated2026.view.zoom);

  const legacyV1 = { format: 'maplibre-storymap', chapters: [{ id: 'ch1', title: 'Ancien site', text: 'Sans caméra explicite' }] };
  const normalizedV1 = convertLegacyToModern(legacyV1);
  assert.strictEqual(normalizedV1.steps.length, 1);
  assert.ok(Array.isArray(normalizedV1.steps[0].camera.center));
  console.log('  -> Comparaison multi-cartes et résilience formats historiques validées (K02).');
}

// 3. K03 : Clavier, mobile, accessibilité et réduction de mouvements
function testAccessibilityAndControls() {
  console.log('Test 3 : Clavier, mobile, accessibilité ARIA et réduction des mouvements (K03)...');
  assert.strictEqual(shouldIgnoreReaderKeyEvent({ tagName: 'INPUT' }), true);
  assert.strictEqual(shouldIgnoreReaderKeyEvent({ tagName: 'TEXTAREA' }), true);
  assert.strictEqual(shouldIgnoreReaderKeyEvent({ tagName: 'CANVAS', closest: (s) => s === '.maplibregl-map' ? {} : null }), true);
  assert.strictEqual(shouldIgnoreReaderKeyEvent({ tagName: 'BUTTON', closest: (s) => s === '[data-carousel-control="true"]' ? {} : null }), true);
  assert.strictEqual(shouldIgnoreReaderKeyEvent({ tagName: 'MAIN', closest: () => null }), false);

  assert.strictEqual(computeNextPageIndex(0, 5, 'prev'), 0);
  assert.strictEqual(computeNextPageIndex(4, 5, 'next'), 4);
  assert.strictEqual(computeNextPageIndex(2, 5, 'next'), 3);

  const dummyDoc = {
    id: 'd-aria', version: '2.0.0', title: 'Doc ARIA', created: 1, modified: 1, mode: 'rich-document', format: 'a4-portrait',
    pages: [{ id: 'p1', title: 'Accueil', layout: { format: 'a4-portrait', gridColumns: 6, gridRows: 8 }, blocks: [] }],
  };
  const html = generateDocumentHTML(dummyDoc);
  assert.ok(html.includes('aria-label="Sommaire du document"'));
  assert.ok(html.includes('aria-expanded="false"'));
  assert.ok(html.includes('role="group"'));
  assert.ok(html.includes('prefers-reduced-motion'));
  console.log('  -> Arbitrage clavier, navigation bornée et accessibilité ARIA validés (K03).');
}

// 4. K04 : Saturation de grille, stress-test et intégrité des données
function testGridSaturationAndStress() {
  console.log('Test 4 : Saturation de grille et stress-test d’intégrité (K04)...');
  const inputBlocks = Array.from({ length: 10 }, (_, i) => ({
    id: `blk-${i + 1}`, type: 'text', x: 0, y: 0, w: 1, h: 1, data: { text: `Bloc ${i + 1}` },
  }));
  const res = refitBlocksDetailed(inputBlocks, 2, 2);
  assert.strictEqual(res.placed.length, 4, 'Exactement 4 cellules 1x1 peuvent occuper la grille 2x2');
  assert.strictEqual(res.unplaced.length, 6, 'Les 6 blocs excédentaires doivent être isolés sans collision');
  assert.strictEqual(res.overflowCount, 6);

  for (const b of res.placed) {
    assert.strictEqual(hasCollision(b, res.placed, b.id), false, `Collision détectée pour ${b.id}`);
  }
  console.log('  -> Saturation extrême de grille gérée sans collision (K04).');
}

// 5. Réimportation d'images relatives en Mode 2 / 3 depuis une archive ZIP
async function testZipRelativeImagesMode2() {
  console.log('Test 5 : Réimportation d’images relatives dans pages & blocs Mode 2 / 3 (io.ts)...');
  const testImgBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // mini entête png
  const docWithRelativeImages = {
    id: 'doc-zip-rel', version: '2.0.0', title: 'Doc Archive', created: 1, modified: 1, mode: 'rich-document', format: 'a4-portrait',
    pages: [{
      id: 'p1', title: 'P1', layout: { format: 'a4-portrait', gridColumns: 6, gridRows: 8 },
      blocks: [
        { id: 'b-img', type: 'image', x: 0, y: 0, w: 2, h: 2, data: { url: './assets/photo.png' } },
        { id: 'b-sheet', type: 'image', x: 2, y: 0, w: 2, h: 2, data: { isContactSheet: true, contactSheetItems: [{ url: 'assets/photo.png' }] } },
        { id: 'b-gal', type: 'gallery', x: 0, y: 2, w: 2, h: 2, data: { items: ['assets/photo.png'] } },
        { id: 'b-txt', type: 'text', x: 2, y: 2, w: 2, h: 2, data: { text: '<p><img src="assets/photo.png"></p>' } },
      ],
    }],
  };
  const zipBlob = await createZip([
    { name: 'doc-zip-rel/storymap.json', data: JSON.stringify(docWithRelativeImages) },
    { name: 'doc-zip-rel/assets/photo.png', data: testImgBytes },
  ]);
  const importedList = await parseStoryFile(zipBlob);
  assert.strictEqual(importedList.length, 1);
  const importedDoc = importedList[0];
  const bImg = importedDoc.pages[0].blocks[0];
  const bSheet = importedDoc.pages[0].blocks[1];
  const bGal = importedDoc.pages[0].blocks[2];
  const bTxt = importedDoc.pages[0].blocks[3];
  assert.ok(bImg.data.url.startsWith('data:image/png;base64,'), 'Image simple convertie');
  assert.ok(bSheet.data.contactSheetItems[0].url.startsWith('data:image/png;base64,'), 'Planche contact convertie');
  assert.ok(bGal.data.items[0].startsWith('data:image/png;base64,'), 'Galerie items convertie');
  assert.ok(bTxt.data.text.includes('src="data:image/png;base64,'), 'Image HTML interne de bloc convertie');
  console.log('  -> Résolution des images relatives Mode 2/3 dans ZIP validée.');
}

async function runAll() {
  testFiveStepTourInThreeModes();
  testHistoricalAndTerritorialComparison();
  testAccessibilityAndControls();
  testGridSaturationAndStress();
  await testZipRelativeImagesMode2();
  console.log('\n=== TOUTES LES VÉRIFICATIONS P6 (K01 -> K07) ONT RÉUSSI AVEC SUCCÈS ! ===');
}

runAll().catch((err) => {
  console.error('\n❌ ERREUR LORS DE LA VALIDATION P6 :', err);
  process.exit(1);
});
