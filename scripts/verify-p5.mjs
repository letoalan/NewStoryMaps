/**
 * Script de validation automatisée P5 (J01 -> J11 & C04 / C06 / C07)
 * Vérifie : restriction statique (J01), conversion par copie avec numérotation synchronisée (C06),
 * prévol honnête des attributions (C07), readiness et protection impression (C04), et réimportation (J11).
 */

import assert from 'node:assert';
import { isBlockAllowedInBrochure, convertRichDocumentToBrochure, runBrochurePreflight } from '../src/core/brochure.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';
import { extractStoryFromHTML } from '../src/core/publish.ts';
import { updateMapView } from '../src/core/mapScene.ts';

console.log('=== LANCEMENT DE LA RECETTE P5 (J01 -> J11 & C04/C06/C07) ===\n');

// 1. Restriction du Mode 3
function testMode3StaticRestrictions() {
  console.log('Test 1 : Restriction du Mode 3 aux blocs statiques (J01)...');
  ['title', 'text', 'callout', 'image', 'table', 'map', 'legend', 'source'].forEach(t => {
    assert.strictEqual(isBlockAllowedInBrochure(t), true);
  });
  assert.strictEqual(isBlockAllowedInBrochure('gallery'), false, 'Carrousel dynamique exclu');
  console.log('  -> Restriction J01 validée.');
}

// 2. Conversion Mode 2 -> Mode 3 avec immutabilité, synchronisation et pages de suite (C06)
function testMode2ToMode3Conversion() {
  console.log('Test 2 : Conversion par copie, immutabilité et pages de suite (C06, J02, J03)...');
  const sourceDoc = {
    id: 'doc-source-2', version: '2.0.0', title: 'Diagnostic Urbain', author: 'Atelier Urbanisme',
    created: 1, modified: 2, mode: 'rich-document', format: 'screen-16-9',
    appearance: { theme: 'light', font: 'Inter', accentColor: '#0b7fb0', panelPosition: 'left', showProgress: false },
    mapStyle: 'positron', layers: [], steps: [],
    maps: [{
      id: 'm1', name: 'Carte Site', mapStyle: 'positron', view: { center: [2.35, 48.85], zoom: 12 },
      layers: [{
        id: 'l1', name: 'Couche 1', visible: true,
        features: [
          { id: 'f-louvre', name: 'Louvre', geometryType: 'Point', coordinates: [2.33, 48.86], numberIndex: 42 },
          { id: 'f-tuileries', name: 'Tuileries', geometryType: 'Point', coordinates: [2.32, 48.86] },
        ],
      }],
    }],
    pages: [{
      id: 'p1', title: 'Secteur Nord', layout: { format: 'screen-16-9', gridColumns: 8, gridRows: 4 },
      blocks: [
        { id: 'b-gal', type: 'gallery', x: 0, y: 0, w: 4, h: 2, data: { items: [{ url: 'https://example.com/1.jpg', caption: 'Photo 1' }] } },
        { id: 'b-txt1', type: 'text', x: 0, y: 2, w: 2, h: 2, data: { text: 'Appel 1' }, binding: { mapId: 'm1', targetFeatureId: 'f-louvre', action: 'zoom' } },
        { id: 'b-txt2', type: 'text', x: 2, y: 2, w: 2, h: 2, data: { text: 'Appel 2' }, binding: { mapId: 'm1', targetFeatureId: 'f-louvre', action: 'highlight' } },
        // Ajout de 60 blocs pour saturer la grille et forcer une page de suite
        ...Array.from({ length: 60 }, (_, i) => ({
          id: `b-extra-${i}`, type: 'text', x: 0, y: 0, w: 2, h: 2, data: { text: `Extra ${i}` },
        })),
      ],
    }],
  };

  const { brochure, report } = convertRichDocumentToBrochure(sourceDoc);
  assert.notStrictEqual(brochure.id, sourceDoc.id);
  assert.strictEqual(brochure.mode, 'brochure');
  assert.strictEqual(brochure.format, 'a4-portrait');
  assert.strictEqual(report.adaptedGalleriesCount, 1);
  assert.strictEqual(report.numberedBindingsCount, 2);

  // Vérifier l'immutabilité stricte : f-tuileries ne doit PAS avoir été muté dans sourceDoc
  const sourceTuileries = sourceDoc.maps[0].layers[0].features.find((f) => f.id === 'f-tuileries');
  assert.strictEqual(sourceTuileries.numberIndex, undefined, 'sourceDoc.maps ne doit pas être muté en place !');
  const brochureTuileries = brochure.maps[0].layers[0].features.find((f) => f.id === 'f-tuileries');
  assert.strictEqual(brochureTuileries.numberIndex, 43, 'brochure.maps reçoit son propre numéro index');

  // Vérifier la création de pages de suite : les 63 blocs doivent être placés sans perte
  const totalBrochureBlocks = brochure.pages.reduce((acc, p) => acc + p.blocks.length, 0);
  assert.strictEqual(totalBrochureBlocks, 63, 'Aucun bloc ne doit être perdu lors de la conversion A4');
  assert.ok(brochure.pages.length > 1, 'Des pages de suite doivent être créées pour absorber le débordement');

  console.log('  -> Conversion Mode 2 -> 3, immutabilité et pages de suite (C06) validées.');
}

// 3. Contrôle prévol honnête des attributions (C07)
function testHonestPreflight() {
  console.log('Test 3 : Contrôle prévol honnête des attributions et flux textuel (C07, J10)...');
  const incompleteStory = {
    id: 'broch-warn', version: '2.0.0', title: 'Brochure Incomplète',
    created: 1, modified: 1, mode: 'brochure', format: 'screen-16-9',
    appearance: { theme: 'light', font: 'Inter', accentColor: '#0b7fb0', panelPosition: 'left', showProgress: false },
    mapStyle: 'esri-satellite', layers: [], steps: [],
    maps: [{ id: 'map-esri', name: 'Carte Esri', mapStyle: 'satellite', layers: [] }],
    pages: [{
      id: 'p1', title: 'Page 1', layout: { format: 'screen-16-9', gridColumns: 6, gridRows: 8 },
      blocks: [
        { id: 'b-map', type: 'map', x: 0, y: 0, w: 2, h: 2, data: { title: 'Vue satellite', mapId: 'map-esri' } },
        { id: 'b-img-empty', type: 'image', x: 2, y: 0, w: 2, h: 2, data: { url: '' } },
      ],
    }],
  };

  const rep = runBrochurePreflight(incompleteStory);
  assert.strictEqual(rep.ready, false);
  assert.strictEqual(rep.attributionsPresent, false, 'Doit détecter l’absence des crédits spécifiques Esri');
  assert.ok(rep.issues.some((i) => i.code === 'MISSING_MAP_ATTRIBUTION' && i.message.includes('Esri')));
  assert.strictEqual(rep.selectableTextGuaranteed, false, 'C07 : pas de fausse garantie vectorielle avant impression réelle');

  // Test référence de carte inexistante
  incompleteStory.pages[0].blocks[0].data.mapId = 'map-fantome';
  const repGhost = runBrochurePreflight(incompleteStory);
  assert.strictEqual(repGhost.ready, false);
  assert.ok(repGhost.issues.some((i) => i.code === 'MISSING_MAP_SCENE'), 'Doit bloquer si la carte référencée n’existe pas');
  incompleteStory.pages[0].blocks[0].data.mapId = 'map-esri';

  // Résolution conforme
  incompleteStory.format = 'a4-portrait';
  incompleteStory.pages[0].layout.format = 'a4-portrait';
  incompleteStory.pages[0].blocks[1].data.url = 'https://example.com/ok.jpg';
  incompleteStory.pages[0].blocks.push({ id: 'b-src', type: 'source', x: 4, y: 0, w: 2, h: 1, data: { text: 'Source : © Esri, Maxar, Earthstar 2026' } });

  const repOk = runBrochurePreflight(incompleteStory);
  assert.strictEqual(repOk.ready, true);
  assert.strictEqual(repOk.attributionsPresent, true);
  assert.strictEqual(repOk.selectableTextPresent, true);
  console.log('  -> Prévol honnête (C07) validé.');
}

// 4. Génération Brochure A4, readiness et protection d'impression (C04/C05/J11)
function testBrochurePrintGenerationAndReopen() {
  console.log('Test 4 : Génération Brochure A4, readiness d’impression et réouverture (C04, C05, J11)...');
  const story = {
    id: 'brochure-a4-1', version: '2.0.0', title: 'Atlas Patrimonial', author: 'Conservateur',
    created: 1, modified: 2, mode: 'brochure', format: 'a4-landscape',
    appearance: { theme: 'light', font: 'Inter', accentColor: '#0b7fb0', panelPosition: 'left', showProgress: false },
    mapStyle: 'positron', layers: [], steps: [],
    maps: [{
      id: 'map-atlas', name: 'Carte Patrimoine', mapStyle: 'positron',
      view: { center: [2.35, 48.85], zoom: 13 },
      layers: [{ id: 'l1', name: 'Monuments', visible: true, features: [{ id: 'f1', name: 'Panthéon', geometryType: 'Point', coordinates: [2.346, 48.846], numberIndex: 1 }] }],
    }],
    pages: [{
      id: 'p1', title: 'Vue générale', layout: { format: 'a4-landscape', gridColumns: 8, gridRows: 6, marginMm: 15 },
      blocks: [
        { id: 'b1', type: 'title', x: 0, y: 0, w: 8, h: 1, data: { text: 'Atlas Patrimonial 2026', level: 1 } },
        { id: 'b2', type: 'map', x: 0, y: 1, w: 4, h: 4, data: { title: 'Carte générale', mapId: 'map-atlas', caption: '© OpenStreetMap · © CARTO' } },
        { id: 'b3', type: 'text', x: 4, y: 1, w: 4, h: 4, data: { text: '<p>Description Panthéon.</p>' }, binding: { mapId: 'map-atlas', targetFeatureId: 'f1', action: 'highlight', numberIndex: 1 } },
      ],
    }],
  };

  const html = generateBrochurePrintHTML(story);
  assert.ok(html.includes('@page { size: A4 landscape; margin: 0; }'));
  assert.ok(html.includes('id="btn-print" disabled'), 'C04 : bouton imprimer initialement désactivé');
  assert.ok(html.includes('checkReadiness'), 'C04 : vérification explicite de tous les états cartographiques');
  assert.ok(html.includes('beforeprint'), 'C04 : interception de l’événement d’impression avant readiness');
  assert.ok(html.includes('preserveDrawingBuffer: true'), 'C05 : WebGL pour capture d’impression');
  assert.ok(html.includes('MapLibre GL non disponible'), 'Bloque si CDN absent');
  assert.ok(html.includes('introuvable'), 'Ne remplace pas silencieusement une carte invalide');

  const reopened = extractStoryFromHTML(html);
  assert.strictEqual(reopened.id, 'brochure-a4-1');
  assert.strictEqual(reopened.mode, 'brochure');
  const editedMap = updateMapView(reopened.maps[0], { zoom: 16, center: [2.346, 48.846] });
  assert.strictEqual(editedMap.view.zoom, 16);
  console.log('  -> Brochure A4, readiness (C04) et réouverture validées.');
}

try {
  testMode3StaticRestrictions();
  testMode2ToMode3Conversion();
  testHonestPreflight();
  testBrochurePrintGenerationAndReopen();
  console.log('\n=== TOUTES LES VÉRIFICATIONS P5 (J01 -> J11 & C04/C06/C07) ONT RÉUSSI AVEC SUCCÈS ! ===');
} catch (err) {
  console.error('\n❌ ERREUR LORS DE LA VALIDATION P5 :', err);
  process.exit(1);
}
