import assert from 'node:assert';
import { createCanonicalMode3Brochure } from '../src/core/canonicalFixtures.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';
import { extractStoryFromHTML } from '../src/core/publish.ts';
import {
  alignBlocks,
  distributeBlocks,
  toggleLockBlocks,
  reorderZIndex,
  calculateEffectiveDpi,
} from '../src/core/editorialLayout.ts';

console.log('--- Test Porte R5 : Première tranche Mode 3 (Atelier PAO générique) ---');

const mode3Story = createCanonicalMode3Brochure();

// 1. R5.1 & R5.2 : Alignement, distribution et respect des blocs verrouillés
{
  const blocks = [
    { id: 'b1', type: 'text', x: 0, y: 0, w: 2, h: 2, data: {} },
    { id: 'b2', type: 'text', x: 3, y: 1, w: 2, h: 2, data: {} },
    { id: 'b3', type: 'text', x: 6, y: 4, w: 2, h: 2, locked: true, data: {} },
  ];

  // Alignement à gauche
  const aligned = alignBlocks(blocks, ['b1', 'b2', 'b3'], 'left');
  assert.strictEqual(aligned.find((b) => b.id === 'b1').x, 0);
  assert.strictEqual(aligned.find((b) => b.id === 'b2').x, 0, 'b2 doit s’aligner sur b1');
  assert.strictEqual(aligned.find((b) => b.id === 'b3').x, 6, 'b3 verrouillé ne doit pas bouger');

  // Distribution horizontale
  const unlocked = toggleLockBlocks(blocks, ['b3'], false);
  const distributed = distributeBlocks(unlocked, ['b1', 'b2', 'b3'], 'horizontal');
  assert.strictEqual(distributed[0].x, 0);
  assert.strictEqual(distributed[2].x, 6);
  assert.strictEqual(distributed[1].x, 2, 'b2 distribué équitablement');
  console.log('✅ R5.1 / R5.2 : Commandes d’alignement, distribution et respect du verrouillage validés');
}

// 2. R5.3 : zIndex et verrouillage au rendu
{
  let blocks = [
    { id: 'b1', type: 'text', x: 0, y: 0, w: 2, h: 2, zIndex: 1, data: {} },
    { id: 'b2', type: 'text', x: 1, y: 1, w: 2, h: 2, zIndex: 2, data: {} },
  ];

  blocks = reorderZIndex(blocks, 'b1', 'bringToFront');
  assert.strictEqual(blocks.find((b) => b.id === 'b1').zIndex, 3, 'b1 passe au premier plan');

  blocks = reorderZIndex(blocks, 'b1', 'sendToBack');
  assert.strictEqual(blocks.find((b) => b.id === 'b1').zIndex, 1, 'b1 passe à l’arrière-plan');
  console.log('✅ R5.3 : Réorganisation zIndex atomique validée');
}

// 3. R5.4 : Calcul DPI bidimensionnel cohérent avec crop et cadre physique
{
  // Test 1 : Image équilibrée 3000x2000 sur cadre 150x100mm (508 DPI -> optimal)
  const r1 = calculateEffectiveDpi(3000, 2000, 150, 100);
  assert.strictEqual(r1.quality, 'optimal');
  assert.ok(r1.dpi >= 300);
  assert.strictEqual(r1.dpiX, r1.dpiY);

  // Test 2 : Image asymétrique 3000x300 sur cadre 150x100mm
  // X a 508 DPI, mais Y n'a que 300 / (100/25.4) = 76 DPI !
  // Le calcul bidimensionnel doit retenir Math.min(dpiX, dpiY) = 76 DPI (low)
  const r2 = calculateEffectiveDpi(3000, 300, 150, 100);
  assert.strictEqual(r2.quality, 'low');
  assert.ok(r2.dpi < 100, 'DPI effectif bidimensionnel doit être limité par l’axe le plus faible');
  assert.strictEqual(r2.dpi, r2.dpiY);

  // Test 3 : Recadrage avec zoom x2 (réduit de moitié la définition effective)
  const r3 = calculateEffectiveDpi(3000, 2000, 150, 100, { x: 0, y: 0, zoom: 2, fit: 'cover' });
  assert.strictEqual(r3.dpi, Math.round(r1.dpi / 2));
  console.log('✅ R5.4 : Calcul DPI bidimensionnel avec détection du facteur limitant validé');
}

// 4. R5.5 & R5.6 : Fiche brochure A4 générique, export print et réimport sans perte
{
  assert.strictEqual(mode3Story.mode, 'brochure');
  const printHtml = generateBrochurePrintHTML(mode3Story);
  assert.ok(printHtml.includes('class="brochure-page"'), 'Doit inclure les pages A4 de brochure');
  assert.ok(printHtml.includes('@media print'), 'Doit inclure les styles d’impression');

  // Vérifier la réimportation sans altération
  const reimported = extractStoryFromHTML(printHtml);
  assert.ok(reimported, 'La brochure doit être réimportable depuis le HTML');
  assert.strictEqual(reimported.mode, 'brochure');
  assert.strictEqual(reimported.pages.length, mode3Story.pages.length);
  console.log('✅ R5.5 / R5.6 : Production de fiche A4 et réimport aller-retour validés');
}

console.log('Tous les tests de la Porte R5 sont validés avec succès !');
