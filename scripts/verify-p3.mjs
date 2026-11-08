/**
 * Script de validation automatisée P3 (H01 -> H09 + V02/V03)
 * Vérifie : scènes cartographiques indépendantes, couches, géométries Point/LineString/Polygon,
 * construction GeoJSON multi-sommets réelle (V02), liaisons narratives Mode 2/3, et résilience H09.
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
import { getFeatureCenter, buildSceneGeoJSON } from '../src/core/mapSceneRender.ts';

console.log('=== LANCEMENT DE LA RECETTE P3 (H01 -> H09 & V02/V03) ===\n');

// 1. H03 / H04 / V03 : Résolution de scène indépendante et cadrage complet (pitch, bearing, bounds)
function testIndependentMapScene() {
  console.log('Test 1 : Résolution de scènes cartographiques et cadrage complet (H03, H04, V03)...');
  const map = createDefaultProjectMap('map-paris', 'Plan de Paris');
  assert.strictEqual(map.id, 'map-paris');
  assert.strictEqual(map.name, 'Plan de Paris');
  assert.ok(map.view.center[0] === 2.3522 && map.view.center[1] === 48.8566);

  const updated = updateMapView(map, { zoom: 15, pitch: 45, bearing: 90, bounds: [2.3, 48.8, 2.4, 48.9] });
  assert.strictEqual(updated.view.zoom, 15);
  assert.strictEqual(updated.view.pitch, 45);
  assert.strictEqual(updated.view.bearing, 90);
  assert.deepStrictEqual(updated.view.bounds, [2.3, 48.8, 2.4, 48.9]);
  assert.strictEqual(updated.view.center[0], 2.3522);

  console.log('  -> Scène et cadrage complet (pitch/bearing/bounds) validés.');
}

// 2. H02 / H03 / V02 : Couches géographiques et GeoJSON réel (Point, LineString, Polygon)
function testLayersAndFeatures() {
  console.log('Test 2 : Couches et géométries GeoJSON réelles Point/LineString/Polygon (H02, H03, V02)...');
  let map = createDefaultProjectMap('map-1', 'Carte Test');
  const layerId = map.layers[0].id;

  const ptFeature = {
    id: 'feat-pt', name: 'Monument A', geometryType: 'Point',
    coordinates: [2.35, 48.85], color: '#0b7fb0', numberIndex: 1,
  };
  const lineFeature = {
    id: 'feat-line', name: 'Avenue Principale', geometryType: 'LineString',
    coordinates: [[2.35, 48.85], [2.355, 48.855], [2.36, 48.86]], color: '#16a34a', numberIndex: 2,
  };
  const polyFeature = {
    id: 'feat-poly', name: 'Parc Urbain', geometryType: 'Polygon',
    coordinates: [[[2.34, 48.84], [2.35, 48.84], [2.35, 48.85], [2.34, 48.84]]], color: '#9333ea', numberIndex: 3,
  };

  map = addFeatureToLayer(map, layerId, ptFeature);
  map = addFeatureToLayer(map, layerId, lineFeature);
  map = addFeatureToLayer(map, layerId, polyFeature);

  // V02 : Vérification de la construction GeoJSON fidèle (LineString multi-sommets et Polygon fermé)
  const geojson = buildSceneGeoJSON(map, 'feat-line');
  assert.strictEqual(geojson.type, 'FeatureCollection');
  assert.strictEqual(geojson.features.length, 4); // 1 initial + 3 ajoutés
  const gjLine = geojson.features.find((f) => f.properties.id === 'feat-line');
  assert.strictEqual(gjLine.geometry.type, 'LineString');
  assert.strictEqual(gjLine.geometry.coordinates.length, 3, 'Tous les sommets de la LineString sont préservés');
  assert.strictEqual(gjLine.properties.highlighted, true);
  assert.strictEqual(gjLine.properties.color, '#e11d48');

  const gjPoly = geojson.features.find((f) => f.properties.id === 'feat-poly');
  assert.strictEqual(gjPoly.geometry.type, 'Polygon');
  assert.strictEqual(gjPoly.geometry.coordinates[0].length, 4, 'Anneau fermé du Polygon préservé');

  // Vérification des centres représentatifs par type géométrique
  assert.deepStrictEqual(getFeatureCenter(ptFeature), [2.35, 48.85]);
  assert.deepStrictEqual(getFeatureCenter(lineFeature), [2.355, 48.855]);
  const polyCenter = getFeatureCenter(polyFeature);
  assert.ok(polyCenter && Math.abs(polyCenter[0] - 2.345) < 1e-6 && Math.abs(polyCenter[1] - 48.8425) < 1e-6);

  map = deleteFeatureFromLayer(map, layerId, 'feat-line');
  const layerAfterDel = map.layers.find((l) => l.id === layerId);
  assert.strictEqual(layerAfterDel.features.some((f) => f.id === 'feat-line'), false);

  console.log('  -> Géométries Point, LineString et Polygon et GeoJSON de rendu validés.');
}

// 3. H05 / H06 : Liaisons narratives Bloc <-> Carte
function testNarrativeBindings() {
  console.log('Test 3 : Liaisons narratives entre blocs et entités (H05, H06)...');
  const textBlock = { id: 'b-text-1', type: 'text', x: 0, y: 0, w: 4, h: 2, data: { text: '<p>Monument A</p>' } };
  const boundBlock = bindBlockToFeature(textBlock, 'map-paris', 'feat-pt', 'highlight', 1);
  assert.ok(boundBlock.binding);
  assert.strictEqual(boundBlock.binding.mapId, 'map-paris');
  assert.strictEqual(boundBlock.binding.targetFeatureId, 'feat-pt');
  assert.strictEqual(boundBlock.binding.action, 'highlight');
  assert.strictEqual(boundBlock.binding.numberIndex, 1);

  const unbound = unbindBlock(boundBlock);
  assert.strictEqual(unbound.binding, undefined);
  console.log('  -> Création et dissociation de liaisons narratives validées.');
}

// 4. H07 / H08 : Actions Mode 2 (surbrillance, zoom) et Mode 3 (renvoi numéroté)
function testModeActionsAndIndex() {
  console.log('Test 4 : Actions Mode 2 et renvois numérotés Mode 3 (H07, H08)...');
  const b1 = { id: 'b1', type: 'callout', x: 0, y: 0, w: 2, h: 2, data: {} };
  const b2 = { id: 'b2', type: 'table', x: 2, y: 0, w: 4, h: 2, data: {} };

  const boundZoom = bindBlockToFeature(b1, 'map-1', 'feat-pt', 'zoom');
  assert.strictEqual(boundZoom.binding.action, 'zoom');

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
  const featA = mapA.layers[0].features[0].id;
  const pages = [{
    id: 'p1', title: 'Page 1', layout: { format: 'a4-portrait', gridColumns: 6, gridRows: 8 },
    blocks: [
      { id: 'b-ok', type: 'text', x: 0, y: 0, w: 2, h: 2, data: {}, binding: { mapId: 'map-A', targetFeatureId: featA, action: 'highlight' } },
      { id: 'b-wrong-map', type: 'text', x: 2, y: 0, w: 2, h: 2, data: {}, binding: { mapId: 'map-B', targetFeatureId: featA, action: 'zoom' } },
      { id: 'b-orphan-map', type: 'text', x: 4, y: 0, w: 2, h: 2, data: {}, binding: { mapId: 'map-deleted', targetFeatureId: 'any', action: 'zoom' } },
    ],
  }];

  const validation = validateNarrativeBindings(pages, [mapA, mapB]);
  assert.strictEqual(validation.valid, false);
  assert.strictEqual(validation.brokenCount, 2);
  assert.deepStrictEqual(validation.orphanBlockIds, ['b-wrong-map', 'b-orphan-map']);
  assert.ok(validation.cleanPages[0].blocks[0].binding);
  assert.strictEqual(validation.cleanPages[0].blocks[1].binding, undefined);
  assert.strictEqual(validation.cleanPages[0].blocks[2].binding, undefined);
  console.log('  -> Nettoyage gracieux et isolation stricte inter-cartes garantis.');
}

// 6. Tranche cartographique complète
function testFullCartographicSlice() {
  console.log('Test 6 : Tranche cartographique complète...');
  const map = createDefaultProjectMap('map-slice', 'Plan de visite');
  const featPt = { id: 'feat-visite-1', name: 'Musée d’Orsay', geometryType: 'Point', coordinates: [2.3255, 48.8600], color: '#e11d48', numberIndex: 1 };
  const mapWithPt = addFeatureToLayer(map, map.layers[0].id, featPt);
  let textBlock = { id: 'b-txt', type: 'text', x: 0, y: 0, w: 2, h: 2, data: { text: 'Départ Orsay' } };
  textBlock = bindBlockToFeature(textBlock, 'map-slice', 'feat-visite-1', 'zoom', 1);
  const targetFeat = findFeatureInMap(mapWithPt, textBlock.binding.targetFeatureId);
  assert.ok(targetFeat && targetFeat.coordinates[0] === 2.3255);
  console.log('  -> Tranche cartographique complète exécutée et vérifiée.');
}

async function runAll() {
  testIndependentMapScene();
  testLayersAndFeatures();
  testNarrativeBindings();
  testModeActionsAndIndex();
  testOrphanBindingResilience();
  testFullCartographicSlice();
  console.log('\n=== TOUTES LES VÉRIFICATIONS P3 (H01 -> H09 & V02/V03) ONT RÉUSSI AVEC SUCCÈS ! ===');
}

runAll().catch((err) => {
  console.error('\nÉCHEC DE LA RECETTE P3 :', err);
  process.exit(1);
});
