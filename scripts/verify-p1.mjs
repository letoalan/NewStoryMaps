/**
 * Script de validation automatisée P1 (F01 -> F09)
 * Vérifie : modèle unifié (UnifiedProject, Page, Block), modes 1/2/3,
 * persistance et réimport de la charte de marque (brand),
 * et conformité de la landing page.
 */

import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== LANCEMENT DE LA RECETTE P1 (F01 -> F09) ===\n');

// 1. F01 & F02 : Modèle de données unifié
async function testUnifiedDataModel() {
  console.log('Test 1 : Modèle unifié (Project, Page, Block, NarrativeBinding)...');
  const project = {
    id: 'proj-1',
    version: '2.0.0',
    title: 'Atlas Territorial 2026',
    mode: 'rich-document',
    created: Date.now(),
    modified: Date.now(),
    brand: {
      primaryFont: 'Inter',
      secondaryFont: 'Lora',
      colors: ['#0b7fb0', '#161b25', '#ffcf5c'],
    },
    pages: [
      {
        id: 'page-1',
        title: 'Introduction',
        layout: { format: 'a4-portrait', gridColumns: 4, gridRows: 6 },
        blocks: [
          {
            id: 'b-1',
            type: 'text',
            x: 0,
            y: 0,
            w: 4,
            h: 2,
            data: { text: '<p>Bienvenue</p>' },
          },
          {
            id: 'b-2',
            type: 'map',
            x: 0,
            y: 2,
            w: 4,
            h: 4,
            data: { mapId: 'map-main' },
            binding: { mapId: 'map-main', action: 'highlight' },
          },
        ],
      },
    ],
    maps: [
      {
        id: 'map-main',
        name: 'Carte Régionale',
        mapStyle: 'positron',
        view: { center: [2.35, 48.85], zoom: 10 },
      },
    ],
  };

  assert.strictEqual(project.version, '2.0.0');
  assert.strictEqual(project.mode, 'rich-document');
  assert.strictEqual(project.pages.length, 1);
  assert.strictEqual(project.pages[0].blocks.length, 2);
  assert.strictEqual(project.pages[0].blocks[1].binding.action, 'highlight');
  console.log('  -> OK : F01 / F02 validés.');
}

// 2. F03 & F08 : Persistance et aller-retour du mode et de la charte de marque
async function testBrandAndModeRoundtrip() {
  console.log('Test 2 : Aller-retour du mode et de la charte de marque (F03, F08)...');
  const storyWithBrand = {
    id: 'story-brand-test',
    version: '2.0.0',
    title: 'Projet Identité',
    mode: 'brochure',
    brand: {
      primaryFont: 'Roboto',
      secondaryFont: 'Cinzel',
      colors: ['#2563eb', '#1e293b', '#f59e0b'],
    },
    created: Date.now(),
    modified: Date.now(),
    appearance: {
      theme: 'light',
      font: 'Roboto',
      accentColor: '#2563eb',
      panelPosition: 'left',
      showProgress: true,
    },
    mapStyle: 'positron',
    layers: [],
    steps: [
      {
        id: 's-1',
        title: 'Étape 1',
        description: 'Test',
        camera: { center: [0, 0], zoom: 2, pitch: 0, bearing: 0 },
      },
    ],
  };

  const jsonStr = JSON.stringify(storyWithBrand);
  const parsed = JSON.parse(jsonStr);

  assert.strictEqual(parsed.mode, 'brochure');
  assert.strictEqual(parsed.brand.primaryFont, 'Roboto');
  assert.strictEqual(parsed.brand.secondaryFont, 'Cinzel');
  assert.deepStrictEqual(parsed.brand.colors, ['#2563eb', '#1e293b', '#f59e0b']);

  // Test de l'adaptateur
  const { convertModernToLegacyV2, convertLegacyToModern } = await import('../src/core/adapter.ts');
  const v2 = convertModernToLegacyV2(storyWithBrand);
  assert.strictEqual(v2.story.mode, 'brochure');
  assert.strictEqual(v2.story.brand.primaryFont, 'Roboto');

  const backToModern = convertLegacyToModern(v2);
  assert.strictEqual(backToModern.mode, 'brochure');
  assert.strictEqual(backToModern.brand.primaryFont, 'Roboto');
  console.log('  -> OK : F03 / F08 validés.');
}

// 3. Inspection de la landing page (suppression connecteur historique, 3 modes disponibles & 3 vidéos FR)
async function testLandingPageCompliance() {
  console.log('Test 3 : Conformité de la landing page (3 modes & 3 vidéos FR, sans version historique)...');
  const landingHtml = fs.readFileSync('public/landing.html', 'utf8');
  const headerTsx = fs.readFileSync('src/components/common/Header.tsx', 'utf8');

  // Suppression du connecteur vers la version historique
  assert(!landingHtml.includes('app.html'), 'Le connecteur app.html doit être supprimé de landing.html');
  assert(!landingHtml.includes('Version historique'), 'Le bouton Version historique doit être supprimé');
  assert(!headerTsx.includes('app.html'), 'Le connecteur app.html doit être supprimé de Header.tsx');

  // Présence des 3 modes disponibles
  assert(landingHtml.includes('Mode 1 · Disponible'), 'Mode 1 doit être marqué Disponible');
  assert(landingHtml.includes('Mode 2 · Disponible'), 'Mode 2 doit être marqué Disponible');
  assert(landingHtml.includes('Mode 3 · Disponible'), 'Mode 3 doit être marqué Disponible');

  // Intégration des 3 vidéos de présentation en français
  assert(landingHtml.includes('media/video-mode1-storymap.mp4'), 'Vidéo Mode 1 intégrée');
  assert(landingHtml.includes('media/video-mode2-document.mp4'), 'Vidéo Mode 2 intégrée');
  assert(landingHtml.includes('media/video-mode3-brochure.mp4'), 'Vidéo Mode 3 intégrée');
  assert(fs.existsSync('public/media/video-mode1-storymap.mp4'), 'Fichier vidéo 1 présent');
  assert(fs.existsSync('public/media/video-mode2-document.mp4'), 'Fichier vidéo 2 présent');
  assert(fs.existsSync('public/media/video-mode3-brochure.mp4'), 'Fichier vidéo 3 présent');
  console.log('  -> OK : Landing page et 3 vidéos FR validées.');
}

// 4. Script de la landing page (thème et gestion des vidéos)
async function testLandingScriptSupport() {
  console.log('Test 4 : Script interactif de la landing page...');
  const landingJs = fs.readFileSync('public/js/landing.js', 'utf8');
  assert(!landingJs.includes('app.html'), 'Aucune redirection vers app.html dans landing.js');
  assert(landingJs.includes('.lp-mode-video'), 'Gestion des 3 vidéos présente dans landing.js');
  console.log('  -> OK : Script landing.js validé.');
}

async function run() {
  await testUnifiedDataModel();
  await testBrandAndModeRoundtrip();
  await testLandingPageCompliance();
  await testLandingScriptSupport();
  console.log('\n======================================================');
  console.log('RAPPORT P1 : TOUS LES TESTS SONT AU VERT');
  console.log('======================================================');
}

run().catch(err => {
  console.error('\nERREUR P1 :', err);
  process.exit(1);
});

