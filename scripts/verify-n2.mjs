/**
 * Script de vérification automatisée — Porte N2
 * Thème partagé, hiérarchie de priorité, opacité rgba, contraste WCAG, modèles de structure et propagation
 *
 * Exécution : node --experimental-strip-types --loader ./scripts/loader.mjs --no-warnings scripts/verify-n2.mjs
 */

import assert from 'node:assert/strict';
import {
  DEFAULT_THEME_TOKENS,
  FONT_CATALOG,
  hexToRgba,
  extractProjectThemeTokens,
  resolveVisualStyle,
  measureColorContrast,
  resetBlockStyleToInherited,
  resetPageStyleToInherited,
} from '../src/core/themeResolver.ts';
import { MODE1_PANEL_PRESETS, PAGE_STRUCTURAL_TEMPLATES, previewStructuralTemplate } from '../src/core/layoutTemplates.ts';
import { createCanonicalMode2TerritorialDoc } from '../src/core/canonicalFixtures.ts';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';
import { parseStoryHTML, parseStoryJSON } from '../src/core/io.ts';

console.log('=== VÉRIFICATION PORTE N2 : THÈME PARTAGÉ, HIÉRARCHIE & MODÈLES DE STRUCTURE ===\n');

// 1. Catalogue de polices et licences (N2.03)
console.log('1. Test du catalogue de polices et licences (N2.03)...');
assert.ok(FONT_CATALOG.length >= 5, 'Catalogue de polices disponible');
for (const f of FONT_CATALOG) {
  assert.ok(f.family && f.license, `Licence renseignée pour ${f.family}`);
}
console.log('   -> Catalogue de polices et métadonnées de licence : OK.');

// 2. Séparation opacité du fond (rgba) vs opacité du contenu (N2.13)
console.log('2. Test de la séparation opacité surface (rgba) vs opacité contenu (N2.13)...');
const rgbaHalf = hexToRgba('#ffffff', 0.45);
assert.equal(rgbaHalf, 'rgba(255, 255, 255, 0.45)', 'Fond converti en rgba sans toucher au texte');
const rgbaShort = hexToRgba('#000', 0.8);
assert.equal(rgbaShort, 'rgba(0, 0, 0, 0.8)');
console.log('   -> Opacité de surface via rgba(r,g,b,a) : OK.');

// 3. Hiérarchie de priorité : Application -> Projet -> Page -> Bloc -> Profil (N2.02, N2.04, N2.12, N2.14)
console.log('3. Test de la hiérarchie de résolution du thème et des surcharges (N2.02, N2.12, N2.14)...');
const doc = createCanonicalMode2TerritorialDoc();
doc.themeTokens = {
  ...DEFAULT_THEME_TOKENS,
  headingFont: 'Cinzel',
  bodyFont: 'Merriweather',
  primaryColor: '#1e40af',
  accentColor: '#1e40af',
  pageBackground: '#f8fafc',
  surfaceBackground: '#ffffff',
  surfaceOpacity: 0.9,
  textColor: '#0f172a',
  borderWidthPx: 2,
  borderStyle: 'solid',
  borderColor: '#94a3b8',
  radiusPx: 12,
};

const page = doc.pages[0];
const inheritedBlock = page.blocks[0];
const customBlock = {
  ...page.blocks[1],
  styleOverride: {
    styleMode: 'custom',
    backgroundColor: '#fef3c7',
    backgroundOpacity: 0.65,
    borderWidthPx: 3,
    borderStyle: 'dashed',
    borderColor: '#d97706',
    radiusPx: 18,
    textColor: '#78350f',
  },
};
const framelessBlock = {
  ...page.blocks[2],
  styleOverride: { styleMode: 'frameless' },
};

// Bloc hérité suit le thème du projet
const stInherited = resolveVisualStyle(doc, page, inheritedBlock, 'web-interactive');
assert.equal(stInherited.headingFont, 'Cinzel');
assert.equal(stInherited.bodyFont, 'Merriweather');
assert.equal(stInherited.accentColor, '#1e40af');
assert.equal(stInherited.surfaceCssBackground, 'rgba(255, 255, 255, 0.9)');
assert.equal(stInherited.borderCss, '2px solid #94a3b8');

// Bloc personnalisé conserve sa surcharge même si le thème global change
doc.themeTokens.surfaceBackground = '#e2e8f0';
const stCustom = resolveVisualStyle(doc, page, customBlock, 'web-interactive');
assert.equal(stCustom.surfaceCssBackground, 'rgba(254, 243, 199, 0.65)', 'Surcharge locale préservée');
assert.equal(stCustom.borderCss, '3px dashed #d97706');
assert.equal(stCustom.radiusCss, '18px');
assert.equal(stCustom.textColor, '#78350f');

// Bloc sans cadre (frameless) : repère discret dans l'éditeur, invisible en lecture/impression
const stFramelessEditor = resolveVisualStyle(doc, page, framelessBlock, 'editor');
assert.equal(stFramelessEditor.surfaceCssBackground, 'transparent');
assert.equal(stFramelessEditor.borderCss, 'none');
assert.equal(stFramelessEditor.showEditorGuide, true, 'Repère discret actif dans l’éditeur');

const stFramelessPrint = resolveVisualStyle(doc, page, framelessBlock, 'print');
assert.equal(stFramelessPrint.showEditorGuide, false, 'Aucun repère d’éditeur en impression');
assert.equal(stFramelessPrint.shadowCss, 'none', 'Pas d’ombre portée parasite en impression');

// Action "Revenir au style du projet"
const resetBlk = resetBlockStyleToInherited(customBlock);
assert.equal(resetBlk.styleOverride, undefined);
const stAfterReset = resolveVisualStyle(doc, page, resetBlk, 'web-interactive');
assert.equal(stAfterReset.surfaceBackground, '#e2e8f0', 'Le bloc réinitialisé hérite à nouveau du projet');
const resetPg = resetPageStyleToInherited({ ...page, styleOverride: { pageBackground: '#000' } });
assert.equal(resetPg.styleOverride, undefined);
console.log('   -> Hiérarchie Projet -> Page -> Bloc, mode sans cadre et retour au thème : OK.');

// 4. Contrôle de contraste WCAG (N2.06)
console.log('4. Test du calcul de contraste WCAG (N2.06)...');
const goodContrast = measureColorContrast('#0f172a', '#ffffff');
const badContrast = measureColorContrast('#cbd5e1', '#f8fafc');
assert.ok(goodContrast >= 15, `Contraste élevé attendu (${goodContrast})`);
assert.ok(badContrast < 3, `Contraste faible détecté (${badContrast})`);
console.log('   -> Mesure de contraste WCAG : OK.');

// 5. Modèles de structure sans perte de bloc (N2.15, N2.16)
console.log('5. Test des modèles de structure avec aperçu sans perte de bloc (N2.15, N2.16)...');
assert.equal(MODE1_PANEL_PRESETS.length, 3);
assert.ok(PAGE_STRUCTURAL_TEMPLATES.length >= 3);
const originalBlockCount = page.blocks.length;
const preview = previewStructuralTemplate(page, 'atlas-dominant', 'a4-portrait');
assert.equal(preview.preservedCount, originalBlockCount, 'Aucun bloc ne doit être supprimé par un modèle de structure');
assert.equal(page.blocks[0].w, 6, 'La page source reste strictement immuable pendant l’aperçu');
console.log('   -> Modèles de structure et non-destruction des blocs : OK.');

// 6. Propagation aux exports HTML, Brochure et roundtrip JSON/HTML (N2.08 à N2.11, N2.17)
console.log('6. Test de la propagation aux exports et roundtrip complet (N2.08 -> N2.11, N2.17)...');
doc.pages[0].blocks[1] = customBlock;
const htmlDoc = generateDocumentHTML(doc);
assert.ok(htmlDoc.includes('rgba(254, 243, 199, 0.65)'), 'Le HTML publié contient le fond rgba du bloc surchargé');
assert.ok(htmlDoc.includes('3px dashed #d97706'), 'Le HTML publié contient la bordure personnalisée du bloc');

const htmlBrochure = generateBrochurePrintHTML(doc);
assert.ok(htmlBrochure.includes('Cinzel'), 'La brochure A4 applique la police de titrage du thème');

const reimportedFromHtml = parseStoryHTML(htmlDoc);
const reimportedTokens = extractProjectThemeTokens(reimportedFromHtml);
assert.equal(reimportedTokens.headingFont, 'Cinzel', 'Police de titrage conservée après roundtrip HTML');
assert.equal(reimportedFromHtml.pages[0].blocks[1].styleOverride?.borderStyle, 'dashed', 'Surcharge locale de bloc conservée après roundtrip HTML');

const reimportedFromJson = parseStoryJSON(JSON.stringify(doc));
assert.equal(reimportedFromJson.themeTokens?.bodyFont, 'Merriweather');
console.log('   -> Propagation aux publications et roundtrip : OK.');

console.log('\n✅ PORTE N2 VALIDÉE AVEC SUCCÈS.');
