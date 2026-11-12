/**
 * Vérification unitaire et d'intégration Porte R2 : Moteur de déplacement unifié et catalogue partagé
 */

import assert from 'node:assert';
import vm from 'node:vm';
import { VEHICLE_CATALOG, VEHICLE_SVG_PATHS, renderSafeVehicleSvg } from '../src/core/vehicleCatalog.ts';
import { createVehicleController, createTwoLevelVehicleDomElement } from '../src/core/vehicleController.ts';
import { createCanonicalMode1Tour, createCanonicalMode2TerritorialDoc } from '../src/core/canonicalFixtures.ts';
import { generateStandaloneHTML } from '../src/core/publish.ts';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';

console.log('=== VÉRIFICATION PORTE R2 : MOTEUR UNIQUE & CATALOGUE PARTAGÉ ===\n');

// 1. R2.1 & R2.2 : Catalogue complet de 7 véhicules libres de droits et chemins partagés
console.log('1. Vérification du catalogue et des chemins vectoriels partagés...');
const expectedVehicles = ['airplane', 'ship', 'car', 'bus', 'train', 'bike', 'walker'];
expectedVehicles.forEach((vId) => {
  assert.ok(VEHICLE_SVG_PATHS[vId], `Chemin SVG présent pour le véhicule "${vId}"`);
  assert.ok(VEHICLE_CATALOG.some((item) => item.id === vId), `Véhicule "${vId}" présent dans le catalogue`);
  const svg = renderSafeVehicleSvg(vId, '#0b7fb0', 28);
  assert.ok(svg.includes(VEHICLE_SVG_PATHS[vId]), `renderSafeVehicleSvg utilise le chemin canonique de "${vId}"`);
});
console.log('   -> 7 véhicules du catalogue et chemins partagés : OK.');

// 2. R2.2 & R2.6 : Propagation des SVG canoniques dans les exports Mode 1 et Mode 2
console.log('\n2. Vérification de la propagation du catalogue dans les exports HTML...');
const m1 = createCanonicalMode1Tour();
m1.routeAnimation = { enabled: true, vehicle: 'bus', durationSec: 3 };
const html1 = generateStandaloneHTML(m1);
assert.ok(html1.includes(VEHICLE_SVG_PATHS.bus), 'Mode 1 HTML utilise le tracé SVG réel du Bus');

const m2 = createCanonicalMode2TerritorialDoc();
m2.maps[0].layers[0].features.find((f) => f.geometryType === 'LineString').routeAnimation = {
  enabled: true,
  vehicle: 'ship',
  durationSec: 4,
};
const html2 = generateDocumentHTML(m2);
assert.ok(html2.includes(VEHICLE_SVG_PATHS.ship), 'Mode 2 HTML utilise le tracé SVG réel du Navire');
console.log('   -> Exports Mode 1 et Mode 2 synchronisés avec les tracés SVG du catalogue : OK.');

// 3. R2.3 : Respect des options loop, orientToRoute, duration et stepClock
console.log('\n3. Vérification du comportement du contrôleur (loop, orientation, suivi)...');
const coords = [[2.3, 48.8], [2.4, 48.85], [2.5, 48.9]];
let lastSample = null, cameraFollowEvents = 0;

// Test sans boucle (loop: false)
const ctrlNoLoop = createVehicleController({
  coords,
  config: { enabled: true, vehicle: 'car', durationSec: 2, loop: false, cameraFollow: true },
  onSample: (s) => { lastSample = s; },
  onCameraFollow: () => { cameraFollowEvents++; },
});

ctrlNoLoop.play();
assert.strictEqual(ctrlNoLoop.getState(), 'playing');
for (let t = 0; t <= 1000; t += 50) {
  ctrlNoLoop.stepClock(t);
}
assert.strictEqual(ctrlNoLoop.getState(), 'playing');
assert.ok(ctrlNoLoop.getProgress() >= 0.48 && ctrlNoLoop.getProgress() <= 0.52);

for (let t = 1050; t <= 2100; t += 50) {
  ctrlNoLoop.stepClock(t);
}
assert.strictEqual(ctrlNoLoop.getState(), 'completed', 'Doit passer en completed à la fin si loop: false');
assert.strictEqual(ctrlNoLoop.getProgress(), 1);

// Test avec boucle (loop: true)
const ctrlLoop = createVehicleController({
  coords,
  config: { enabled: true, vehicle: 'car', durationSec: 1, loop: true },
});
ctrlLoop.play();
for (let t = 0; t <= 1200; t += 50) {
  ctrlLoop.stepClock(t);
}
assert.strictEqual(ctrlLoop.getState(), 'playing', 'Reste playing si loop: true');
assert.ok(ctrlLoop.getProgress() < 0.35, 'Rebouclage effectué');
ctrlLoop.destroy();

// 4. R2.4 : Deux niveaux DOM et libération propre des ressources
console.log('\n4. Vérification de la structure DOM à deux niveaux et nettoyage...');
const fakeDoc = {
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    style: {},
    appendChild(c) { this.child = c; return c; },
  }),
};
const domEl = createTwoLevelVehicleDomElement(fakeDoc, { vehicle: 'bike', orientToRoute: false }, '#e11d48', 45);
assert.strictEqual(domEl.wrapper.className, 'vehicle-marker-wrap');
assert.strictEqual(domEl.innerIcon.className, 'vehicle-marker-icon');
assert.strictEqual(domEl.innerIcon.style.transform, 'rotate(0deg)', 'orientToRoute: false fige la rotation à 0deg');
console.log('   -> Structure DOM à deux niveaux et options d’orientation validées.');

console.log('\n✅ PORTE R2 VALIDÉE AVEC SUCCÈS : MOTEUR ET CATALOGUE ALIGNÉS.');
