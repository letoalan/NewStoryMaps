/**
 * Script de validation automatisée N0 (N0.01 -> N0.07)
 * Vérifie : fixtures canoniques 3 modes, matrice de capacités et dégradation statique,
 * préservation des champs inconnus, rejet propre des versions incompatibles et contrats de profils.
 */

import assert from 'node:assert';
import {
  BLOCK_RENDER_MATRIX,
  OUTPUT_PROFILE_CONTRACTS,
  validateProjectSchemaVersion,
  migrateStorySchemaPreservingUnknown,
} from '../src/core/renderMatrix.ts';
import {
  createCanonicalMode1Tour,
  createCanonicalMode2TerritorialDoc,
  createCanonicalMode3Brochure,
} from '../src/core/canonicalFixtures.ts';
import { parseStoryJSON } from '../src/core/io.ts';
import { generateStandaloneHTML, extractStoryFromHTML } from '../src/core/publish.ts';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';

console.log('=== LANCEMENT DE LA RECETTE N0 (N0.01 -> N0.07) ===\n');

function testCanonicalFixturesAndPaths() {
  console.log('Test 1 : Fixtures canoniques Mode 1, Mode 2 multi-pages et Mode 3 Brochure (N0.02, N0.04)...');
  const m1 = createCanonicalMode1Tour();
  const m2 = createCanonicalMode2TerritorialDoc();
  const m3 = createCanonicalMode3Brochure();

  assert.strictEqual(m1.steps.length, 5, 'Mode 1 : 5 étapes attendues');
  assert.strictEqual(m2.pages.length, 2, 'Mode 2 : 2 pages attendues');
  assert.strictEqual(m2.maps.length, 2, 'Mode 2 : 2 scènes cartographiques isolées');
  assert.strictEqual(m3.mode, 'brochure', 'Mode 3 : mode brochure attendu');

  // Vérifier l'aller-retour HTML sur les 3 chemins de publication
  const html1 = generateStandaloneHTML(m1);
  assert.strictEqual(extractStoryFromHTML(html1).steps.length, 5);

  const html2 = generateDocumentHTML(m2);
  const re2 = extractStoryFromHTML(html2);
  assert.strictEqual(re2.pages.length, 2);
  assert.strictEqual(re2.maps.length, 2);

  const html3 = generateBrochurePrintHTML(m3);
  const re3 = extractStoryFromHTML(html3);
  assert.strictEqual(re3.mode, 'brochure');
  // Vérifier que la galerie de la page 1 a bien été aplatie en planche contact
  const galBlock = re3.pages[0].blocks.find((b) => b.id === 'b-gal-1');
  assert.strictEqual(galBlock.type, 'image');
  assert.strictEqual(galBlock.data.isContactSheet, true);
  console.log('  -> OK : Fixtures canoniques et chemins de publication validés.');
}

function testRenderMatrixAndProfileContracts() {
  console.log('Test 2 : Matrice des capacités et distinction des profils de sortie (N0.05, N0.07)...');
  const allTypes = ['title', 'text', 'callout', 'image', 'gallery', 'map', 'table', 'legend', 'source'];
  for (const t of allTypes) {
    assert.ok(BLOCK_RENDER_MATRIX[t], `Le type de bloc ${t} doit figurer dans BLOCK_RENDER_MATRIX`);
    assert.ok(BLOCK_RENDER_MATRIX[t].staticFallback.length > 5);
  }
  assert.strictEqual(BLOCK_RENDER_MATRIX.gallery.profiles.print, 'converted');
  assert.ok(!BLOCK_RENDER_MATRIX.gallery.allowedModes.includes('brochure'));

  // Contrats de profils : stockage éditable vs présentation vs diffusion PDF
  assert.strictEqual(OUTPUT_PROFILE_CONTRACTS.editor.includesEditorChrome, true);
  assert.strictEqual(OUTPUT_PROFILE_CONTRACTS.web.includesEditorChrome, false);
  assert.strictEqual(OUTPUT_PROFILE_CONTRACTS.presentation.includesEditorChrome, false);
  assert.strictEqual(OUTPUT_PROFILE_CONTRACTS.print.allowsDynamicMedia, false);
  assert.strictEqual(OUTPUT_PROFILE_CONTRACTS.print.allowsAnimatedVehicles, false);
  assert.strictEqual(OUTPUT_PROFILE_CONTRACTS.print.reimportableAsProject, false);
  console.log('  -> OK : Matrice des capacités et contrats de profils validés.');
}

function testVersioningAndUnknownFields() {
  console.log('Test 3 : Versionnage du schéma, préservation des champs inconnus et rejet propre (N0.06)...');
  const m2 = createCanonicalMode2TerritorialDoc();
  const withUnknown = {
    ...m2,
    customFutureExtension: { experimentalFlag: true, authorNotes: 'Préservé' },
  };
  const jsonStr = JSON.stringify(withUnknown);
  const parsed = parseStoryJSON(jsonStr);
  assert.deepStrictEqual(
    parsed.customFutureExtension,
    { experimentalFlag: true, authorNotes: 'Préservé' },
    'Les champs inconnus ne doivent pas être effacés lors de la lecture JSON'
  );

  const migrated = migrateStorySchemaPreservingUnknown(parsed);
  assert.strictEqual(migrated.schemaVersion, 2);
  assert.deepStrictEqual(migrated.customFutureExtension, { experimentalFlag: true, authorNotes: 'Préservé' });

  // Rejet propre d'une version future incompatible
  const futureDoc = { ...m2, schemaVersion: 99 };
  const check = validateProjectSchemaVersion(futureDoc);
  assert.strictEqual(check.valid, false);
  assert.ok(check.error.includes('non compatible'));
  assert.throws(() => parseStoryJSON(JSON.stringify(futureDoc)), /non compatible|JSON valide/);
  console.log('  -> OK : Versionnage, préservation des champs inconnus et rejet des versions incompatibles validés.');
}

try {
  testCanonicalFixturesAndPaths();
  testRenderMatrixAndProfileContracts();
  testVersioningAndUnknownFields();
  console.log('\n=== PORTE N0 VALIDÉE AVEC SUCCÈS ===');
} catch (err) {
  console.error('\n❌ ÉCHEC PORTE N0 :', err);
  process.exit(1);
}

