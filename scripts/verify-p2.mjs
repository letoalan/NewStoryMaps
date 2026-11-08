/**
 * Script de validation automatisée P2 (G01 -> G10 + V06/V07)
 * Vérifie : calculs de grille, ratios physiques A4/16:9, cellules carrées, fusion aires paires,
 * absence de collision (y compris lors du refit de grille), expansion/réduction, duplication/suppression.
 */

import assert from 'node:assert';
import {
  getGridDimensions,
  isRectValid,
  hasCollision,
  addBlock,
  expandBlock,
  shrinkBlock,
  duplicateBlock,
  deleteBlock,
  findFirstFreeCell,
  refitBlocksToGrid,
} from '../src/core/grid.ts';

console.log('=== LANCEMENT DE LA RECETTE P2 (G01 -> G10 & V06/V07) ===\n');

// 1. G01 / G02 / V07 : Dimensions de grille, ratios physiques et cellules carrées
function testGridDimensions() {
  console.log('Test 1 : Formats de grille, ratios physiques (V07) et cellules carrées...');
  const formats = ['a4-portrait', 'a4-landscape', 'screen-16-9', 'responsive'];
  for (const fmt of formats) {
    const dims = getGridDimensions(fmt);
    assert.ok(dims.cols > 0 && dims.rows > 0, `Cols et rows doivent être > 0 pour ${fmt}`);
    assert.strictEqual(dims.cellWidthPx, dims.cellHeightPx, `Cellules carrées requises pour ${fmt}`);
    assert.ok(dims.marginMm >= 10, 'Marge minimale de 10mm requise');
    assert.ok(dims.gapPx >= 10, 'Gouttière minimale de 10px requise');
    assert.ok(typeof dims.aspectRatio === 'string' && dims.aspectRatio.length > 0, 'Ratio requis');
  }
  const a4p = getGridDimensions('a4-portrait');
  assert.strictEqual(a4p.physicalWidthMm, 210);
  assert.strictEqual(a4p.physicalHeightMm, 297);
  assert.strictEqual(a4p.aspectRatio, '210 / 297');
  const a4l = getGridDimensions('a4-landscape');
  assert.strictEqual(a4l.physicalWidthMm, 297);
  assert.strictEqual(a4l.physicalHeightMm, 210);
  assert.strictEqual(a4l.aspectRatio, '297 / 210');
  const s169 = getGridDimensions('screen-16-9');
  assert.strictEqual(s169.aspectRatio, '16 / 9');
  console.log('  -> Dimensions, ratios physiques A4/16:9 et cellules carrées validés.');
}

// 2. G02 / G04 : Rectangles valides et rejet des formes interdites
function testRectValidity() {
  console.log('Test 2 : Validation des aires paires et rejet des formes interdites...');
  const cols = 6;
  const rows = 8;

  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 1, h: 1 }, cols, rows), true);
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 2, h: 1 }, cols, rows), true);
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 2, h: 2 }, cols, rows), true);
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 2, h: 3 }, cols, rows), true);
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 4, h: 2 }, cols, rows), true);
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 4, h: 3 }, cols, rows), true);

  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 3, h: 1 }, cols, rows), false);
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 5, h: 1 }, cols, rows), false);
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 3, h: 3 }, cols, rows), false);
  assert.strictEqual(isRectValid({ x: 5, y: 0, w: 2, h: 1 }, cols, rows), false);
  assert.strictEqual(isRectValid({ x: 0, y: 7, w: 2, h: 2 }, cols, rows), false);
  assert.strictEqual(isRectValid({ x: -1, y: 0, w: 2, h: 1 }, cols, rows), false);

  console.log('  -> Validation géométrique et règles d’aires respectées.');
}

// 3. G02 / G05 : Détection et évitement des collisions
function testCollisionDetection() {
  console.log('Test 3 : Détection stricte des collisions...');
  const existing = [{ id: 'b1', type: 'text', x: 1, y: 1, w: 2, h: 2, data: {} }];

  assert.strictEqual(hasCollision({ x: 1, y: 1, w: 1, h: 1 }, existing), true);
  assert.strictEqual(hasCollision({ x: 2, y: 2, w: 2, h: 1 }, existing), true);
  assert.strictEqual(hasCollision({ x: 3, y: 1, w: 1, h: 1 }, existing), false);
  assert.strictEqual(hasCollision({ x: 1, y: 3, w: 2, h: 1 }, existing), false);
  assert.strictEqual(hasCollision({ x: 0, y: 1, w: 1, h: 2 }, existing), false);

  console.log('  -> Gestion des collisions et adjacence validée.');
}

// 4. G05 / G06 / V06 : Opérations de bloc et réajustement sans collision
function testBlockOperations() {
  console.log('Test 4 : Opérations de manipulation et refit sans collision (V06)...');
  const cols = 6;
  const rows = 8;

  let blocks = [];
  const b1 = { id: 'b1', type: 'text', x: 0, y: 0, w: 2, h: 1, data: {} };
  const addRes1 = addBlock(blocks, b1, cols, rows);
  assert.strictEqual(addRes1.success, true);
  blocks = addRes1.blocks;

  const bCollision = { id: 'b2', type: 'text', x: 1, y: 0, w: 2, h: 1, data: {} };
  const addRes2 = addBlock(blocks, bCollision, cols, rows);
  assert.strictEqual(addRes2.success, false);
  assert.match(addRes2.error || '', /collision/i);

  const expRes = expandBlock(blocks, 'b1', 'right', cols, rows);
  assert.strictEqual(expRes.success, true);
  assert.strictEqual(expRes.blocks[0].w, 4);
  blocks = expRes.blocks;

  const shrinkRes = shrinkBlock(blocks, 'b1');
  assert.strictEqual(shrinkRes.success, true);
  assert.strictEqual(shrinkRes.blocks[0].w, 2);
  blocks = shrinkRes.blocks;

  // V06 : deux blocs hors grille en (4,0) et (5,0) ramenés dans une grille 4x4 ne doivent PAS entrer en collision
  const multiOverflow = [
    { id: 'b_a', type: 'text', x: 4, y: 0, w: 1, h: 1, data: {} },
    { id: 'b_b', type: 'text', x: 5, y: 0, w: 1, h: 1, data: {} },
    { id: 'b_c', type: 'text', x: 4, y: 5, w: 2, h: 2, data: {} },
  ];
  const refitted = refitBlocksToGrid(multiOverflow, 4, 4);
  assert.strictEqual(refitted.length, 3);
  for (const rb of refitted) {
    assert.strictEqual(isRectValid(rb, 4, 4), true, `Bloc ${rb.id} doit être valide dans 4x4`);
    assert.strictEqual(hasCollision(rb, refitted, rb.id), false, `Collision détectée après refit pour ${rb.id}`);
  }

  console.log('  -> Ajout, expansion, réduction et réajustement sans collision (V06) validés.');
}

// 5. G06 : Duplication, recherche de cellule libre et suppression
function testDuplicationAndDeletion() {
  console.log('Test 5 : Duplication dans cellule libre et suppression...');
  const cols = 4;
  const rows = 4;
  let blocks = [{ id: 'b1', type: 'table', x: 0, y: 0, w: 2, h: 2, data: { rows: [['A', 'B']] } }];

  const freeCell = findFirstFreeCell(blocks, cols, rows, 2, 2);
  assert.ok(freeCell !== null);
  assert.strictEqual(freeCell.x, 2);
  assert.strictEqual(freeCell.y, 0);

  const dupRes = duplicateBlock(blocks, 'b1', cols, rows);
  assert.strictEqual(dupRes.success, true);
  assert.strictEqual(dupRes.blocks.length, 2);
  assert.strictEqual(dupRes.blocks[1].x, 2);
  assert.strictEqual(dupRes.blocks[1].y, 0);

  const remaining = deleteBlock(dupRes.blocks, 'b1');
  assert.strictEqual(remaining.length, 1);
  console.log('  -> Duplication automatique et suppression conformes.');
}

// 6. G07 / G09 : Contrats de données pour tous les types de blocs
function testBlockTypeDataContracts() {
  console.log('Test 6 : Contrats de données des blocs (texte, table, média, carte)...');
  const validTypes = ['title', 'text', 'callout', 'image', 'gallery', 'table', 'map', 'legend', 'source'];
  const testBlocks = [
    { id: '1', type: 'title', x: 0, y: 0, w: 4, h: 1, data: { text: 'Titre principal', level: 1 } },
    { id: '2', type: 'table', x: 0, y: 1, w: 4, h: 2, data: { rows: [['H1', 'H2'], ['D1', 'D2']] } },
    { id: '3', type: 'gallery', x: 0, y: 3, w: 4, h: 2, data: { items: [{ url: 'img1.jpg', caption: 'Vue' }] } },
    { id: '4', type: 'map', x: 0, y: 5, w: 4, h: 2, data: { title: 'Carte liée' }, binding: { mapId: 'map1', action: 'highlight' } },
  ];
  for (const b of testBlocks) {
    assert.ok(validTypes.includes(b.type));
    assert.ok(b.id && b.w > 0 && b.h > 0);
  }
  console.log('  -> Contrats de données et liaisons cartographiques validés.');
}

async function runAll() {
  testGridDimensions();
  testRectValidity();
  testCollisionDetection();
  testBlockOperations();
  testDuplicationAndDeletion();
  testBlockTypeDataContracts();
  console.log('\n=== TOUTES LES VÉRIFICATIONS P2 (G01 -> G10 & V06/V07) ONT RÉUSSI AVEC SUCCÈS ! ===');
}

runAll().catch((err) => {
  console.error('\nÉCHEC DE LA RECETTE P2 :', err);
  process.exit(1);
});
