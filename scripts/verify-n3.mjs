/**
 * Script de vérification automatisée — Porte N3
 * Couverture Hero photographique puis vidéo, voile de contraste, prévol brochure et import ZIP
 *
 * Exécution : node --experimental-strip-types --loader ./scripts/loader.mjs --no-warnings scripts/verify-n3.mjs
 */

import assert from 'node:assert/strict';
import { resolveHeroRenderState, renderPublishedHeroHTML } from '../src/core/heroRenderer.ts';
import { runBrochurePreflight } from '../src/core/brochurePreflight.ts';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';
import { createCanonicalMode2TerritorialDoc } from '../src/core/canonicalFixtures.ts';
import { parseStoryFile } from '../src/core/io.ts';
import { createZip } from '../src/core/zip.ts';

console.log('=== VÉRIFICATION PORTE N3 : COUVERTURE HERO PHOTO / VIDÉO & REPLI STATIQUE ===\n');

// 1. Hero photographique, cadrage, point focal et voile de contraste (N3.01 -> N3.04)
console.log('1. Test du Hero photographique, point focal et voile de contraste (N3.01 -> N3.04)...');
const photoHero = {
  enabled: true,
  mediaType: 'photo',
  mediaUrl: 'https://example.org/banner.jpg',
  backgroundColor: '#0f172a',
  fit: 'cover',
  focalPoint: { x: 25, y: 75 },
  veilColor: '#0f172a',
  veilOpacity: 0.5,
  veilStyle: 'gradient',
  contentAlign: 'left',
  title: 'Atlas Littoral',
  subtitle: 'Érosion et submersions',
  credit: '© IGN Orthophoto',
  heightPreset: 'tall',
};

const stPhoto = resolveHeroRenderState(photoHero, '', '', '', 'web-interactive', false);
assert.equal(stPhoto.enabled, true);
assert.equal(stPhoto.renderMode, 'photo');
assert.equal(stPhoto.objectPositionCss, '25% 75%', 'Point focal x/y correctement appliqué');
assert.ok(stPhoto.veilCss.includes('linear-gradient'), 'Voile dégradé généré');

const htmlPhoto = renderPublishedHeroHTML(photoHero, '', '', '', 'web-interactive', 'test');
assert.ok(htmlPhoto.includes('class="hero-photo"'), 'Balise img hero-photo présente');
assert.ok(!htmlPhoto.includes('<video'), 'Aucun empilement vidéo + photo simultané');
assert.ok(htmlPhoto.includes('object-position:25% 75%'), 'Point focal sérialisé dans le HTML publié');
assert.ok(htmlPhoto.includes('© IGN Orthophoto'), 'Mention de source présente');
console.log('   -> Hero photographique, point focal et voile : OK.');

// 2. Hero vidéo web vs prefers-reduced-motion vs impression statique (N3.06 -> N3.11)
console.log('2. Test du Hero vidéo web, prefers-reduced-motion et transposition statique (N3.06 -> N3.11)...');
const videoHero = {
  enabled: true,
  mediaType: 'video',
  mediaUrl: 'https://example.org/drone.mp4',
  posterUrl: 'https://example.org/drone-poster.jpg',
  autoplay: true,
  loop: true,
  muted: true,
  title: 'Survol côtier',
};

const stVideoWeb = resolveHeroRenderState(videoHero, '', '', '', 'web-interactive', false);
assert.equal(stVideoWeb.renderMode, 'video');
assert.equal(stVideoWeb.muted, true, 'Vidéo muette par défaut');

const htmlVideoWeb = renderPublishedHeroHTML(videoHero, '', '', '', 'web-interactive', 'vid');
assert.ok(htmlVideoWeb.includes('<video class="hero-video"'), 'Balise <video> générée sur le web');
assert.ok(htmlVideoWeb.includes('muted'), 'Attribut muted présent');
assert.ok(htmlVideoWeb.includes('data-action="toggle-hero-video"'), 'Bouton Lecture/Pause explicite présent');

// En prefers-reduced-motion : repli automatique vers poster statique
const stVideoReduced = resolveHeroRenderState(videoHero, '', '', '', 'web-interactive', true);
assert.equal(stVideoReduced.renderMode, 'static-poster', 'prefers-reduced-motion bascule sur l’image statique');

// En mode impression / brochure A4 : jamais de <video>, uniquement l'image poster
const htmlVideoPrint = renderPublishedHeroHTML(videoHero, '', '', '', 'print', 'prt');
assert.ok(!htmlVideoPrint.includes('<video'), 'Aucune balise <video> dans le profil print/brochure');
assert.ok(htmlVideoPrint.includes('src="https://example.org/drone-poster.jpg"'), 'Image poster statique utilisée en brochure A4');
console.log('   -> Hero vidéo web, prefers-reduced-motion et transposition brochure : OK.');

// 3. Prévol brochure : blocage si vidéo Hero sans posterUrl (N3.12)
console.log('3. Test du prévol brochure pour Hero vidéo sans posterUrl (N3.12)...');
const docNoPoster = createCanonicalMode2TerritorialDoc();
docNoPoster.hero = {
  enabled: true,
  mediaType: 'video',
  mediaUrl: 'https://example.org/clip.mp4',
  posterUrl: '',
};
const preflightFail = runBrochurePreflight(docNoPoster);
assert.equal(preflightFail.ready, false, 'Prévol bloqué si vidéo sans posterUrl');
assert.ok(preflightFail.issues.some((i) => i.code === 'MISSING_VIDEO_POSTER' && i.severity === 'error'));

docNoPoster.hero.posterUrl = 'https://example.org/poster.jpg';
const preflightOk = runBrochurePreflight(docNoPoster);
assert.equal(preflightOk.ready, true, 'Prévol débloqué dès qu’un posterUrl est fourni');

const brochureHtml = generateBrochurePrintHTML(docNoPoster);
assert.ok(brochureHtml.includes('https://example.org/poster.jpg'), 'Poster Hero présent dans la brochure générée');
const docHtml = generateDocumentHTML(docNoPoster);
assert.ok(docHtml.includes('<video class="hero-video"'), 'Vidéo Hero présente dans le document interactif généré');
console.log('   -> Contrôle prévol MISSING_VIDEO_POSTER et publications : OK.');

// 4. Import ZIP avec médias Hero relatifs (N3.13)
console.log('4. Test de la résolution des médias Hero relatifs à l’import ZIP (N3.13)...');
const docZip = createCanonicalMode2TerritorialDoc();
docZip.brand = { ...docZip.brand, logo: 'assets/logo.png' };
docZip.hero = {
  enabled: true,
  mediaType: 'video',
  mediaUrl: 'assets/intro.mp4',
  posterUrl: 'assets/poster.png',
};
const fakePng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const fakeMp4 = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);
const zipBlob = await createZip([
  { name: 'storymap.json', data: JSON.stringify(docZip) },
  { name: 'assets/logo.png', data: fakePng },
  { name: 'assets/poster.png', data: fakePng },
  { name: 'assets/intro.mp4', data: fakeMp4 },
]);
Object.defineProperty(zipBlob, 'name', { value: 'hero-bundle.zip' });
const importedList = await parseStoryFile(zipBlob);
assert.equal(importedList.length, 1);
assert.ok(importedList[0].brand?.logo?.startsWith('data:image/png;base64,'), 'Logo résolu en DataURL');
assert.ok(importedList[0].hero?.posterUrl?.startsWith('data:image/png;base64,'), 'Poster Hero résolu en DataURL');
assert.ok(importedList[0].hero?.mediaUrl?.startsWith('data:video/mp4;base64,'), 'Vidéo Hero résolue en DataURL');
console.log('   -> Résolution ZIP des ressources Hero : OK.');

console.log('\n✅ PORTE N3 VALIDÉE AVEC SUCCÈS.');
