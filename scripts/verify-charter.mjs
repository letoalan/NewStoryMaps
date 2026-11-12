/**
 * Vérification unitaire de l'importateur et du convertisseur de Charte Graphique JSON
 */

import assert from 'node:assert';
import {
  ESCALE_NATURE_CHARTER,
  parseGraphicCharterJson,
  convertCharterToTheme,
  applyCharterToStory,
  exportGraphicCharterJson,
  createStoryFromCharter,
} from '../src/core/graphicCharter.ts';
import {
  detectCharterContext,
  selectCharterForContext,
  getCharterLogoForContext,
  bundleCharterVariants,
  ESCALE_NATURE_LIGHT,
  ATLAS_NOCTURNE_DARK,
  HORIZON_COLORED,
} from '../src/core/charterContext.ts';
import { parseStoryJSON } from '../src/core/io.ts';
import { FONT_CATALOG } from '../src/core/themeResolver.ts';

console.log('\n=== VÉRIFICATION DU MODULE CHARTE GRAPHIQUE JSON ===\n');

// 1. Validation de la fixture canonique "Escale & Nature"
console.log('1. Test de conformité du modèle canonique "Escale & Nature"...');
assert.strictEqual(ESCALE_NATURE_CHARTER.schemaVersion, '1.0.0');
assert.strictEqual(ESCALE_NATURE_CHARTER.kind, 'graphic-charter');
assert.strictEqual(ESCALE_NATURE_CHARTER.project.name, 'Escale & Nature');
assert.strictEqual(ESCALE_NATURE_CHARTER.colors.primary, '#F8485E');
assert.strictEqual(ESCALE_NATURE_CHARTER.colors.secondary, '#00C1D3');
assert.strictEqual(ESCALE_NATURE_CHARTER.colors.text, '#334756');
assert.strictEqual(ESCALE_NATURE_CHARTER.colors.surface, '#F3F4F4');
assert.strictEqual(ESCALE_NATURE_CHARTER.typography.heading.family, 'Nunito');
assert.strictEqual(ESCALE_NATURE_CHARTER.typography.heading.sizePx, 32);
assert.strictEqual(ESCALE_NATURE_CHARTER.typography.body.family, 'Roboto');
assert.strictEqual(ESCALE_NATURE_CHARTER.layout.radiusPx, 12);
console.log('   -> Fixture canonique Escale & Nature validée.');

// 2. Test du parseur JSON
console.log('2. Test de robustesse de parseGraphicCharterJson...');
const jsonString = JSON.stringify(ESCALE_NATURE_CHARTER, null, 2);
const parsed = parseGraphicCharterJson(jsonString);
assert.ok(parsed.success, 'Le JSON canonique doit être accepté.');
assert.strictEqual(parsed.doc.project.name, 'Escale & Nature');

const invalidJson = parseGraphicCharterJson('{ malformed json');
assert.strictEqual(invalidJson.success, false, 'Le JSON malformé doit échouer.');

const missingColors = parseGraphicCharterJson(JSON.stringify({ schemaVersion: '1.0.0', kind: 'graphic-charter' }));
assert.strictEqual(missingColors.success, false, 'Doit rejeter une charte sans colors.');

const emptyStr = parseGraphicCharterJson('   ');
assert.strictEqual(emptyStr.success, false, 'Doit rejeter une chaîne vide.');
console.log('   -> Robustesse du parseur validée.');

// 3. Test de conversion en tokens de thème et marque StoryMap
console.log('3. Test de conversion convertCharterToTheme...');
const converted = convertCharterToTheme(ESCALE_NATURE_CHARTER);
assert.strictEqual(converted.brand.primaryColor, '#F8485E');
assert.strictEqual(converted.brand.secondaryColor, '#00C1D3');
assert.strictEqual(converted.brand.fontTitle, 'Nunito');
assert.strictEqual(converted.brand.fontBody, 'Roboto');
assert.strictEqual(converted.themeTokens.primaryColor, '#F8485E');
assert.strictEqual(converted.themeTokens.surfaceBackground, '#F3F4F4');
assert.strictEqual(converted.themeTokens.textColor, '#334756');
assert.strictEqual(converted.themeTokens.radiusPx, 12);
assert.strictEqual(converted.themeTokens.titleSizePx, 32);
assert.strictEqual(converted.appearancePatch.accentColor, '#F8485E');
assert.strictEqual(converted.appearancePatch.headingFont, 'Nunito');
assert.strictEqual(converted.projectMeta.title, 'Escale & Nature');
console.log('   -> Conversion charte vers tokens et marque validée.');

// 4. Test d\'application sur un récit existant
console.log('4. Test de applyCharterToStory...');
const dummyStory = {
  id: 'story-test',
  version: '2.0.0',
  title: 'Nouvelle StoryMap',
  created: Date.now(),
  modified: Date.now(),
  appearance: { theme: 'light', font: 'Inter', accentColor: '#0b7fb0', panelPosition: 'left', showProgress: true },
  mapStyle: 'carto-voyager',
  layers: [],
  steps: [],
  hero: { enabled: true, mediaType: 'photo', veilColor: '#0b7fb0' },
};
const updatedStory = applyCharterToStory(dummyStory, ESCALE_NATURE_CHARTER);
assert.strictEqual(updatedStory.title, 'Escale & Nature');
assert.strictEqual(updatedStory.themeTokens.primaryColor, '#F8485E');
assert.strictEqual(updatedStory.appearance.accentColor, '#F8485E');
assert.strictEqual(updatedStory.hero.veilColor, '#F8485E');
assert.strictEqual(updatedStory.graphicCharter.kind, 'graphic-charter');
console.log('   -> Application de la charte au récit validée.');

// 5. Test d'exportation en JSON
console.log('5. Test de exportGraphicCharterJson...');
const exported = exportGraphicCharterJson(updatedStory);
assert.strictEqual(exported.schemaVersion, '1.0.0');
assert.strictEqual(exported.colors.primary, '#F8485E');
assert.strictEqual(exported.typography.heading.family, 'Nunito');
console.log('   -> Exportation de la charte validée.');

// 6. Test du catalogue de polices
console.log('6. Test du catalogue des polices...');
assert.ok(FONT_CATALOG.some((f) => f.family === 'Nunito'), 'Nunito doit être présent dans FONT_CATALOG.');
console.log('   -> Catalogue des polices enrichi avec succès.');

// 7. Test d'importation directe depuis la landing page (parseStoryJSON) et propagation multi-modes
console.log('7. Test d\'importation directe landing page & propagation multi-modes...');
const fromLanding = parseStoryJSON(JSON.stringify(ESCALE_NATURE_CHARTER));
assert.strictEqual(fromLanding.title, 'Escale & Nature');
assert.strictEqual(fromLanding.brand.primaryColor, '#F8485E');
assert.strictEqual(fromLanding.themeTokens.primaryColor, '#F8485E');
assert.strictEqual(fromLanding.appearance.accentColor, '#F8485E');
assert.strictEqual(fromLanding.appearance.headingFont, 'Nunito');
// Propagation Mode 1 (StoryMap : chapitres)
assert.ok(fromLanding.steps.length >= 2, 'Doit propager les chapitres pour le Mode 1 (StoryMap)');
assert.strictEqual(fromLanding.steps[0].title, 'Escale & Nature');
// Propagation Mode 2 et Mode 3 (Document et Brochure : pages et blocs)
assert.ok(fromLanding.pages.length >= 1, 'Doit propager les pages pour les Modes 2 et 3');
assert.ok(fromLanding.pages[0].blocks.some((b) => b.type === 'title'), 'Doit contenir le bloc titre');
assert.ok(fromLanding.pages[0].blocks.some((b) => b.type === 'callout'), 'Doit contenir le bloc exemple/valeurs');
console.log('   -> Propagation vérifiée dans tous les modes (1, 2 et 3) avec succès.');

// 8. Test de la charte sombre "Atlas Nocturne"
console.log('8. Test de propagation complète de la charte sombre "Atlas Nocturne"...');
const ATLAS_NOCTURNE = {
  schemaVersion: '1.0.0', kind: 'graphic-charter',
  project: { name: 'Atlas Nocturne', values: 'Exploration · Contemplation', description: 'Explorer les territoires à la tombée du jour.' },
  colors: { primary: '#E9B949', secondary: '#B8A1E3', text: '#F4F0E8', background: '#111827', surface: '#1F2937' },
  typography: { heading: { family: 'Georgia', weight: 700, sizePx: 40 }, body: { family: 'Verdana', weight: 400, sizePx: 16 } },
  layout: { spacingPx: 32, radiusPx: 2 },
};
const atlasStory = parseStoryJSON(JSON.stringify(ATLAS_NOCTURNE));
assert.strictEqual(atlasStory.title, 'Atlas Nocturne');
assert.strictEqual(atlasStory.themeTokens.pageBackground, '#111827');
assert.strictEqual(atlasStory.themeTokens.surfaceBackground, '#1F2937');
assert.strictEqual(atlasStory.themeTokens.textColor, '#F4F0E8');
assert.strictEqual(atlasStory.themeTokens.primaryColor, '#E9B949');
assert.strictEqual(atlasStory.themeTokens.secondaryColor, '#B8A1E3');
assert.strictEqual(atlasStory.themeTokens.headingFont, 'Georgia');
assert.strictEqual(atlasStory.themeTokens.bodyFont, 'Verdana');
assert.strictEqual(atlasStory.themeTokens.titleSizePx, 40);
assert.strictEqual(atlasStory.themeTokens.radiusPx, 2);
assert.strictEqual(atlasStory.appearance.theme, 'dark');
assert.ok(atlasStory.mapStyle.includes('dark-matter'), 'Le fond cartographique doit être dark-matter');
assert.ok(atlasStory.maps[0].layers[0].features.some((f) => f.color === '#E9B949'), 'Les repères doivent être dorés #E9B949');
assert.ok(atlasStory.maps[0].layers[0].features.some((f) => f.color === '#B8A1E3'), 'Les tracés doivent être mauves #B8A1E3');
assert.ok(!atlasStory.pages[0].blocks.some((b) => typeof b.data.text === 'string' && b.data.text.includes('<strong>')), 'Aucune balise HTML brute');
console.log('   -> Atlas Nocturne : Fond nuit #111827, surfaces #1F2937, texte #F4F0E8 validés.');

// 9. Test de détection et sélection algorithmique selon le contexte & Hero Logo
console.log('9. Test de détection et sélection algorithmique selon le contexte...');
assert.strictEqual(detectCharterContext(ESCALE_NATURE_LIGHT), 'light');
assert.strictEqual(detectCharterContext(ATLAS_NOCTURNE_DARK), 'dark');
assert.strictEqual(detectCharterContext(HORIZON_COLORED), 'colored');

const bundle = bundleCharterVariants({ light: ESCALE_NATURE_LIGHT, dark: ATLAS_NOCTURNE_DARK, colored: HORIZON_COLORED });
assert.ok(bundle.variants.light && bundle.variants.dark && bundle.variants.colored);
assert.strictEqual(selectCharterForContext(bundle, { theme: 'dark' }).colors.primary, '#E9B949');
assert.strictEqual(selectCharterForContext(bundle, { outputProfile: 'print' }).colors.primary, '#F8485E');
assert.strictEqual(selectCharterForContext(bundle, { isSurfaceColored: true }).colors.primary, '#FFD166');

const testDocWithLogos = {
  ...ESCALE_NATURE_LIGHT,
  logo: { variants: { primary: 'data:image/jpeg;base64,sample123', light: 'data:image/png;base64,white123', dark: 'logo-dark.png' } },
};
assert.strictEqual(getCharterLogoForContext(testDocWithLogos, 'dark'), 'data:image/png;base64,white123');
assert.strictEqual(getCharterLogoForContext(testDocWithLogos, 'colored'), 'logo-dark.png');
assert.strictEqual(getCharterLogoForContext(testDocWithLogos, 'light'), 'data:image/jpeg;base64,sample123');
const storyWithLogo = createStoryFromCharter(testDocWithLogos);
assert.strictEqual(storyWithLogo.hero.logoUrl, 'data:image/jpeg;base64,sample123');
assert.strictEqual(storyWithLogo.brand.logo, 'data:image/jpeg;base64,sample123');

const carnetsParsed = parseGraphicCharterJson({
  schemaVersion: '1.0.0', kind: 'graphic-charter',
  project: { name: 'Carnets de Terre' },
  logo: { variants: { primary: 'data:image/jpeg;base64,CARNETS_PRIMARY', light: 'data:image/png;base64,CARNETS_LIGHT', dark: null } },
  colors: { primary: '#8B5A2B' },
});
assert.ok(carnetsParsed.success);
const carnetsStory = createStoryFromCharter(carnetsParsed.doc);
assert.strictEqual(carnetsStory.hero.logoUrl, 'data:image/jpeg;base64,CARNETS_PRIMARY');
console.log('   -> Détection contextuelle et propagation du Logo dans le Hero validées.');

console.log('\n✅ TOUTES LES VÉRIFICATIONS DE LA CHARTE GRAPHIQUE ONT RÉUSSI AVEC SUCCÈS !\n');

