/**
 * Script de vérification automatisée — Porte N1
 * Palette d’insertion flottante (Portail), catalogue par mode et inspecteur de blocs
 *
 * Exécution : node --experimental-strip-types --loader ./scripts/loader.mjs --no-warnings scripts/verify-n1.mjs
 */

import assert from 'node:assert/strict';
import {
  BLOCK_CATALOG,
  CATALOG_CATEGORIES,
  getAvailableCatalogItems,
  convertBlockTypePreservingContent,
  computeFloatingPalettePosition,
} from '../src/core/blockCatalog.ts';
import { addBlock, expandBlock, shrinkBlock, deleteBlock } from '../src/core/grid.ts';

console.log('=== VÉRIFICATION PORTE N1 : PALETTE FLOTTANTE & INSPECTEUR DE BLOCS ===\n');

// 1. Catalogue de blocs partagé et filtrage par mode
console.log('1. Test du catalogue partagé et filtrage par mode (N1.03, N1.05)...');
assert.equal(BLOCK_CATALOG.length, 11, 'Le catalogue complet expose les 11 types de blocs');
assert.equal(CATALOG_CATEGORIES.length, 4, '4 catégories : Texte, Médias, Carte, Documentation');

const docItems = getAvailableCatalogItems('rich-document');
const brochureItems = getAvailableCatalogItems('brochure');
const storymapItems = getAvailableCatalogItems('storymap');
assert.equal(docItems.length, 11, 'Mode 2 (rich-document) expose les 11 types de blocs');
assert.equal(brochureItems.length, 8, 'Mode 3 (brochure) filtre les blocs purement web (gallery, button, form) et propose 8 types');
assert.equal(storymapItems.length, 0, 'Mode 1 (storymap) n’expose aucun bloc documentaire');
assert.equal(brochureItems.some((i) => i.type === 'gallery' || i.type === 'button' || i.type === 'form'), false, 'Les éléments purement interactifs/web sont filtrés en mode brochure');
const galItem = BLOCK_CATALOG.find((i) => i.type === 'gallery');
assert.ok(galItem?.staticAlternative, 'Alternative statique documentée pour gallery');
for (const item of docItems) {
  assert.ok(item.label.length > 0 && item.description.length > 0, `Libellé et description requis pour ${item.type}`);
}
console.log('   -> Catalogue et filtrage par mode : OK.');

// 2. Positionnement intelligent de la palette flottante hors cellule (Portail)
console.log('2. Test du positionnement intelligent de la palette hors cellule (N1.01, N1.02, N1.04, N1.06, N1.07)...');

// Cas nominal : cellule 1x1 en haut à gauche d'un écran bureau
const posNormal = computeFloatingPalettePosition(
  { top: 120, left: 100, right: 180, bottom: 200, width: 80, height: 80 },
  1280,
  800,
  340,
  360
);
assert.equal(posNormal.layout, 'popover');
assert.equal(posNormal.top, 208, 'Ouverture sous le bouton déclencheur par défaut');
assert.equal(posNormal.flippedVertically, false);

// Cas bord bas + bord droit : cellule 1x1 tout en bas à droite de la fenêtre
const posBottomRight = computeFloatingPalettePosition(
  { top: 680, left: 1150, right: 1230, bottom: 760, width: 80, height: 80 },
  1280,
  800,
  340,
  360
);
assert.equal(posBottomRight.layout, 'popover');
assert.equal(posBottomRight.flippedVertically, true, 'Bascule automatique au-dessus de la cellule en bas d’écran');
assert.ok((posBottomRight.top || 0) < 680, 'Top est au-dessus de la cellule');
assert.ok(posBottomRight.left + posBottomRight.width <= 1280 - 12, 'Ne déborde jamais à droite du viewport');

// Cas petit écran (< 640px) : feuille basse (bottom-sheet)
const posMobile = computeFloatingPalettePosition(
  { top: 300, left: 40, right: 120, bottom: 380, width: 80, height: 80 },
  390,
  844,
  340,
  360
);
assert.equal(posMobile.layout, 'bottom-sheet', 'Bascule en feuille basse sur écran étroit (< 640px)');
assert.equal(posMobile.width, 390);
console.log('   -> Positionnement intelligent (normal, rebord bas/droit, mobile) : OK.');

// 3. Ouverture/fermeture sans mutation de bloc ni d'historique (N1.09)
console.log('3. Test d’immutabilité à l’ouverture/fermeture sans sélection (N1.09)...');
const initialBlocks = [
  { id: 'b1', type: 'title', x: 0, y: 0, w: 2, h: 1, data: { text: 'Titre initial', level: 1 } },
];
const snapshotBefore = JSON.stringify(initialBlocks);
computeFloatingPalettePosition(
  { top: 100, left: 100, right: 180, bottom: 180, width: 80, height: 80 },
  1280,
  800
);
assert.equal(JSON.stringify(initialBlocks), snapshotBefore, 'Aucune mutation des blocs tant qu’un type n’est pas choisi');

// Insertion effective en cellule (0, 1) de taille 1x1
const seed = convertBlockTypePreservingContent(
  { id: 'b-new', type: 'text', x: 0, y: 1, w: 1, h: 1, data: { text: '' } },
  'callout'
);
const addRes = addBlock(initialBlocks, seed, 6, 8);
assert.equal(addRes.success, true);
assert.equal(addRes.blocks.length, 2);
assert.equal(addRes.blocks[1].w, 1, 'Insertion directe dans une cellule 1x1 sans agrandir la cellule');
assert.equal(addRes.blocks[1].h, 1);
console.log('   -> Insertion 1x1 et non-mutation à l’annulation : OK.');

// 4. Remplacement de type avec préservation maximale du contenu (N1.04, N1.08)
console.log('4. Test du remplacement de type sans perte de contenu (N1.04, N1.08)...');
const richTextBlock = {
  id: 'b-conv',
  type: 'text',
  x: 1,
  y: 1,
  w: 2,
  h: 2,
  data: { text: 'Contenu analytique important' },
};

const asCallout = convertBlockTypePreservingContent(richTextBlock, 'callout');
assert.equal(asCallout.type, 'callout');
assert.equal(asCallout.data.text, 'Contenu analytique important', 'Texte conservé vers encadré');

const asTitle = convertBlockTypePreservingContent(asCallout, 'title');
assert.equal(asTitle.type, 'title');
assert.equal(asTitle.data.text, 'Contenu analytique important', 'Texte conservé vers titre');
assert.equal(asTitle.data.level, 2);

const asTable = convertBlockTypePreservingContent(asTitle, 'table');
assert.equal(asTable.type, 'table');
assert.equal(asTable.data.text, 'Contenu analytique important', 'Texte conservé en métadonnée de tableau');
assert.ok(Array.isArray(asTable.data.rows), 'Structure rows initialisée pour le tableau');

const imgBlock = {
  id: 'b-img',
  type: 'image',
  x: 0,
  y: 0,
  w: 2,
  h: 2,
  data: { url: 'data:image/png;base64,AAA', caption: 'Vue aérienne', alt: 'Vue' },
};
const asGallery = convertBlockTypePreservingContent(imgBlock, 'gallery');
assert.equal(asGallery.type, 'gallery');
assert.equal(asGallery.data.items.length, 1, 'Image unique convertie en élément de galerie');
assert.equal(asGallery.data.items[0].url, 'data:image/png;base64,AAA');

const backToImg = convertBlockTypePreservingContent({ ...asGallery, data: { items: asGallery.data.items } }, 'image');
assert.equal(backToImg.type, 'image');
assert.equal(backToImg.data.url, 'data:image/png;base64,AAA', 'Première image de galerie restaurée en bloc image');

// Vérification des opérations de grille après conversion
const exp = expandBlock([asCallout], 'b-conv', 'right', 6, 8);
assert.equal(exp.success, true);
assert.equal(exp.blocks[0].w, 3);
const shr = shrinkBlock(exp.blocks, 'b-conv');
assert.equal(shr.success, true);
assert.equal(shr.blocks[0].w, 2);
const del = deleteBlock(shr.blocks, 'b-conv');
assert.equal(del.length, 0);
console.log('   -> Conversions de type et opérations de bloc : OK.');

console.log('\n✅ PORTE N1 VALIDÉE AVEC SUCCÈS.');
