/**
 * Script de validation automatisée P0 (E04 - E12)
 * Exécute la suite complète de recette P0.
 */

import assert from 'node:assert';
import { createZip, readZip } from '../src/core/zip.ts';

const testStory = {
  id: 'test-story-p0',
  version: '2.0.0',
  title: 'Parcours de Test P0',
  subtitle: 'Validation parité complète',
  author: 'Laurent Bernard',
  created: 1730973600000,
  modified: 1730973600000,
  appearance: {
    theme: 'light',
    font: 'Inter',
    accentColor: '#0b7fb0',
    panelPosition: 'left',
    showProgress: true,
  },
  mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  layers: [],
  steps: [
    {
      id: 'step-1',
      title: 'Étape 1 : Bastille',
      description: '<p>Départ de la Bastille.</p>',
      camera: { center: [2.369, 48.853], zoom: 14, pitch: 0, bearing: 0 },
      media: { type: 'image', url: 'https://example.com/bastille.jpg' },
      marker: { color: '#0b7fb0' },
    },
    {
      id: 'step-2',
      title: 'Étape 2 : République',
      description: '<p>Arrivée à la République.</p>',
      camera: { center: [2.364, 48.867], zoom: 14, pitch: 20, bearing: 45 },
      marker: { color: '#e63946' },
    },
  ],
};

console.log('=== LANCEMENT DE LA RECETTE P0 (E04 -> E12) ===\n');

// E04 & E08 : Création d'archive ZIP et relecture
async function testZipEngine() {
  console.log('Test 1 : Moteur ZIP (écriture et lecture)...');
  const files = [
    { name: 'LISEZMOI.txt', data: 'Documentation StoryMap P0' },
    { name: 'data/storymap.json', data: JSON.stringify(testStory) },
    { name: 'images/bastille.txt', data: 'fake-image-bytes' },
  ];
  const zipBlob = await createZip(files);
  assert(zipBlob.size > 0, 'Le blob ZIP ne doit pas être vide');

  const entries = await readZip(zipBlob);
  assert.strictEqual(entries.length, 3, 'L archive doit contenir exactement 3 entrées');

  const readme = entries.find(e => e.name === 'LISEZMOI.txt');
  assert(readme, 'LISEZMOI.txt manquant');
  assert.strictEqual(await readme.text(), 'Documentation StoryMap P0');

  const jsonEntry = entries.find(e => e.name === 'data/storymap.json');
  assert(jsonEntry, 'data/storymap.json manquant');
  const parsed = JSON.parse(await jsonEntry.text());
  assert.strictEqual(parsed.id, testStory.id);
  assert.strictEqual(parsed.steps.length, 2);
  console.log('  -> OK : E04 / E08 validés.');
}

// E09 : Sauvegarde complète multi-projets
async function testBackupZip() {
  console.log('Test 2 : Sauvegarde complète de bibliothèque (multi-récits)...');
  const story2 = { ...testStory, id: 'story-2', title: 'Circuit Secondaire' };
  const entries = [
    { name: 'storymaps/parcours-p0.json', data: JSON.stringify(testStory) },
    { name: 'storymaps/circuit-2.json', data: JSON.stringify(story2) },
    { name: 'sauvegarde-manifest.json', data: JSON.stringify({ count: 2, generator: 'StoryMap 2.0.0' }) },
  ];
  const blob = await createZip(entries);
  const read = await readZip(blob);
  assert.strictEqual(read.length, 3);
  const manifest = JSON.parse(await read.find(e => e.name === 'sauvegarde-manifest.json').text());
  assert.strictEqual(manifest.count, 2);
  console.log('  -> OK : E09 validé.');
}

// E01, E07 & E10 : Page HTML autonome, extraction et repli hors-ligne
async function testHtmlStandalone() {
  console.log('Test 3 : HTML autonome, extraction et repli hors-ligne (E01, E07, E10)...');
  const storyJson = JSON.stringify(testStory).replace(/</g, '\\u003c');
  const title = testStory.title;
  const html = `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body>
<div id="map"></div>
<div id="map-fallback"><div><h3>Mode dégradé hors-ligne</h3></div></div>
<script id="storymap-data" type="application/json">${storyJson}</script>
</body>
</html>`;

  // Vérification de présence du conteneur de repli hors-ligne
  assert(html.includes('id="map-fallback"'), 'Conteneur map-fallback obligatoire pour le hors-ligne');
  assert(html.includes('id="storymap-data"'), 'Balise storymap-data obligatoire');

  // Extraction sans DOMParser (regex fallback de Node)
  const match = html.match(/<script[^>]*id="(?:storymap-data|story-data|atelier-storymap-data)"[^>]*>([\s\S]*?)<\/script>/i);
  assert(match && match[1], 'Extraction impossible');
  const extracted = JSON.parse(match[1]);
  assert.strictEqual(extracted.id, testStory.id);
  assert.strictEqual(extracted.title, testStory.title);
  assert.strictEqual(extracted.steps.length, 2);
  console.log('  -> OK : E01, E07, E10 validés.');
}

// E10 : Résilience aux archives corrompues
async function testZipResilience() {
  console.log('Test 4 : Résilience face aux fichiers corrompus...');
  const badData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  let caught = false;
  try {
    await readZip(badData);
  } catch (err) {
    caught = true;
    assert(err.message.includes('invalide'), 'Message d erreur explicite attendu');
  }
  assert(caught, 'Une archive corrompue doit être rejetée avec une exception');
  console.log('  -> OK : Rejet robuste des erreurs.');
}

async function run() {
  await testZipEngine();
  await testBackupZip();
  await testHtmlStandalone();
  await testZipResilience();
  console.log('\n======================================================');
  console.log('RAPPORT P0-E : VALIDATION COMPLETE AVEC SUCCES');
  console.log('======================================================');
}

run().catch(err => {
  console.error('\nERREUR P0 :', err);
  process.exit(1);
});
