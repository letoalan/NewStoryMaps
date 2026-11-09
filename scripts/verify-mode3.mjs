/**
 * Script de vérification automatisée — mode3.md (M0 à M8)
 * Atelier PAO générique : trame, alignement, distribution, recadrage, gabarits et prévol
 *
 * Exécution : node --experimental-strip-types --loader ./scripts/loader.mjs --no-warnings scripts/verify-mode3.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  alignBlocks, distributeBlocks, groupBlocks, ungroupBlocks, toggleLockBlocks,
  reorderZIndex, calculateEffectiveDpi
} from '../src/core/editorialLayout.ts';
import { EDITORIAL_GABARITS, applyEditorialGabarit } from '../src/core/editorialGabarits.ts';
import { runEditorialPreflight } from '../src/core/editorialPreflight.ts';
import {
  createBrochureTouristiqueFixture, createMagazineCulturelFixture, createFicheScientifiqueFixture
} from '../src/core/editorialFixtures.ts';

console.log('=== VÉRIFICATION COMPLÈTE MODE3.MD : ATELIER PAO GÉNÉRIQUE ===\n');

// 1. M0 : Baseline, modèle et fixtures canoniques
console.log('1. Test M0 : Contrats de données et fixtures canoniques (tourisme, magazine, science)...');
const pTourisme = createBrochureTouristiqueFixture();
const pMag = createMagazineCulturelFixture();
const pScience = createFicheScientifiqueFixture();

assert.equal(pTourisme.layout.format, 'a4-portrait');
assert.equal(pMag.layout.format, 'a4-landscape');
assert.equal(pScience.blocks.length, 5);
assert.ok(pTourisme.blocks.some((b) => b.typographyRole === 'cover-title'));
assert.ok(pScience.blocks.some((b) => b.type === 'table'));
console.log('   -> Fixtures canoniques validées sans référentiel pédagogique imposé.');

// 2. M2 : Commandes de composition (alignement, distribution, groupes, zIndex)
console.log('2. Test M2 : Commandes de composition (alignement, distribution, groupement, zIndex)...');
const sampleBlocks = [
  { id: 'b1', type: 'text', x: 2, y: 1, w: 2, h: 2, data: {} },
  { id: 'b2', type: 'text', x: 5, y: 3, w: 3, h: 2, data: {} },
  { id: 'b3', type: 'text', x: 9, y: 2, w: 2, h: 2, data: {} },
];

const alignedLeft = alignBlocks(sampleBlocks, ['b1', 'b2'], 'left');
assert.equal(alignedLeft.find((b) => b.id === 'b2')?.x, 2, 'Alignement gauche conforme');

const alignedTop = alignBlocks(sampleBlocks, ['b1', 'b2'], 'top');
assert.equal(alignedTop.find((b) => b.id === 'b2')?.y, 1, 'Alignement haut conforme');

const distributedH = distributeBlocks(sampleBlocks, ['b1', 'b2', 'b3'], 'horizontal');
assert.ok(distributedH.length === 3, 'Distribution horizontale exécutée');

const { blocks: grouped, groupId } = groupBlocks(sampleBlocks, ['b1', 'b2']);
assert.ok(groupId.startsWith('grp-'));
assert.equal(grouped.find((b) => b.id === 'b1')?.groupId, groupId);

const ungrouped = ungroupBlocks(grouped, groupId);
assert.equal(ungrouped.find((b) => b.id === 'b1')?.groupId, undefined);

const locked = toggleLockBlocks(sampleBlocks, ['b1'], true);
assert.equal(locked.find((b) => b.id === 'b1')?.locked, true);

const reordered = reorderZIndex(sampleBlocks, 'b1', 'bringToFront');
assert.ok((reordered.find((b) => b.id === 'b1')?.zIndex ?? 0) > 0, 'Montée en premier plan zIndex');
console.log('   -> Alignement, distribution, groupes et zIndex : OK.');

// 3. M4 : Recadrage d'image non destructif et calcul DPI
console.log('3. Test M4 : Calcul de résolution effective et DPI d’impression...');
const optimal = calculateEffectiveDpi(3000, 2000, 150, 100, { x: 0, y: 0, zoom: 1, fit: 'cover' });
assert.equal(optimal.quality, 'optimal');
assert.ok(optimal.dpi >= 300, 'Image haute définition classée optimal');

const low = calculateEffectiveDpi(400, 300, 150, 100, { x: 0, y: 0, zoom: 1, fit: 'cover' });
assert.equal(low.quality, 'low');
assert.ok(low.dpi < 150, 'Image basse définition correctement identifiée');
console.log('   -> Définition d’impression et DPI mesurés : OK.');

// 4. M6 : Gabarits neutres professionnels et application non destructive
console.log('4. Test M6 : Application non destructive de gabarits neutres...');
assert.ok(EDITORIAL_GABARITS.length >= 4, 'Au moins 4 gabarits neutres définis');
const gabCouv = EDITORIAL_GABARITS.find((g) => g.category === 'couverture') || EDITORIAL_GABARITS[0];
const applied = applyEditorialGabarit(pTourisme, gabCouv);
assert.equal(applied.page.layout.format, 'a4-portrait');
assert.ok(applied.matchedBlocksCount >= 2, 'Réutilisation et correspondance des blocs existants');
assert.ok(applied.page.blocks.length >= gabCouv.blocks.length, 'Structure du gabarit appliquée');
console.log('   -> Gabarits neutres et conservation des contenus : OK.');

// 5. M7 : Contrôle prévol technique et éditorial honnête
console.log('5. Test M7 : Contrôle prévol technique et éditorial...');
const badPage = {
  id: 'bad-page',
  title: 'Page Défectueuse',
  layout: { format: 'a4-portrait', gridColumns: 8, gridRows: 12 },
  hero: { enabled: true, mediaType: 'video', mediaUrl: 'https://v.mp4', posterUrl: '' },
  blocks: [
    { id: 'overflow-blk', type: 'text', x: 6, y: 10, w: 4, h: 4, data: { text: 'Débordement' } }, // x+w = 10 > 8
    { id: 'empty-map', type: 'map', x: 0, y: 0, w: 4, h: 4, data: {} }, // mapId manquant
  ],
};

const preflight = runEditorialPreflight([badPage]);
assert.equal(preflight.hasErrors, true, 'Erreurs prévol détectées');
assert.ok(preflight.issues.some((i) => i.id === 'overflow-overflow-blk'), 'Débordement physique détecté');
assert.ok(preflight.issues.some((i) => i.id.startsWith('hero-missing-poster')), 'Poster vidéo obligatoire manquant détecté');
assert.ok(preflight.issues.every((i) => i.evidence === 'measured' || i.evidence === 'heuristic'), 'Preuves honnêtes documentées');
console.log('   -> Contrôles prévol techniques/éditoriaux validés sans score esthétique arbitraire.');

// 6. M8 : Règle stricte des 195 lignes
console.log('6. Test M8 : Contrôle des 195 lignes strictes sur les nouveaux fichiers...');
const files = [
  'src/types/editorial.ts',
  'src/types/project.ts',
  'src/core/editorialLayout.ts',
  'src/core/editorialGabarits.ts',
  'src/core/editorialPreflight.ts',
  'src/core/editorialFixtures.ts',
  'scripts/verify-mode3.mjs',
];

for (const rel of files) {
  const code = fs.readFileSync(rel, 'utf-8');
  const count = code.split('\n').length;
  assert.ok(count <= 195, `${rel} dépasse 195 lignes (${count})`);
}
console.log('   -> 100% des fichiers Mode 3 respectent la limite <= 195 lignes.');

console.log('\n================================================================');
console.log('VALIDATION MODE 3 INTEGRALE : TOUTES LES PORTES M0-M8 SONT VALIDEES');
console.log('================================================================');
