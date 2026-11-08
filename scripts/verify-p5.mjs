/**
 * Script de validation automatisée P5 (J01 -> J11 & V09)
 * Vérifie : restriction des blocs Mode 3 (J01), conversion Mode 2 -> Mode 3 par copie avec
 * planches contact multi-images et renvois numérotés (J02/J03/V09), prévol honnête (J10/V09),
 * génération Brochure A4 Portrait/Paysage HTML/PDF (J04-J09), et réimportation éditable (J11).
 */

import assert from 'node:assert';
import {
  isBlockAllowedInBrochure,
  convertRichDocumentToBrochure,
  runBrochurePreflight,
} from '../src/core/brochure.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';
import { extractStoryFromHTML } from '../src/core/publish.ts';
import { updateMapView } from '../src/core/mapScene.ts';

console.log('=== LANCEMENT DE LA RECETTE P5 (J01 -> J11 & V09) ===\n');

// 1. J01 : Restriction du Mode 3 aux contenus statiques
function testMode3StaticRestrictions() {
  console.log('Test 1 : Restriction du Mode 3 aux blocs statiques (J01)...');
  assert.strictEqual(isBlockAllowedInBrochure('title'), true);
  assert.strictEqual(isBlockAllowedInBrochure('text'), true);
  assert.strictEqual(isBlockAllowedInBrochure('callout'), true);
  assert.strictEqual(isBlockAllowedInBrochure('image'), true);
  assert.strictEqual(isBlockAllowedInBrochure('table'), true);
  assert.strictEqual(isBlockAllowedInBrochure('map'), true);
  assert.strictEqual(isBlockAllowedInBrochure('legend'), true);
  assert.strictEqual(isBlockAllowedInBrochure('source'), true);
  assert.strictEqual(isBlockAllowedInBrochure('gallery'), false, 'Le carrousel dynamique doit être exclu en Mode 3');
  console.log('  -> Restriction J01 validée.');
}

// 2. J02 & J03 & V09 : Conversion Mode 2 -> Mode 3 par copie avec planches contact et numérotation
function testMode2ToMode3Conversion() {
  console.log('Test 2 : Conversion Mode 2 -> Mode 3 par copie sans perte (J02, J03, V09)...');
  const sourceDoc = {
    id: 'doc-source-2',
    version: '2.0.0',
    title: 'Diagnostic Urbain',
    author: 'Atelier Urbanisme',
    created: 1700000000000,
    modified: 1700000005000,
    mode: 'rich-document',
    format: 'screen-16-9',
    appearance: { theme: 'light', font: 'Inter', accentColor: '#0b7fb0', panelPosition: 'left', showProgress: false },
    mapStyle: 'positron',
    layers: [],
    steps: [],
    pages: [{
      id: 'p1', title: 'Secteur Nord',
      layout: { format: 'screen-16-9', gridColumns: 8, gridRows: 4 },
      blocks: [
        { id: 'b-gal-items', type: 'gallery', x: 0, y: 0, w: 4, h: 2, data: { items: [{ url: 'https://example.com/1.jpg', caption: 'Photo 1' }, { url: 'https://example.com/2.jpg', caption: 'Photo 2' }] } },
        { id: 'b-gal-images', type: 'gallery', x: 4, y: 0, w: 4, h: 2, data: { images: ['https://example.com/3.jpg', 'https://example.com/4.jpg'] } },
        { id: 'b-txt', type: 'text', x: 0, y: 2, w: 4, h: 2, data: { text: '<p>Observation terrain</p>' }, binding: { mapId: 'm1', targetFeatureId: 'f1', action: 'zoom' } },
      ],
    }],
  };

  const { brochure, report } = convertRichDocumentToBrochure(sourceDoc);
  assert.notStrictEqual(brochure.id, sourceDoc.id, 'Doit créer une copie avec un nouvel identifiant');
  assert.strictEqual(sourceDoc.mode, 'rich-document', 'Le projet source ne doit pas être muté');
  assert.strictEqual(brochure.mode, 'brochure');
  assert.strictEqual(brochure.format, 'a4-portrait');
  assert.strictEqual(report.adaptedGalleriesCount, 2);
  assert.strictEqual(report.numberedBindingsCount, 1);
  assert.strictEqual(report.formatChanged, true);

  const b1 = brochure.pages[0].blocks[0];
  const b2 = brochure.pages[0].blocks[1];
  const b3 = brochure.pages[0].blocks[2];
  assert.strictEqual(b1.type, 'image');
  assert.strictEqual(b1.data.isContactSheet, true);
  assert.strictEqual(b1.data.contactSheetItems.length, 2, 'Toutes les vues de data.items sont conservées');
  assert.strictEqual(b2.type, 'image');
  assert.strictEqual(b2.data.contactSheetItems.length, 2, 'Toutes les vues de data.images sont conservées (V09)');
  assert.strictEqual(b3.binding.numberIndex, 1, 'Liaison narrative convertie en renvoi numéroté #1');
  console.log('  -> Conversion Mode 2 -> 3, planches contact et numérotation validées.');
}

// 3. J10 & V09 : Contrôle prévol honnête (détection réelle des attributions manquantes, débordements, URLs)
function testHonestPreflight() {
  console.log('Test 3 : Contrôle prévol honnête (J10, V09)...');
  const incompleteStory = {
    id: 'broch-warn', version: '2.0.0', title: 'Brochure Incomplète',
    created: 1, modified: 1, mode: 'brochure', format: 'screen-16-9',
    appearance: { theme: 'light', font: 'Inter', accentColor: '#0b7fb0', panelPosition: 'left', showProgress: false },
    mapStyle: 'positron', layers: [], steps: [],
    pages: [{
      id: 'p1', title: 'Page 1',
      layout: { format: 'screen-16-9', gridColumns: 6, gridRows: 8 },
      blocks: [
        { id: 'b-map-no-attr', type: 'map', x: 0, y: 0, w: 2, h: 2, data: { title: 'Carte sans source' } },
        { id: 'b-img-empty', type: 'image', x: 2, y: 0, w: 2, h: 2, data: { url: '' } },
        { id: 'b-overflow', type: 'text', x: 0, y: 2, w: 1, h: 1, data: { text: 'A'.repeat(300) } },
      ],
    }],
  };

  const rep = runBrochurePreflight(incompleteStory);
  assert.strictEqual(rep.ready, false, 'Une image sans URL doit bloquer la validation ready');
  assert.strictEqual(rep.attributionsPresent, false, 'Une carte sans attribution ni bloc source doit mettre attributionsPresent à false (V09)');
  assert.ok(rep.issues.some((i) => i.code === 'MISSING_MAP_ATTRIBUTION'));
  assert.ok(rep.issues.some((i) => i.code === 'MISSING_MEDIA_URL'));
  assert.ok(rep.issues.some((i) => i.code === 'TEXT_OVERFLOW'));
  assert.ok(rep.issues.some((i) => i.code === 'NON_A4_FORMAT'));

  // Ajout d'un bloc source et correction de l'image -> prévol 100% conforme
  incompleteStory.format = 'a4-portrait';
  incompleteStory.pages[0].layout.format = 'a4-portrait';
  incompleteStory.pages[0].blocks[1].data.url = 'https://example.com/ok.jpg';
  incompleteStory.pages[0].blocks[2].data.text = 'Texte concis.';
  incompleteStory.pages[0].blocks.push({ id: 'b-src', type: 'source', x: 4, y: 0, w: 2, h: 1, data: { text: 'Source : IGN / OSM 2026' } });

  const repOk = runBrochurePreflight(incompleteStory);
  assert.strictEqual(repOk.ready, true);
  assert.strictEqual(repOk.attributionsPresent, true);
  assert.strictEqual(repOk.selectableTextGuaranteed, true);
  console.log('  -> Contrôle prévol honnête validé.');
}

// 4. J05, J06, J07, J08, J11 : Génération HTML/PDF A4 et réouverture éditable des cartes
function testBrochurePrintGenerationAndReopen() {
  console.log('Test 4 : Génération Brochure A4 imprimable et réouverture avec édition de carte (J05-J11)...');
  const story = {
    id: 'brochure-a4-1', version: '2.0.0', title: 'Atlas Patrimonial', author: 'Conservateur',
    created: 1, modified: 2, mode: 'brochure', format: 'a4-landscape',
    appearance: { theme: 'light', font: 'Inter', accentColor: '#0b7fb0', panelPosition: 'left', showProgress: false },
    mapStyle: 'positron', layers: [], steps: [],
    maps: [{
      id: 'map-atlas', name: 'Carte Patrimoine', mapStyle: 'positron',
      view: { center: [2.35, 48.85], zoom: 13, pitch: 0, bearing: 0 },
      layers: [{
        id: 'l1', name: 'Monuments', visible: true, color: '#0b7fb0',
        features: [
          { id: 'f1', name: 'Panthéon', geometryType: 'Point', coordinates: [2.346, 48.846], numberIndex: 1 },
          { id: 'f2', name: 'Parcours', geometryType: 'LineString', coordinates: [[2.34, 48.84], [2.35, 48.85]], numberIndex: 2 },
        ],
      }],
    }],
    pages: [{
      id: 'p1', title: 'Vue générale',
      layout: { format: 'a4-landscape', gridColumns: 8, gridRows: 6, marginMm: 15 },
      blocks: [
        { id: 'b1', type: 'title', x: 0, y: 0, w: 8, h: 1, data: { text: 'Atlas Patrimonial 2026', level: 1 } },
        { id: 'b2', type: 'map', x: 0, y: 1, w: 4, h: 4, data: { title: 'Carte générale', mapId: 'map-atlas', caption: ' Crédits IGN' } },
        { id: 'b3', type: 'text', x: 4, y: 1, w: 4, h: 4, data: { text: '<p>Description vectorielle sélectionnable du Panthéon.</p>' }, binding: { mapId: 'map-atlas', targetFeatureId: 'f1', action: 'highlight', numberIndex: 1 } },
      ],
    }],
  };

  const html = generateBrochurePrintHTML(story);
  assert.ok(html.includes('@page { size: A4 landscape; margin: 0; }'), 'Règle @page A4 landscape requise (J05)');
  assert.ok(html.includes('width:297mm; height:210mm;'), 'Dimensions physiques 297x210mm requises (J05)');
  assert.ok(html.includes('Page 1 / 1'), 'Pagination pied de page requise (J05)');
  assert.ok(html.includes('preserveDrawingBuffer: true'), 'Capture WebGL haute résolution pour impression PDF (J06)');
  assert.ok(html.includes("map.once('idle'"), 'Attente effective du chargement des tuiles/polices (J07)');
  assert.ok(html.includes('© OpenStreetMap · © CARTO'), 'Attributions cartographiques présentes (J08)');
  assert.ok(html.includes('Description vectorielle sélectionnable du Panthéon.'), 'Texte vectoriel sélectionnable (J10/J11)');

  // J11 : Réouverture du projet depuis le fichier généré et modification de la carte
  const reopened = extractStoryFromHTML(html);
  assert.strictEqual(reopened.id, 'brochure-a4-1');
  assert.strictEqual(reopened.mode, 'brochure');
  assert.strictEqual(reopened.maps.length, 1);
  const editedMap = updateMapView(reopened.maps[0], { zoom: 16, center: [2.346, 48.846] });
  assert.strictEqual(editedMap.view.zoom, 16, 'La carte reste pleinement éditable après réouverture (J06/J11)');
  console.log('  -> Brochure A4 imprimable et réouverture éditable validées.');
}

try {
  testMode3StaticRestrictions();
  testMode2ToMode3Conversion();
  testHonestPreflight();
  testBrochurePrintGenerationAndReopen();
  console.log('\n=== TOUTES LES VÉRIFICATIONS P5 (J01 -> J11 & V09) ONT RÉUSSI AVEC SUCCÈS ! ===');
} catch (err) {
  console.error('\n❌ ERREUR LORS DE LA VALIDATION P5 :', err);
  process.exit(1);
}

