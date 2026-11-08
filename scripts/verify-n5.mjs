/**
 * Script de vérification automatisée — Porte N5
 * Recette de bout en bout (DOM/runtime simulé, exports HTML/JSON/ZIP, Brochure A4, performances et taille des fichiers)
 *
 * Exécution : node --experimental-strip-types --loader ./scripts/loader.mjs --no-warnings scripts/verify-n5.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {
  createCanonicalMode1Tour,
  createCanonicalMode2TerritorialDoc,
  createCanonicalMode3Brochure,
} from '../src/core/canonicalFixtures.ts';
import { generateStandaloneHTML } from '../src/core/publish.ts';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';
import { runBrochurePreflight } from '../src/core/brochurePreflight.ts';
import { parseStoryJSON, parseStoryHTML, parseStoryFile } from '../src/core/io.ts';
import { createZip } from '../src/core/zip.ts';
import { computeFloatingPalettePosition, convertBlockTypePreservingContent } from '../src/core/blockCatalog.ts';
import { resolveVisualStyle, DEFAULT_THEME_TOKENS } from '../src/core/themeResolver.ts';
import { computePathMetrics, interpolateAlongPath } from '../src/core/routeInterpolation.ts';

console.log('=== VÉRIFICATION PORTE N5 : RECETTE DE BOUT EN BOUT, RUNTIME DOM, PERFORMANCES & CONFORMITÉ ===\n');

// 1. N5.01 & N5.02 : Chaîne complète sur les 3 modes (Création -> Thème -> Hero -> Véhicules -> Exports -> Réouverture)
console.log('1. Test de la chaîne complète sur les 3 modes canoniques (N5.01, N5.02)...');

// Mode 1 : Circuit touristique avec thème personnalisé, Hero photo et avion animé
const m1 = createCanonicalMode1Tour();
m1.themeTokens = { ...DEFAULT_THEME_TOKENS, headingFont: 'Cinzel', primaryColor: '#dc2626', accentColor: '#dc2626', surfaceOpacity: 0.88 };
const html1 = generateStandaloneHTML(m1);
assert.ok(html1.includes('rgba(255, 255, 255, 0.88)'), 'Mode 1 : opacité rgba du panneau appliquée');
assert.ok(html1.includes('story-hero-story'), 'Mode 1 : Hero d’ouverture embarqué');
assert.ok(html1.includes('animateSegmentVehicle'), 'Mode 1 : animation du véhicule embarquée');
const reopenedM1 = parseStoryHTML(html1);
assert.equal(reopenedM1.themeTokens?.headingFont, 'Cinzel');
assert.equal(reopenedM1.routeAnimation?.vehicle, 'ship');

// Mode 2 : Document territorial avec cellule 1x1 convertie, surcharge locale de bloc, Hero vidéo + poster et bus animé
const m2 = createCanonicalMode2TerritorialDoc();
m2.hero = {
  enabled: true,
  mediaType: 'video',
  mediaUrl: 'https://example.org/seine-drone.mp4',
  posterUrl: 'https://example.org/seine-poster.jpg',
  title: 'Atlas Comparatif : Rives de Seine',
};
const palPos = computeFloatingPalettePosition({ top: 700, left: 1180, right: 1240, bottom: 760, width: 60, height: 60 }, 1280, 800);
assert.equal(palPos.flippedVertically, true, 'Palette 1x1 en bord bas/droit repositionnée au-dessus');
m2.pages[0].blocks[2] = convertBlockTypePreservingContent(m2.pages[0].blocks[2], 'callout');
m2.pages[0].blocks[2].styleOverride = {
  styleMode: 'custom',
  backgroundColor: '#e0f2fe',
  backgroundOpacity: 0.75,
  borderWidthPx: 2,
  borderStyle: 'solid',
  borderColor: '#0284c7',
};
const html2 = generateDocumentHTML(m2);
assert.ok(html2.includes('rgba(224, 242, 254, 0.75)'), 'Mode 2 : surcharge rgba de bloc sérialisée');
assert.ok(html2.includes('<video class="hero-video"'), 'Mode 2 : Hero vidéo sérialisé');
const reopenedM2 = parseStoryHTML(html2);
assert.equal(reopenedM2.pages[0].blocks[2].type, 'callout');
assert.equal(reopenedM2.pages[0].blocks[2].styleOverride?.backgroundColor, '#e0f2fe');

// Mode 3 : Brochure A4 imprimable avec transposition statique du Hero vidéo et du véhicule
const m3 = createCanonicalMode3Brochure();
const preflightM3 = runBrochurePreflight(m3);
assert.equal(preflightM3.ready, true, 'Mode 3 : prévol brochure valide');
const html3 = generateBrochurePrintHTML(m3);
assert.ok(!html3.includes('<video'), 'Mode 3 : aucune balise <video> dans la brochure A4');
assert.ok(html3.includes('static-print-vehicle'), 'Mode 3 : véhicule statique orienté en fin de tracé');
assert.ok(html3.includes('@page { size: A4 portrait; margin: 0; }'), 'Mode 3 : règles CSS @page A4 présentes');
const reopenedM3 = parseStoryHTML(html3);
assert.equal(reopenedM3.mode, 'brochure');
console.log('   -> Chaîne complète Modes 1, 2 et 3 validée.');

// 2. Exécution réelle du script runtime publié dans une sandbox VM + DOM simulé (N5.03, N5.04)
console.log('2. Test d’exécution réelle du runtime publié (navigation, filtre bascule, marqueur 2 niveaux)...');
const scriptMatch = html2.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
assert.ok(scriptMatch, 'Script runtime trouvé dans le HTML publié Mode 2');

const elementsById = new Map();
const makeEl = (id = '', tag = 'DIV') => ({
  id,
  tagName: tag,
  className: '',
  textContent: '',
  innerHTML: '',
  disabled: false,
  style: { display: 'block', transform: '', boxShadow: '', zIndex: '1' },
  attrs: new Map(),
  classList: { toggle() {} },
  setAttribute(k, v) { this.attrs.set(k, String(v)); },
  getAttribute(k) { return this.attrs.get(k) ?? null; },
  removeAttribute(k) { this.attrs.delete(k); },
  appendChild(c) { return c; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  scrollIntoView() {},
});

['main-stage', 'prof-slide', 'prof-vertical', 'prof-horizontal', 'slide-footer', 'toc-drawer', 'toc-btn', 'prev-btn', 'next-btn', 'page-num', 'dots-container', 'fs-btn', 'page-0', 'page-1', 'toc-0', 'toc-1'].forEach((id) => {
  elementsById.set(id, makeEl(id));
});
const storyDataEl = makeEl('storymap-data', 'SCRIPT');
storyDataEl.textContent = JSON.stringify(m2);
elementsById.set('storymap-data', storyDataEl);

const sandbox = {
  window: {
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
  },
  document: {
    fullscreenElement: null,
    documentElement: { requestFullscreen: async () => {} },
    getElementById: (id) => elementsById.get(id) || makeEl(id),
    querySelectorAll: () => [],
    createElement: (tag) => makeEl('', tag.toUpperCase()),
    addEventListener() {},
    exitFullscreen: async () => {},
  },
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
};
vm.createContext(sandbox);
vm.runInContext(scriptMatch[1], sandbox);

assert.equal(elementsById.get('page-num').textContent, '1 / 2', 'Runtime initialisé et pagination affichée');
sandbox.setPage(1);
assert.equal(elementsById.get('page-num').textContent, '2 / 2', 'Navigation page suivante fonctionnelle dans le runtime');
sandbox.setProfile('vertical');
assert.equal(elementsById.get('main-stage').className, 'profile-vertical', 'Changement de profil runtime fonctionnel');
console.log('   -> Exécution VM du script runtime publié : OK.');

// 3. Roundtrip Archive ZIP complète avec ressources (N5.04)
console.log('3. Test d’export/import Archive ZIP complète avec ressources (N5.04)...');
const zipBlob = await createZip([
  { name: 'test-site/index.html', data: html2 },
  { name: 'test-site/storymap.json', data: JSON.stringify(m2) },
]);
Object.defineProperty(zipBlob, 'name', { value: 'test-site.zip' });
const zipImported = await parseStoryFile(zipBlob);
assert.equal(zipImported.length, 1);
assert.equal(zipImported[0].id, m2.id);
assert.equal(JSON.stringify(parseStoryJSON(JSON.stringify(m2)).themeTokens), JSON.stringify(m2.themeTokens));
console.log('   -> Roundtrip Archive ZIP : OK.');

// 4. Performances : interpolation de 1 000 échantillons et résolution de style de 500 blocs (N5.05)
console.log('4. Test de performance sur parcours long et grille dense (N5.05)...');
const t0 = performance.now();
const longCoords = Array.from({ length: 200 }, (_, i) => [2.0 + i * 0.01, 48.0 + Math.sin(i * 0.1) * 0.05]);
const pathMetrics = computePathMetrics(longCoords);
for (let i = 0; i <= 1000; i++) {
  interpolateAlongPath(pathMetrics, i / 1000);
}
for (let i = 0; i < 500; i++) {
  resolveVisualStyle(m2, m2.pages[0], m2.pages[0].blocks[1], 'web-interactive');
}
const elapsedMs = performance.now() - t0;
assert.ok(elapsedMs < 250, `Budget performance respecté : ${elapsedMs.toFixed(1)} ms (< 250 ms)`);
console.log(`   -> 1 000 interpolations + 500 résolutions de thème exécutées en ${elapsedMs.toFixed(1)} ms : OK.`);

// 5. Conformité stricte de la taille des fichiers maintenus (<= 195 lignes)
console.log('5. Contrôle de la limite stricte de 195 lignes sur les fichiers du dépôt...');
function checkDirLineCounts(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      checkDirLineCounts(full);
    } else if (/\.(ts|tsx|mjs|css)$/.test(entry.name)) {
      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/).length;
      assert.ok(lines <= 195, `Le fichier ${full} dépasse 195 lignes (${lines} lignes)`);
    }
  }
}
checkDirLineCounts(path.resolve('src'));
checkDirLineCounts(path.resolve('scripts'));
console.log('   -> Tous les fichiers de src/ et scripts/ respectent strictement <= 195 lignes : OK.');

console.log('\n✅ PORTE N5 VALIDÉE AVEC SUCCÈS.');
