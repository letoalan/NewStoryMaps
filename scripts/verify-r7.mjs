import assert from 'node:assert';
import {
  createCanonicalMode1Tour,
  createCanonicalMode2TerritorialDoc,
  createCanonicalMode3Brochure,
} from '../src/core/canonicalFixtures.ts';
import { generateStandaloneHTML, extractStoryFromHTML } from '../src/core/publish.ts';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';

console.log('--- Test Porte R7 : Réception finale, chaîne multi-modes et conformité ---');

// 1. Recette Mode 1 (StoryMap) : Génération, réimport et absence d'aides d'édition
{
  const m1 = createCanonicalMode1Tour();
  const html1 = generateStandaloneHTML(m1);
  assert.ok(html1.includes('<!DOCTYPE html>'));
  assert.ok(!html1.includes('btn-icon'));
  const reimp1 = extractStoryFromHTML(html1);
  assert.ok(reimp1.mode === 'storymap' || reimp1.mode === 'linear-tour');
  assert.strictEqual(reimp1.steps.length, m1.steps.length);
  console.log('✅ R7.1 : Chaîne Mode 1 (StoryMap) validée');
}

// 2. Recette Mode 2 (Document web enrichi) : Génération, actions, réimport
{
  const m2 = createCanonicalMode2TerritorialDoc();
  const html2 = generateDocumentHTML(m2);
  assert.ok(html2.includes('class="doc-map-canvas"'));
  assert.ok(html2.includes('class="doc-action-btn"'));
  assert.ok(html2.includes('class="doc-map-fallback"'), 'R7.2 : Fallback hors-ligne présent');
  assert.ok(!html2.includes('context-menu'));
  const reimp2 = extractStoryFromHTML(html2);
  assert.strictEqual(reimp2.mode, 'rich-document');
  assert.strictEqual(reimp2.maps.length, 2);
  console.log('✅ R7.1 / R7.2 : Chaîne Mode 2 (Document web enrichi) et résilience validées');
}

// 3. Recette Mode 3 (Brochure A4 PAO) : Génération print, réimport
{
  const m3 = createCanonicalMode3Brochure();
  const html3 = generateBrochurePrintHTML(m3);
  assert.ok(html3.includes('class="brochure-sheet"'));
  assert.ok(html3.includes('@media print'));
  assert.ok(!html3.includes('data-carousel-control'));
  const reimp3 = extractStoryFromHTML(html3);
  assert.strictEqual(reimp3.mode, 'brochure');
  assert.strictEqual(reimp3.pages.length, m3.pages.length);
  console.log('✅ R7.1 / R7.3 : Chaîne Mode 3 (Brochure statique A4) validée');
}

console.log('Toutes les vérifications de la Porte R7 sont validées avec succès !');
