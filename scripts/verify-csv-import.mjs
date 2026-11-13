/**
 * Script de vérification automatisée — Import CSV dans StoryMap
 * Teste le parseur CSV, la détection des colonnes, la conversion en étapes et StoryMap, et les intégrations UI/IO.
 *
 * Exécution : node --experimental-strip-types --loader ./scripts/loader.mjs --no-warnings scripts/verify-csv-import.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCSVRows, parseCSVToSteps, parseStoryCSV } from '../src/core/csvParser.ts';
import { parseStoryFile } from '../src/core/io.ts';

console.log('=== VÉRIFICATION IMPORT CSV DANS LA STORYMAP ===\n');

// 1. Découpage bas niveau parseCSVRows
console.log('1. Test du découpage CSV (délimiteurs, guillemets et retours à la ligne)...');
const csvSimple = 'Ordre,Titre,Latitude,Longitude\n1,"Paris, France",48.8566,2.3522\n2,"Lyon ""Centre""",45.75,4.85';
const rowsSimple = parseCSVRows(csvSimple);
assert.equal(rowsSimple.length, 3);
assert.equal(rowsSimple[1][1], 'Paris, France');
assert.equal(rowsSimple[2][1], 'Lyon "Centre"');

// 2. Délimiteur point-virgule et virgules décimales (Excel français)
const csvSemi = 'Ordre;Titre;Latitude;Longitude;Zoom\n1;Marseille;43,2965;5,3698;12\n2;Nice;43,7102;7,2620;13';
const stepsSemi = parseCSVToSteps(csvSemi);
assert.equal(stepsSemi.length, 2);
assert.equal(stepsSemi[0].title, 'Marseille');
assert.ok(Math.abs(stepsSemi[0].camera.center[1] - 43.2965) < 0.001);
assert.ok(Math.abs(stepsSemi[0].camera.center[0] - 5.3698) < 0.001);
assert.equal(stepsSemi[0].camera.zoom, 12);

// 3. Format canonique StoryMap avec Image et Description
console.log('2. Test du format canonique exporté par StoryMap...');
const csvCanon = [
  'Ordre,Titre,Latitude,Longitude,Zoom,Description,Image',
  '1,"Tour Eiffel",48.8584,2.2945,15,"<p>Monument emblématique</p>","https://example.org/eiffel.jpg"',
  '2,"Louvre",48.8606,2.3376,14,"Musée du Louvre","https://example.org/louvre.jpg"',
].join('\n');
const stepsCanon = parseCSVToSteps(csvCanon);
assert.equal(stepsCanon.length, 2);
assert.equal(stepsCanon[0].title, 'Tour Eiffel');
assert.equal(stepsCanon[0].description, '<p>Monument emblématique</p>');
assert.equal(stepsCanon[0].media?.url, 'https://example.org/eiffel.jpg');
assert.equal(stepsCanon[1].description, '<p>Musée du Louvre</p>');

// 4. Format anglophone avec variantes d'en-tête
console.log('3. Test des variantes d\'en-têtes et formats anglophones...');
const csvEnglish = 'Title,Lat,Lng,Scale,Text\nLondon,51.5074,-0.1278,11,Capital city\nEdinburgh,55.9533,-3.1883,12,Scottish capital';
const stepsEnglish = parseCSVToSteps(csvEnglish);
assert.equal(stepsEnglish.length, 2);
assert.equal(stepsEnglish[0].title, 'London');
assert.ok(Math.abs(stepsEnglish[0].camera.center[0] - (-0.1278)) < 0.001);

// 5. CSV sans en-tête avec détection automatique
console.log('4. Test du CSV sans en-tête (détection des colonnes géographiques)...');
const csvNoHeader = '1,Bordeaux,44.8378,-0.5792,12,Capitale mondiale du vin\n2,Toulouse,43.6047,1.4442,12,La ville rose';
const stepsNoHeader = parseCSVToSteps(csvNoHeader);
assert.equal(stepsNoHeader.length, 2);
assert.equal(stepsNoHeader[0].title, 'Bordeaux');
assert.ok(Math.abs(stepsNoHeader[0].camera.center[1] - 44.8378) < 0.001);

// 6. parseStoryCSV crée une StoryMap prête à l'emploi
console.log('5. Test de création de StoryMap complète depuis CSV...');
const story = parseStoryCSV(csvCanon, 'Mon Grand Voyage');
assert.equal(story.title, 'Mon Grand Voyage');
assert.equal(story.steps.length, 2);
assert.equal(story.mode, 'storymap');

// 7. Intégration dans io.ts parseStoryFile
console.log('6. Test de parseStoryFile avec un fichier CSV...');
const fakeCsvFile = {
  name: 'etapes_circuit.csv',
  type: 'text/csv',
  text: async () => csvCanon,
};
const importedStories = await parseStoryFile(fakeCsvFile);
assert.equal(importedStories.length, 1);
assert.equal(importedStories[0].title, 'etapes_circuit');
assert.equal(importedStories[0].steps.length, 2);

// 8. Vérification des éléments UI dans les composants
console.log('7. Vérification des composants UI (SheetView, Outline, Dashboard)...');
const sheetViewCode = fs.readFileSync('src/components/editor/SheetView.tsx', 'utf-8');
assert.ok(sheetViewCode.includes('Importer CSV'), 'Bouton Importer CSV présent dans SheetView');
assert.ok(sheetViewCode.includes('parseCSVToSteps'), 'parseCSVToSteps branché dans SheetView');

const outlineCode = fs.readFileSync('src/components/editor/Outline.tsx', 'utf-8');
assert.ok(outlineCode.includes('Importer des étapes depuis un fichier CSV'), 'Bouton import CSV dans Outline');

const dashCode = fs.readFileSync('src/components/dashboard/Dashboard.tsx', 'utf-8');
assert.ok(dashCode.includes('.csv'), 'Extension .csv acceptée dans le tableau de bord');

console.log('\n TOUS LES TESTS D\'IMPORT CSV SONT AU VERT !');

