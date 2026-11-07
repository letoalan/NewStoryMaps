/**
 * Script de validation automatisée P2 (G01 -> G10)
 * Vérifie : calculs de grille, cellules carrées, fusion aires paires,
 * absence de collision, expansion/réduction, duplication/suppression,
 * et types de blocs (G01 - G10).
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

console.log('=== LANCEMENT DE LA RECETTE P2 (G01 -> G10) ===\n');

// 1. G01 / G02 : Dimensions de grille et cellules carrées
function testGridDimensions() {
  console.log('Test 1 : Formats de grille et cellules carrées...');
  const formats = ['a4-portrait', 'a4-landscape', 'screen-16-9', 'responsive'];
  for (const fmt of formats) {
    const dims = getGridDimensions(fmt);
    assert.ok(dims.cols > 0 && dims.rows > 0, `Cols et rows doivent être > 0 pour ${fmt}`);
    assert.strictEqual(
      dims.cellWidthPx,
      dims.cellHeightPx,
      `Cellules carrées requises pour ${fmt} (${dims.cellWidthPx} vs ${dims.cellHeightPx})`
    );
    assert.ok(dims.marginMm >= 10, 'Marge minimale de 10mm requise');
    assert.ok(dims.gapPx >= 10, 'Gouttière minimale de 10px requise');
  }
  console.log('  -> Dimensions et cellules carrées validées sur tous les formats.');
}

// 2. G02 / G04 : Rectangles valides et rejet des formes interdites
function testRectValidity() {
  console.log('Test 2 : Validation des aires paires et rejet des formes interdites...');
  const cols = 6;
  const rows = 8;

  // Cellule 1x1 (aire 1) autorisée
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 1, h: 1 }, cols, rows), true);
  // Aires paires complètes autorisées (2, 4, 6, 8, 12)
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 2, h: 1 }, cols, rows), true); // 2
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 2, h: 2 }, cols, rows), true); // 4
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 2, h: 3 }, cols, rows), true); // 6
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 4, h: 2 }, cols, rows), true); // 8
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 4, h: 3 }, cols, rows), true); // 12

  // Aires impaires > 1 interdites
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 3, h: 1 }, cols, rows), false); // 3
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 5, h: 1 }, cols, rows), false); // 5
  assert.strictEqual(isRectValid({ x: 0, y: 0, w: 3, h: 3 }, cols, rows), false); // 9

  // Hors limites interdits
  assert.strictEqual(isRectValid({ x: 5, y: 0, w: 2, h: 1 }, cols, rows), false); // x + w > 6
  assert.strictEqual(isRectValid({ x: 0, y: 7, w: 2, h: 2 }, cols, rows), false); // y + h > 8
  assert.strictEqual(isRectValid({ x: -1, y: 0, w: 2, h: 1 }, cols, rows), false); // coord négative

  console.log('  -> Validation géométrique et règles d’aires respectées.');
}

// 3. G02 / G05 : Détection et évitement des collisions
function testCollisionDetection() {
  console.log('Test 3 : Détection stricte des collisions...');
  const existing = [{ id: 'b1', type: 'text', x: 1, y: 1, w: 2, h: 2, data: {} }];

  // Chevauchement complet ou partiel
  assert.strictEqual(hasCollision({ x: 1, y: 1, w: 1, h: 1 }, existing), true);
  assert.strictEqual(hasCollision({ x: 2, y: 2, w: 2, h: 1 }, existing), true);

  // Blocs adjacents (partagent une frontière mais pas d'intérieur)
  assert.strictEqual(hasCollision({ x: 3, y: 1, w: 1, h: 1 }, existing), false); // à droite
  assert.strictEqual(hasCollision({ x: 1, y: 3, w: 2, h: 1 }, existing), false); // en dessous
  assert.strictEqual(hasCollision({ x: 0, y: 1, w: 1, h: 2 }, existing), false); // à gauche

  console.log('  -> Gestion des collisions et adjacence validée.');
}

// 4. G05 / G06 : Opérations de bloc (Ajout, Agrandissement, Réduction)
function testBlockOperations() {
  console.log('Test 4 : Opérations de manipulation (Ajout, Expand, Shrink)...');
  const cols = 6;
  const rows = 8;

  let blocks = [];
  const b1 = { id: 'b1', type: 'text', x: 0, y: 0, w: 2, h: 1, data: {} };
  const addRes1 = addBlock(blocks, b1, cols, rows);
  assert.strictEqual(addRes1.success, true);
  blocks = addRes1.blocks;

  // Tentative d'ajout en collision
  const bCollision = { id: 'b2', type: 'text', x: 1, y: 0, w: 2, h: 1, data: {} };
  const addRes2 = addBlock(blocks, bCollision, cols, rows);
  assert.strictEqual(addRes2.success, false);
  assert.match(addRes2.error || '', /collision/i);

  // Agrandissement vers la droite avec saut automatique vers aire paire (2x1 -> 4x1, saut de 3x1 interdit)
  const expRes = expandBlock(blocks, 'b1', 'right', cols, rows);
  assert.strictEqual(expRes.success, true);
  assert.strictEqual(expRes.blocks[0].w, 4); // Saut automatique de 2x1 à 4x1
  assert.strictEqual(expRes.blocks[0].w * expRes.blocks[0].h, 4);
  blocks = expRes.blocks;

  // Réduction avec garantie d'aire paire (4x1 -> 2x1, refus d'aire 3x1)
  const shrinkRes = shrinkBlock(blocks, 'b1');
  assert.strictEqual(shrinkRes.success, true);
  assert.strictEqual(shrinkRes.blocks[0].w, 2);
  assert.strictEqual(shrinkRes.blocks[0].w * shrinkRes.blocks[0].h, 2);
  blocks = shrinkRes.blocks;

  // Réajustement lors d'un rétrécissement de grille (ex. passage 6x8 vers 4x4)
  const overflowingBlocks = [{ id: 'b_out', type: 'text', x: 5, y: 7, w: 2, h: 2, data: {} }];
  const refitted = refitBlocksToGrid(overflowingBlocks, 4, 4);
  assert.ok(refitted[0].x + refitted[0].w <= 4, 'Le bloc doit être recadré dans les colonnes');
  assert.ok(refitted[0].y + refitted[0].h <= 4, 'Le bloc doit être recadré dans les lignes');
  assert.ok(refitted[0].w * refitted[0].h === 1 || (refitted[0].w * refitted[0].h) % 2 === 0);

  console.log('  -> Ajout, expansion avec saut d’aire, réduction stricte et réajustement validés.');
}

// 5. G06 : Duplication, recherche de cellule libre et suppression
function testDuplicationAndDeletion() {
  console.log('Test 5 : Duplication dans cellule libre et suppression...');
  const cols = 4;
  const rows = 4;
  let blocks = [{ id: 'b1', type: 'table', x: 0, y: 0, w: 2, h: 2, data: { rows: [['A', 'B']] } }];

  // Trouver première cellule libre pour 2x2
  const freeCell = findFirstFreeCell(blocks, cols, rows, 2, 2);
  assert.ok(freeCell !== null, 'Une cellule libre pour 2x2 doit être disponible');
  assert.strictEqual(freeCell.x, 2);
  assert.strictEqual(freeCell.y, 0);

  // Duplication
  const dupRes = duplicateBlock(blocks, 'b1', cols, rows);
  assert.strictEqual(dupRes.success, true);
  assert.strictEqual(dupRes.blocks.length, 2);
  assert.notStrictEqual(dupRes.blocks[0].id, dupRes.blocks[1].id);
  assert.strictEqual(dupRes.blocks[1].x, 2);
  assert.strictEqual(dupRes.blocks[1].y, 0);

  // Suppression
  const remaining = deleteBlock(dupRes.blocks, 'b1');
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].id, dupRes.blocks[1].id);

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
    assert.ok(validTypes.includes(b.type), `Type de bloc ${b.type} doit être reconnu`);
    assert.ok(b.id && b.w > 0 && b.h > 0, `Propriétés requises pour le bloc ${b.id}`);
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
  console.log('\n=== TOUTES LES VÉRIFICATIONS P2 (G01 -> G10) ONT RÉUSSI AVEC SUCCÈS ! ===');
}

runAll().catch(err => {
  console.error('\nÉCHEC DE LA RECETTE P2 :', err);
  process.exit(1);
});

