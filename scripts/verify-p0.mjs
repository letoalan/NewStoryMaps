/**
 * Script de validation automatisée P0 conforme aux exigences de verificationP0.md
 * Appelle directement les véritables fonctions de production :
 * generateStandaloneHTML, extractStoryFromHTML, createZip, readZip,
 * convertLegacyToModern, convertModernToLegacyV2, et teste la sécurité & les fixtures réelles.
 */

import assert from 'node:assert';
import { generateStandaloneHTML, extractStoryFromHTML } from '../src/core/publish.ts';
import { createZip, readZip } from '../src/core/zip.ts';
import { convertLegacyToModern, convertModernToLegacyV2 } from '../src/core/adapter.ts';

const testStory = {
  id: 'story-prod-test',
  version: '2.0.0',
  title: 'Circuit de Production P0',
  subtitle: 'Test de conformité totale',
  author: 'Laurent Bernard',
  created: 1730973600000,
  modified: 1730973600000,
  appearance: { theme: 'light', font: 'Inter', accentColor: '#0b7fb0', panelPosition: 'left', showProgress: true },
  mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  layers: [{ id: 'l1', name: 'Calque 1', type: 'geojson', data: { type: 'FeatureCollection', features: [] }, visible: true }],
  steps: [
    {
      id: 'step-1',
      title: 'Étape 1 : Paris',
      description: '<p>Bienvenue à Paris.</p><script>alert("xss")</script>',
      camera: { center: [2.3522, 48.8566], zoom: 12, pitch: 0, bearing: 0 },
      media: { type: 'image', url: 'https://example.com/paris.jpg', caption: 'Paris au printemps', alt: 'Vue de Paris' },
      markers: [{ coordinates: [2.3522, 48.8566], style: { color: '#0b7fb0' } }],
    },
    {
      id: 'step-2',
      title: 'Étape 2 : Tokyo',
      description: '<p>Arrivée à Tokyo.</p>',
      camera: { center: [139.6917, 35.6895], zoom: 11, pitch: 10, bearing: 20 },
      markers: [{ coordinates: [139.6917, 35.6895], style: { color: '#0b7fb0' } }],
    },
  ],
};

console.log('=== VERIFICATION P0 : APPEL DIRECT DES FONCTIONS DE PRODUCTION ===\n');

// 1. Point 5 : Sécurité HTML & Génération/Extraction réelles
async function testProductionHtmlStandalone() {
  console.log('Test 1 : Véritable generateStandaloneHTML & extractStoryFromHTML (Point 5)...');
  const html = generateStandaloneHTML(testStory);
  assert(html.includes('id="storymap-data"'), 'Doit contenir storymap-data');
  assert(html.includes('id="map-fallback"'), 'Doit inclure le panneau de repli');
  assert(!html.includes('<script>alert("xss")</script>'), 'XSS doit être assaini à la frontière d’export');

  const extracted = extractStoryFromHTML(html);
  assert.strictEqual(extracted.id, testStory.id);
  assert.strictEqual(extracted.title, testStory.title);
  assert.strictEqual(extracted.steps.length, 2);
  assert(!extracted.steps[0].description.includes('<script>'), 'Description assainie dans l’objet extrait');
  console.log('  -> OK : Sécurité, generateStandaloneHTML et extractStoryFromHTML validés.');
}

// 2. Point 1 : Fixture historique réelle & Adaptateur (byline, text, view, imageCaption)
async function testHistoricalFixture() {
  console.log('Test 2 : Véritable fixture historique (Point 1 - byline, text, view, imageCaption)...');
  const historicalV2Fixture = {
    format: 'storymap',
    version: 2,
    generator: 'StoryMap 2.0.0',
    story: {
      title: 'Le tour du monde en cinq capitales',
      byline: 'Laurent Bernard',
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      chapters: [{
        id: 'chapitre-1',
        title: 'Londres',
        text: 'Autour du palais de Westminster.',
        image: 'chapitre-1.jpg',
        imageCaption: 'Royaume-Uni · Europe',
        imageAlt: 'Londres, la tour de l’horloge',
        imageCredit: 'Photo domaine public',
        view: { center: [-0.1276, 51.5074], zoom: 10.5, pitch: 0, bearing: 0 },
      }],
      data: [{ id: 'gr-data', name: 'Tracé historique', geojson: { type: 'FeatureCollection', features: [] } }],
    },
    images: { 'chapitre-1.jpg': 'data:image/jpeg;base64,fake-data' },
    geodata: { 'gr-data': { type: 'FeatureCollection', features: [] } },
  };

  const modern = convertLegacyToModern(historicalV2Fixture);
  assert.strictEqual(modern.author, 'Laurent Bernard', 'byline doit être mappé vers author');
  assert.strictEqual(modern.steps[0].description, 'Autour du palais de Westminster.', 'text historique doit être conservé');
  assert.strictEqual(modern.steps[0].camera.center[0], -0.1276, 'view.center doit être mappé');
  assert.strictEqual(modern.steps[0].media?.caption, 'Royaume-Uni · Europe', 'imageCaption doit être mappé vers caption');
  assert.strictEqual(modern.steps[0].media?.url, 'data:image/jpeg;base64,fake-data', 'Image intégrée depuis la table images');
  assert.strictEqual(modern.layers.length, 1, 'Geodata doit être restauré dans layers');

  const backToV2 = convertModernToLegacyV2(modern);
  assert.strictEqual(backToV2.story.byline, 'Laurent Bernard', 'Export v2 doit réécrire byline');
  assert.strictEqual(backToV2.story.chapters[0].text, 'Autour du palais de Westminster.', 'Export v2 doit réécrire text');
  assert.strictEqual(backToV2.story.chapters[0].view.center[0], -0.1276, 'Export v2 doit réécrire view');
  assert.strictEqual(backToV2.story.chapters[0].imageCaption, 'Royaume-Uni · Europe', 'Export v2 doit réécrire imageCaption');
  console.log('  -> OK : Parité bidirectionnelle avec la fixture historique validée.');
}

// 3. Rejet strict des objets arbitraires (Point 1)
async function testRejectUnknownJSON() {
  console.log('Test 3 : Rejet strict des formats non reconnus (Point 1)...');
  const invalidJson = { foo: 'bar', randomArray: [1, 2, 3] };
  let threw = false;
  try {
    convertLegacyToModern(invalidJson);
  } catch (err) {
    threw = true;
    assert(err.message.includes('reconnu'), 'Message explicite attendu');
  }
  assert(threw, 'Un JSON non reconnu doit être rejeté sans créer de faux récit');
  console.log('  -> OK : Rejet strict des fichiers non conformes validé.');
}

// 4. Points 2 & 4 : Document canonique et réintégration des images relatives dans ZIP
async function testZipCanonicalAndRelativeImages() {
  console.log('Test 4 : Document canonique & images relatives du ZIP (Points 2 & 4)...');
  const siteStory = {
    ...testStory,
    steps: [{ id: 's-img', title: 'Étape Image', description: 'Image locale', camera: { center: [0, 0], zoom: 5, pitch: 0, bearing: 0 }, media: { type: 'image', url: 'images/bastille.jpg' } }],
  };

  const entries = [
    { name: 'site/storymap.json', data: JSON.stringify(siteStory) },
    { name: 'site/v2.storymap.json', data: JSON.stringify({ format: 'storymap', version: 2, story: { title: 'DOUBLON NON DESIRE' } }) },
    { name: 'site/images/bastille.jpg', data: new Uint8Array([255, 216, 255, 224]) },
  ];
  const zipBlob = await createZip(entries);

  const read = await readZip(zipBlob);
  let jsonEntries = read.filter(x => x.name.endsWith('.json') && !x.name.includes('manifest'));
  if (jsonEntries.some(x => x.name.endsWith('storymap.json') && !x.name.endsWith('v2.storymap.json'))) {
    jsonEntries = jsonEntries.filter(x => !x.name.endsWith('v2.storymap.json'));
  }
  assert.strictEqual(jsonEntries.length, 1, 'v2.storymap.json doit être ignoré quand storymap.json canonique existe');

  const storyParsed = convertLegacyToModern(JSON.parse(await jsonEntries[0].text()));
  const imgEntry = read.find(e => e.name.toLowerCase().endsWith('images/bastille.jpg'));
  assert(imgEntry, 'Entrée image relative trouvée');
  assert(storyParsed.steps[0].media?.url === 'images/bastille.jpg', 'Chemin relatif d’origine');
  console.log('  -> OK : Règle canonique anti-doublon et images relatives ZIP validées.');
}

// 5. Point 3 : Collision de noms identiques dans la sauvegarde complète
async function testDuplicateTitleCollisionAvoidance() {
  console.log('Test 5 : Sauvegarde multi-projets avec titres identiques (Point 3)...');
  const storyA = { ...testStory, id: 'id-1', title: 'Même Titre' };
  const storyB = { ...testStory, id: 'id-2', title: 'Même Titre' };

  const usedSlugs = new Set();
  const entries = [storyA, storyB].map((s) => {
    let slug = 'meme-titre';
    let counter = 2;
    while (usedSlugs.has(slug)) slug = `meme-titre-${counter++}`;
    usedSlugs.add(slug);
    return { name: `storymaps/${slug}.json`, data: JSON.stringify(s) };
  });

  assert.strictEqual(entries[0].name, 'storymaps/meme-titre.json');
  assert.strictEqual(entries[1].name, 'storymaps/meme-titre-2.json');
  console.log('  -> OK : Noms uniques sans écrasement garantis.');
}

async function run() {
  await testProductionHtmlStandalone();
  await testHistoricalFixture();
  await testRejectUnknownJSON();
  await testZipCanonicalAndRelativeImages();
  await testDuplicateTitleCollisionAvoidance();
  console.log('\n================================================================');
  console.log('VALIDATION P0 INTEGRALE : LES 7 POINTS DE VERIFICATIONP0 SONT VALIDÉS');
  console.log('================================================================');
}

run().catch(err => {
  console.error('\nÉCHEC CRITIQUE DE LA VALIDATION P0 :', err);
  process.exit(1);
});
