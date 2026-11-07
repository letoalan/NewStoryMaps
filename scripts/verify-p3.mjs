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
  findFeatureInMap,
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

// 5. H09 : Résilience face aux suppressions et isolation stricte inter-cartes
function testOrphanBindingResilience() {
  console.log('Test 5 : Résilience et isolation stricte inter-cartes (H09)...');
  const mapA = createDefaultProjectMap('map-A');
  const mapB = createDefaultProjectMap('map-B');
  assert.notStrictEqual(mapA.layers[0].features[0].id, mapB.layers[0].features[0].id, 'Pas de collision d’ID d’entités entre cartes');

  const featA = mapA.layers[0].features[0].id;
  const pages = [
    {
      id: 'p1',
      title: 'Page 1',
      layout: { format: 'a4-portrait', gridColumns: 6, gridRows: 8 },
      blocks: [
        { id: 'b-ok', type: 'text', x: 0, y: 0, w: 2, h: 2, data: {}, binding: { mapId: 'map-A', targetFeatureId: featA, action: 'highlight' } },
        { id: 'b-wrong-map', type: 'text', x: 2, y: 0, w: 2, h: 2, data: {}, binding: { mapId: 'map-B', targetFeatureId: featA, action: 'zoom' } },
        { id: 'b-orphan-map', type: 'text', x: 4, y: 0, w: 2, h: 2, data: {}, binding: { mapId: 'map-deleted', targetFeatureId: 'any', action: 'zoom' } },
      ],
    },
  ];

  // Le bloc b-wrong-map lie featA à mapB : doit être détecté comme cassé !
  const validation = validateNarrativeBindings(pages, [mapA, mapB]);
  assert.strictEqual(validation.valid, false);
  assert.strictEqual(validation.brokenCount, 2);
  assert.deepStrictEqual(validation.orphanBlockIds, ['b-wrong-map', 'b-orphan-map']);

  // Nettoyage automatique des pages sans crash
  const cleanBlocks = validation.cleanPages[0].blocks;
  assert.ok(cleanBlocks[0].binding, 'Le bloc valide doit conserver sa liaison');
  assert.strictEqual(cleanBlocks[1].binding, undefined, 'La liaison vers mauvaise carte doit être nettoyée');
  assert.strictEqual(cleanBlocks[2].binding, undefined, 'La liaison vers carte inexistante doit être nettoyée');

  console.log('  -> Nettoyage gracieux et isolation stricte inter-cartes garantis.');
}

// 6. Tranche cartographique complète : création page -> carte -> point -> liaison -> focus
function testFullCartographicSlice() {
  console.log('Test 6 : Tranche cartographique complète (page -> carte -> entité -> liaison -> focus)...');
  const map = createDefaultProjectMap('map-slice', 'Plan de visite');
  const featPt = {
    id: 'feat-visite-1', name: 'Musée d’Orsay', geometryType: 'Point',
    coordinates: [2.3255, 48.8600], color: '#e11d48', numberIndex: 1,
  };
  const mapWithPt = addFeatureToLayer(map, map.layers[0].id, featPt);

  let textBlock = { id: 'b-txt', type: 'text', x: 0, y: 0, w: 2, h: 2, data: { text: 'Départ Orsay' } };
  const mapBlock = { id: 'b-map', type: 'map', x: 2, y: 0, w: 4, h: 4, data: { mapId: 'map-slice', title: 'Carte visite' } };

  // 1. Association du bloc texte au point précis de la carte
  textBlock = bindBlockToFeature(textBlock, 'map-slice', 'feat-visite-1', 'zoom', 1);
  assert.strictEqual(textBlock.binding.targetFeatureId, 'feat-visite-1');
  assert.strictEqual(textBlock.binding.action, 'zoom');

  // 2. Déclenchement de la réaction cartographique
  const targetFeat = findFeatureInMap(mapWithPt, textBlock.binding.targetFeatureId);
  assert.ok(targetFeat, 'L’entité cible doit être résolue sur la carte');
  assert.strictEqual(targetFeat.coordinates[0], 2.3255);
  assert.strictEqual(targetFeat.coordinates[1], 48.8600);

  // 3. Persistance et validation sans perte
  const page = { id: 'p-slice', title: 'Visite', layout: { format: 'a4-portrait', gridColumns: 6, gridRows: 8 }, blocks: [textBlock, mapBlock] };
  const val = validateNarrativeBindings([page], [mapWithPt]);
  assert.strictEqual(val.valid, true, 'La liaison doit rester 100% valide après validation');
  assert.strictEqual(val.cleanPages[0].blocks[0].binding.targetFeatureId, 'feat-visite-1');

  console.log('  -> Tranche cartographique complète exécutée et vérifiée avec succès.');
}

async function runAll() {
  testIndependentMapScene();
  testLayersAndFeatures();
  testNarrativeBindings();
  testModeActionsAndIndex();
  testOrphanBindingResilience();
  testFullCartographicSlice();
  console.log('\n=== TOUTES LES VÉRIFICATIONS P3 (H01 -> H09) ONT RÉUSSI AVEC SUCCÈS ! ===');
}

runAll().catch((err) => {
  console.error('\nÉCHEC DE LA RECETTE P3 :', err);
  process.exit(1);
});
