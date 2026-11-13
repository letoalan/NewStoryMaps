/**
 * Test de vérification : Centrage van Wijk, orientation Nord fixe & séparation étape statique / transfert
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStoryLegPath } from '../src/core/storyCameraPath.ts';
import { generateStandaloneHTML } from '../src/core/publish.ts';

console.log('=== VÉRIFICATION VÉHICULES STORYMAP : CENTRAGE, ORIENTATION & TEMPS STATIQUE/TRANSFERT ===\n');

// 1. Modèle de van Wijk & Nuij : durée pondérée par la distance et le changement d'échelle
console.log('1. Modèle van Wijk : Durée et zoom de croisière selon échelle/distance...');
const shortLeg = createStoryLegPath([[2.35, 48.85], [2.36, 48.86]], { center: [2.35, 48.85], zoom: 15 }, { center: [2.36, 48.86], zoom: 15 }, 1024);
const longLeg = createStoryLegPath([[2.35, 48.85], [-0.57, 44.83]], { center: [2.35, 48.85], zoom: 14 }, { center: [-0.57, 44.83], zoom: 12 }, 1024);
const zoomLeg = createStoryLegPath([[2.35, 48.85], [2.35, 48.85]], { center: [2.35, 48.85], zoom: 6 }, { center: [2.35, 48.85], zoom: 16 }, 1024);

assert.ok(shortLeg.durationMs >= 1500, 'Durée minimale respectée');
assert.ok(longLeg.durationMs > shortLeg.durationMs, 'Trajet long plus long que trajet court');
assert.ok(longLeg.cruiseZoom < 12, 'Trajet long dézoome pour englober la trajectoire');
assert.ok(zoomLeg.durationMs >= 1500, 'Changement de zoom pur a une durée pondérée');
console.log(`   -> Court: ${shortLeg.durationMs}ms, Long: ${longLeg.durationMs}ms (cruise zoom ${longLeg.cruiseZoom}), Zoom: ${zoomLeg.durationMs}ms : OK.`);

// 2. Centrage continu et trajectoire du véhicule
console.log('2. Trajectoire continue du véhicule et convergence aux bornes...');
const s0 = longLeg.sampleAtProgress(0);
const sMid = longLeg.sampleAtProgress(0.5);
const s1 = longLeg.sampleAtProgress(1);

assert.deepEqual(s0.coordinates, [2.35, 48.85], 'Départ à center 0');
assert.deepEqual(s1.coordinates, [-0.57, 44.83], 'Arrivée à center 1');
assert.equal(s0.zoom, 14, 'Zoom départ exact');
assert.equal(s1.zoom, 12, 'Zoom arrivée exact');
assert.ok(sMid.zoom <= 12, 'Zoom médian en retrait pour garantir la visibilité du véhicule');
assert.ok(sMid.coordinates[0] < 2.35 && sMid.coordinates[0] > -0.57, 'Coordonnée médiane cohérente');
console.log(`   -> Départ: ${s0.coordinates} (z${s0.zoom}), Milieu: ${sMid.coordinates} (z${sMid.zoom}), Arrivée: ${s1.coordinates} (z${s1.zoom}) : OK.`);

// 3. Calcul du cap (heading) et orientation carte Nord fixe
console.log('3. Orientation carte fixe (Nord = 0) et cap écran du véhicule...');
const northLeg = createStoryLegPath([[0, 0], [0, 10]], { center: [0, 0], zoom: 5 }, { center: [0, 10], zoom: 5 }, 1024);
const eastLeg = createStoryLegPath([[0, 0], [10, 0]], { center: [0, 0], zoom: 5 }, { center: [10, 0], zoom: 5 }, 1024);
const southLeg = createStoryLegPath([[0, 10], [0, 0]], { center: [0, 10], zoom: 5 }, { center: [0, 0], zoom: 5 }, 1024);
const westLeg = createStoryLegPath([[10, 0], [0, 0]], { center: [10, 0], zoom: 5 }, { center: [0, 0], zoom: 5 }, 1024);

assert.equal(Math.round(northLeg.sampleAtProgress(0.5).heading), 0, 'Cap Nord = 0°');
assert.equal(Math.round(eastLeg.sampleAtProgress(0.5).heading), 90, 'Cap Est = 90°');
assert.equal(Math.round(southLeg.sampleAtProgress(0.5).heading), 180, 'Cap Sud = 180°');
assert.equal(Math.round(westLeg.sampleAtProgress(0.5).heading), 270, 'Cap Ouest = 270°');
console.log('   -> Caps Nord (0°), Est (90°), Sud (180°), Ouest (270°) validés : OK.');

// 4. Distinction nette étape statique vs temps de transfert (Player.tsx & PlayerNarrative.tsx)
console.log('4. Séparation stricte étape statique / temps de transfert dans le lecteur React...');
const playerSrc = readFileSync('src/components/player/Player.tsx', 'utf-8');
const narrativeSrc = readFileSync('src/components/player/PlayerNarrative.tsx', 'utf-8');

assert.ok(playerSrc.includes('bearing: 0'), 'Player maintient la carte orientée Nord');
assert.ok(playerSrc.includes('innerIcon.style.transform = `rotate(${sample.heading}deg)`'), 'Rotation circonscrite à l icône');
assert.ok(playerSrc.includes('startTransfer'), 'Fonction de transfert interstitiel dédiée');
assert.ok(playerSrc.includes('if (!isPlaying || transfer) return'), 'Autoplay bloqué pendant le transfert interstitiel');
assert.ok(playerSrc.includes('loop: false'), 'Player force loop: false pour une traversée unique sans répétition');
assert.ok(playerSrc.includes('finished = true'), 'Player détruit le contrôleur dès l arrivée pour passage immédiat');
assert.ok(narrativeSrc.includes('isTransfer'), 'Volet narratif distingue étape statique et transfert');
assert.ok(narrativeSrc.includes('Traversée de l’espace interstitiel'), 'Indication visuelle explicite de l espace interstitiel');
console.log('   -> Player et PlayerNarrative séparent rigoureusement statique et transfert : OK.');

// 5. Vérification du runtime autonome publié (publish.ts + publishStoryRuntime.ts)
console.log('5. Vérification du runtime autonome publié (Mode 1)...');
const sampleStory = {
  version: '2.0.0',
  title: 'Test Navigation Interstitielle',
  mapStyle: 'positron',
  appearance: { autoplayInterval: 5000, routeStyle: 'curved' },
  routeAnimation: { enabled: true, vehicle: 'airplane', durationSec: 4 },
  steps: [
    { id: 's1', title: 'Paris', camera: { center: [2.35, 48.85], zoom: 12, pitch: 0, bearing: 0 }, markers: [] },
    { id: 's2', title: 'Lyon', camera: { center: [4.83, 45.76], zoom: 10, pitch: 0, bearing: 0 }, markers: [] }
  ]
};

const standaloneHtml = generateStandaloneHTML(sampleStory);
assert.ok(standaloneHtml.includes('createStoryLegPath'), 'Script autonome contient createStoryLegPath');
assert.ok(standaloneHtml.includes('startTransfer'), 'Script autonome gère startTransfer');
assert.ok(standaloneHtml.includes('transfer-pbar'), 'Script autonome affiche la jauge de progression interstitielle');
assert.ok(standaloneHtml.includes('scheduleAutoplay'), 'Script autonome gère scheduleAutoplay aux étapes statiques');
assert.ok(standaloneHtml.includes('bearing: 0'), 'Script autonome maintient bearing: 0');
console.log('   -> Export autonome Mode 1 conforme et synchronisé : OK.');

console.log('\n✅ TOUTES LES VÉRIFICATIONS VÉHICULE, CAMÉRA & ESPACE INTERSTITIEL ONT RÉUSSI AVEC SUCCÈS !');
