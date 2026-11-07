/**
 * Script de validation automatisée P3 (H01 -> H09)
 * Vérifie : scènes cartographiques indépendantes, couches, objets/géométries,
 * liaisons narratives Mode 2 (surbrillance/zoom) et Mode 3 (renvois numérotés),
 * et résilience face aux suppressions d'objets (H01 - H09).
 */

import assert from 'node:assert';
import {
  createDefaultProjectMap,
  updateMapView,
  addFeatureToLayer,
  deleteFeatureFromLayer,
  bindBlockToFeature,
  unbindBlock,
  validateNarrativeBindings,
} from '../src/core/mapScene.ts';

console.log('=== LANCEMENT DE LA RECETTE P3 (H01 -> H09) ===\n');

// 1. H03 / H04 : Résolution de scène indépendante et gestion de la vue
function testIndependentMapScene() {
  console.log('Test 1 : Résolution de scènes cartographiques et cadrage (H03, H04)...');
  const map = createDefaultProjectMap('map-paris', 'Plan de Paris');
  assert.strictEqual(map.id, 'map-paris');
  assert.strictEqual(map.name, 'Plan de Paris');
  assert.ok(map.view.center[0] === 2.3522 && map.view.center[1] === 48.8566);

  // Modification du cadrage
  const updated = updateMapView(map, { zoom: 15, pitch: 45, bearing: 90 });
  assert.strictEqual(updated.view.zoom, 15);
  assert.strictEqual(updated.view.pitch, 45);
  assert.strictEqual(updated.view.bearing, 90);
  assert.strictEqual(updated.view.center[0], 2.3522); // inchangé

  console.log('  -> Scène et cadrage indépendants validés.');
}

// 2. H02 / H03 : Couches géographiques et entités (Points, Lignes, Polygones)
function testLayersAndFeatures() {
  console.log('Test 2 : Couches et géométries (Points, Lignes, Polygones) (H02, H03)...');
  let map = createDefaultProjectMap('map-1', 'Carte Test');
  const layerId = map.layers[0].id;

  const ptFeature = {
    id: 'feat-pt', name: 'Monument A', geometryType: 'Point',
    coordinates: [2.35, 48.85], color: '#0b7fb0', numberIndex: 1,
  };
  const lineFeature = {
    id: 'feat-line', name: 'Avenue Principale', geometryType: 'LineString',
    coordinates: [[2.35, 48.85], [2.36, 48.86]], color: '#16a34a',
  };

  map = addFeatureToLayer(map, layerId, ptFeature);
  map = addFeatureToLayer(map, layerId, lineFeature);

  const layer = map.layers.find((l) => l.id === layerId);
  assert.strictEqual(layer.features.length, 3); // 1 initial + 2 ajoutés
  assert.strictEqual(layer.features[1].name, 'Monument A');
  assert.strictEqual(layer.features[2].geometryType, 'LineString');

  // Suppression d'une entité
  map = deleteFeatureFromLayer(map, layerId, 'feat-line');
  const layerAfterDel = map.layers.find((l) => l.id === layerId);
  assert.strictEqual(layerAfterDel.features.length, 2);
  assert.strictEqual(layerAfterDel.features.some((f) => f.id === 'feat-line'), false);

  console.log('  -> Gestion des couches et géométries conforme.');
}

// 3. H05 / H06 : Liaisons narratives Bloc <-> Carte
function testNarrativeBindings() {
  console.log('Test 3 : Liaisons narratives entre blocs et entités (H05, H06)...');
  const textBlock = {
    id: 'b-text-1',
    type: 'text',
    x: 0,
    y: 0,
    w: 4,
    h: 2,
    data: { text: '<p>Voir le monument A sur le plan</p>' },
  };

  // Lier le bloc de texte à l'entité cartographique
  const boundBlock = bindBlockToFeature(textBlock, 'map-paris', 'feat-pt', 'highlight', 1);
  assert.ok(boundBlock.binding);
  assert.strictEqual(boundBlock.binding.mapId, 'map-paris');
  assert.strictEqual(boundBlock.binding.targetFeatureId, 'feat-pt');
  assert.strictEqual(boundBlock.binding.action, 'highlight');
  assert.strictEqual(boundBlock.binding.numberIndex, 1);

  // Délier le bloc
  const unbound = unbindBlock(boundBlock);
  assert.strictEqual(unbound.binding, undefined);
  assert.strictEqual(unbound.id, 'b-text-1');

  console.log('  -> Création et dissociation de liaisons narratives validées.');
}

// 4. H07 / H08 : Actions Mode 2 (surbrillance, zoom) et Mode 3 (renvoi numéroté)
function testModeActionsAndIndex() {
  console.log('Test 4 : Actions Mode 2 et renvois numérotés Mode 3 (H07, H08)...');
  const b1 = { id: 'b1', type: 'callout', x: 0, y: 0, w: 2, h: 2, data: {} };
  const b2 = { id: 'b2', type: 'table', x: 2, y: 0, w: 4, h: 2, data: {} };

  // Mode 2 : Zoom ciblé
  const boundZoom = bindBlockToFeature(b1, 'map-1', 'feat-pt', 'zoom');
  assert.strictEqual(boundZoom.binding.action, 'zoom');

  // Mode 3 : Renvoi indexé n°3
  const boundIndex = bindBlockToFeature(b2, 'map-1', 'feat-pt', 'filter', 3);
  assert.strictEqual(boundIndex.binding.numberIndex, 3);
  assert.strictEqual(boundIndex.binding.action, 'filter');

  console.log('  -> Contrats Mode 2 & Mode 3 validés.');
}

// 5. H09 : Résilience face aux suppressions d'objets ou cartes
function testOrphanBindingResilience() {
  console.log('Test 5 : Résilience et détection des liaisons orphelines (H09)...');
  const map = createDefaultProjectMap('map-valid');
  const featureId = map.layers[0].features[0].id;

  const pages = [
    {
      id: 'p1',
      title: 'Page 1',
      layout: { format: 'a4-portrait', gridColumns: 6, gridRows: 8 },
      blocks: [
        { id: 'b-ok', type: 'text', x: 0, y: 0, w: 2, h: 2, data: {}, binding: { mapId: 'map-valid', targetFeatureId: featureId, action: 'highlight' } },
        { id: 'b-orphan-map', type: 'text', x: 2, y: 0, w: 2, h: 2, data: {}, binding: { mapId: 'map-deleted', targetFeatureId: 'any', action: 'zoom' } },
        { id: 'b-orphan-feat', type: 'text', x: 4, y: 0, w: 2, h: 2, data: {}, binding: { mapId: 'map-valid', targetFeatureId: 'non-existent', action: 'highlight' } },
      ],
    },
  ];

  const validation = validateNarrativeBindings(pages, [map]);
  assert.strictEqual(validation.valid, false);
  assert.strictEqual(validation.brokenCount, 2);
  assert.deepStrictEqual(validation.orphanBlockIds, ['b-orphan-map', 'b-orphan-feat']);

  // Nettoyage automatique des pages sans crash
  const cleanBlocks = validation.cleanPages[0].blocks;
  assert.ok(cleanBlocks[0].binding, 'Le bloc valide doit conserver sa liaison');
  assert.strictEqual(cleanBlocks[1].binding, undefined, 'La liaison orpheline doit être nettoyée');
  assert.strictEqual(cleanBlocks[2].binding, undefined, 'La liaison orpheline doit être nettoyée');

  console.log('  -> Nettoyage gracieux des liaisons orphelines garanti.');
}

async function runAll() {
  testIndependentMapScene();
  testLayersAndFeatures();
  testNarrativeBindings();
  testModeActionsAndIndex();
  testOrphanBindingResilience();
  console.log('\n=== TOUTES LES VÉRIFICATIONS P3 (H01 -> H09) ONT RÉUSSI AVEC SUCCÈS ! ===');
}

runAll().catch((err) => {
  console.error('\nÉCHEC DE LA RECETTE P3 :', err);
  process.exit(1);
});
