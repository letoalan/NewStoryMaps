/**
 * Archivage des 3 fixtures canoniques de référence et de leurs exports HTML (R0.3)
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  createCanonicalMode1Tour,
  createCanonicalMode2TerritorialDoc,
  createCanonicalMode3Brochure,
} from '../src/core/canonicalFixtures.ts';
import { generateStandaloneHTML } from '../src/core/publish.ts';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';

const outDir = path.resolve('wiki/verification/fixtures/baseline');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Fixture Mode 1 (Récit simple 5 étapes)
const m1 = createCanonicalMode1Tour();
fs.writeFileSync(path.join(outDir, 'mode1-tour.json'), JSON.stringify(m1, null, 2), 'utf8');
const h1 = generateStandaloneHTML(m1);
fs.writeFileSync(path.join(outDir, 'mode1-tour.html'), h1, 'utf8');

// 2. Fixture Mode 2 (Document territorial multi-pages / multi-cartes)
const m2 = createCanonicalMode2TerritorialDoc();
fs.writeFileSync(path.join(outDir, 'mode2-territorial.json'), JSON.stringify(m2, null, 2), 'utf8');
const h2 = generateDocumentHTML(m2);
fs.writeFileSync(path.join(outDir, 'mode2-territorial.html'), h2, 'utf8');

// 3. Fixture Mode 3 (Brochure A4)
const m3 = createCanonicalMode3Brochure();
fs.writeFileSync(path.join(outDir, 'mode3-brochure.json'), JSON.stringify(m3, null, 2), 'utf8');
const h3 = generateBrochurePrintHTML(m3);
fs.writeFileSync(path.join(outDir, 'mode3-brochure.html'), h3, 'utf8');

console.log('✅ 3 fixtures canoniques et leurs exports HTML archivés dans wiki/verification/fixtures/baseline/');

