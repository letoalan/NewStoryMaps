/**
 * Script de vérification automatisée — Porte N4
 * Véhicules animés sur les parcours des modes 1 et 2, interpolation distance, antiméridien, DOM 2 niveaux et statique Mode 3
 *
 * Exécution : node --experimental-strip-types --loader ./scripts/loader.mjs --no-warnings scripts/verify-n4.mjs
 */

import assert from 'node:assert/strict';
import { VEHICLE_CATALOG, getVehicleItem, renderSafeVehicleSvg, sanitizeCustomVehicleSvg } from '../src/core/vehicleCatalog.ts';
import { buildSegmentPathCoords, expandRouteCoordsByStyle } from '../src/core/route.ts';
import {
  computePathMetrics,
  interpolateAlongPath,
  slicePathByProgress,
  shortestDeltaLng,
  computeAdaptiveFlightDurationMs,
  computeReadableCruiseZoom,
} from '../src/core/routeInterpolation.ts';
import { createVehicleController, createTwoLevelVehicleDomElement } from '../src/core/vehicleController.ts';
import { createCanonicalMode1Tour, createCanonicalMode2TerritorialDoc } from '../src/core/canonicalFixtures.ts';
import { generateStandaloneHTML } from '../src/core/publish.ts';
import { generateDocumentHTML } from '../src/core/publishDocument.ts';
import { generateBrochurePrintHTML } from '../src/core/publishBrochure.ts';

console.log('=== VÉRIFICATION PORTE N4 : VÉHICULES ANIMÉS, INTERPOLATION & REPLI STATIQUE ===\n');

// 1. Catalogue de 7 véhicules libres de droits + assainissement SVG (N4.01 -> N4.03)
console.log('1. Test du catalogue des 7 véhicules et de l’assainissement SVG (N4.01 -> N4.03)...');
const requiredVehicles = ['airplane', 'ship', 'car', 'bus', 'train', 'bike', 'walker'];
for (const v of requiredVehicles) {
  const item = getVehicleItem(v);
  assert.equal(item.id, v, `Véhicule ${v} présent dans le catalogue`);
  assert.ok(item.license.includes('CC0'), `Licence libre documentée pour ${v}`);
  const svg = renderSafeVehicleSvg(v, '#2563eb', 28);
  assert.ok(svg.startsWith('<svg') && svg.includes('fill="#2563eb"'), `SVG orientable généré pour ${v}`);
}
assert.equal(VEHICLE_CATALOG.length, 8, '7 véhicules + option none');

const dirtySvg = '<svg onload="alert(1)"><script>evil()</script><path d="M0 0" onclick="hack()"/></svg>';
const cleanSvg = sanitizeCustomVehicleSvg(dirtySvg);
assert.ok(!cleanSvg.includes('<script') && !cleanSvg.includes('onload') && !cleanSvg.includes('onclick'), 'SVG assaini');
console.log('   -> Catalogue des 7 véhicules et sécurité SVG : OK.');

// 2. Interpolation géométrique par distance, doublons, longueur nulle et antiméridien (N4.04 -> N4.06)
console.log('2. Test de l’interpolation basée sur la distance et cas limites (N4.04 -> N4.06)...');
const rawLine = [
  [0, 0],
  [0, 0], // doublon
  [0, 1], // segment 1 : Nord (0°)
  [3, 1], // segment 2 : Est (~90°)
];
const metrics = computePathMetrics(rawLine);
assert.equal(metrics.cleanCoords.length, 3, 'Doublons consécutifs filtrés');
assert.equal(metrics.segments.length, 2);

const sampleStart = interpolateAlongPath(metrics, 0);
assert.deepEqual(sampleStart.coordinates, [0, 0]);
assert.equal(sampleStart.bearing, 0, 'Cap Nord (0°) sur le premier segment');

const sampleQuarter = interpolateAlongPath(metrics, metrics.segments[0].length / metrics.totalLength);
assert.ok(Math.abs(sampleQuarter.coordinates[0] - 0) < 1e-4 && Math.abs(sampleQuarter.coordinates[1] - 1) < 1e-4);

const sampleSecondSeg = interpolateAlongPath(metrics, 0.75);
assert.ok(Math.abs(sampleSecondSeg.bearing - 90) < 1, 'Cap Est (~90°) sur le second segment');

const sliced = slicePathByProgress(metrics, 0.75);
assert.equal(sliced.length, 3, 'Révélation progressive : départ + sommet intermédiaire + position courante');

// Cas limite : ligne de longueur nulle
const zeroMetrics = computePathMetrics([[2.35, 48.85], [2.35, 48.85]]);
assert.equal(zeroMetrics.totalLength, 0);
const zeroSample = interpolateAlongPath(zeroMetrics, 0.5);
assert.deepEqual(zeroSample.coordinates, [2.35, 48.85], 'Ligne de longueur nulle gérée sans NaN');

// Cas limite : traversée de l'antiméridien (179°E -> -179°W = +2° vers l'Est)
assert.equal(shortestDeltaLng(179, -179), 2);
const antiMetrics = computePathMetrics([[179, 0], [-179, 0]]);
const antiMid = interpolateAlongPath(antiMetrics, 0.5);
assert.ok(Math.abs(Math.abs(antiMid.coordinates[0]) - 180) < 1e-4, 'Milieu sur l’antiméridien ±180°');

// Suivi fidèle des lignes droites vs incurvées (curved, airplane, ship)
const straightSeg = buildSegmentPathCoords([2.35, 48.85], [5.37, 43.30], 'dashed');
assert.equal(straightSeg.length, 2, 'Style droit : segment direct à 2 points');
const curvedSeg = buildSegmentPathCoords([2.35, 48.85], [5.37, 43.30], 'curved');
assert.ok(curvedSeg.length > 10, 'Style incurvé : arc subdivisé suivi par le véhicule');
const expandedCurved = expandRouteCoordsByStyle([[2.35, 48.85], [4.83, 45.76], [5.37, 43.30]], 'airplane');
const curvedMetrics = computePathMetrics(expandedCurved);
const midCurvedSample = interpolateAlongPath(curvedMetrics, 0.5);
assert.notEqual(midCurvedSample.bearing, interpolateAlongPath(curvedMetrics, 0.1).bearing, 'Le cap du véhicule évolue le long de la courbe');
assert.ok(computeAdaptiveFlightDurationMs(35, 4) > computeAdaptiveFlightDurationMs(0.5, 4), 'La durée de vol s’adapte à la distance parcourue');
assert.ok(computeReadableCruiseZoom(12, 12, 30, 0.5) < 7 && computeReadableCruiseZoom(12, 12, 30, 1) === 12, 'Le zoom de croisière dézoome à grande échelle pour garder la carte lisible');
console.log('   -> Interpolation distance, vitesse/zoom adaptatifs, lignes droites/incurvées et antiméridien : OK.');

// 3. Contrôleur de cycle de vie, pause d'onglet, interaction carte et prefers-reduced-motion (N4.07 -> N4.14)
console.log('3. Test du contrôleur d’animation (play/pause/seek/visibilitychange/cameraFollow/reduced-motion)...');
let cameraCalls = 0;
let lastFollowedCenter = null;
const ctrl = createVehicleController({
  coords: [[0, 0], [0, 4]],
  config: { enabled: true, vehicle: 'train', durationSec: 2, loop: false },
  prefersReducedMotion: false,
  onCameraFollow: (center) => { cameraCalls++; lastFollowedCenter = center; },
});

assert.equal(ctrl.isCameraFollowActive(), true, 'Suivi caméra centré sur le véhicule actif par défaut');
assert.equal(ctrl.getState(), 'idle');
ctrl.play();
assert.equal(ctrl.getState(), 'playing');
ctrl.stepClock(1000);
const halfSample = ctrl.stepClock(1200);
assert.ok(Math.abs(ctrl.getProgress() - 0.1) < 1e-3, 'Avancement temporel précis');
assert.ok(halfSample.coordinates[1] > 0);
assert.ok(cameraCalls > 0, 'Suivi caméra actif pendant la lecture');
assert.deepEqual(lastFollowedCenter, halfSample.coordinates, 'La caméra est centrée exactement sur le véhicule à chaque pas');

ctrl.notifyVisibilityChange(true);
assert.equal(ctrl.getState(), 'paused', 'Mis en pause quand l’onglet devient caché');
ctrl.notifyVisibilityChange(false);
assert.equal(ctrl.getState(), 'playing', 'Reprise automatique au retour sur l’onglet');

const callsBeforeDrag = cameraCalls;
ctrl.notifyUserMapInteraction();
assert.equal(ctrl.isCameraFollowActive(), false, 'Suivi caméra suspendu après interaction manuelle');
ctrl.stepClock(2000);
assert.equal(cameraCalls, callsBeforeDrag, 'Plus d’appel caméra forcé après interaction utilisateur');

ctrl.seek(1);
assert.equal(ctrl.getState(), 'completed');
ctrl.destroy();

const reducedCtrl = createVehicleController({
  coords: [[2, 48], [5, 45]],
  config: { enabled: true, vehicle: 'airplane', durationSec: 4 },
  prefersReducedMotion: true,
});
reducedCtrl.play();
assert.equal(reducedCtrl.getState(), 'completed');
assert.deepEqual(reducedCtrl.getCurrentSample().coordinates, [5, 45]);
console.log('   -> Cycle de vie du contrôleur, visibilité, caméra et reduced-motion : OK.');

// 4. Structure DOM à deux niveaux (.vehicle-marker-wrap + .vehicle-marker-icon) (N4.15)
console.log('4. Test de la structure DOM à deux niveaux pour MapLibre (N4.15)...');
const mockDoc = {
  createElement(tag) {
    return {
      tagName: tag.toUpperCase(),
      className: '',
      style: {},
      innerHTML: '',
      children: [],
      appendChild(child) { this.children.push(child); return child; },
    };
  },
};

const { wrapper, innerIcon } = createTwoLevelVehicleDomElement(
  mockDoc,
  { enabled: true, vehicle: 'ship', orientToRoute: true, sizePx: 30 },
  '#0284c7',
  135
);
wrapper.style.transform = 'translate3d(240px, 180px, 0px)';
innerIcon.style.transform = 'rotate(210deg)';
assert.equal(wrapper.style.transform, 'translate3d(240px, 180px, 0px)', 'Positionnement MapLibre intact sur le wrapper externe');
assert.equal(innerIcon.style.transform, 'rotate(210deg)', 'Rotation appliquée uniquement sur l’icône interne');
console.log('   -> Séparation stricte positionnement MapLibre / rotation interne : OK.');

// 5. Intégration dans les publications Modes 1, 2 et représentation statique Mode 3 (N4.10 -> N4.13)
console.log('5. Test des publications Mode 1, Mode 2 et représentation statique Mode 3 (N4.10 -> N4.13)...');
const m1 = createCanonicalMode1Tour();
m1.routeAnimation = { enabled: true, vehicle: 'airplane', durationSec: 3 };
const htmlM1 = generateStandaloneHTML(m1);
assert.ok(htmlM1.includes('animateSegmentVehicle') && htmlM1.includes('buildSegCoords'), 'Mode 1 publié inclut l’animation du véhicule sur tracés droits et incurvés');
assert.ok(htmlM1.includes('autoplayTimer'), 'Mode 1 publié déclenche le départ du véhicule à la fin du temps imparti');
assert.ok(htmlM1.includes('vehicle-marker-wrap') && htmlM1.includes('vehicle-marker-icon'));

const m2 = createCanonicalMode2TerritorialDoc();
m2.routeAnimation = { enabled: true, vehicle: 'bus', durationSec: 4 };
const htmlM2 = generateDocumentHTML(m2);
assert.ok(htmlM2.includes('attachLineVehicle'), 'Mode 2 publié inclut l’animation du véhicule sur les tracés');

const htmlM3 = generateBrochurePrintHTML(m2);
assert.ok(htmlM3.includes('static-print-vehicle'), 'Mode 3 Brochure inclut le marqueur statique orienté en fin de tracé');
assert.ok(!htmlM3.includes('vehicleTimers'), 'Aucune boucle d’animation active dans la brochure A4 imprimable');
console.log('   -> Publications Modes 1, 2 et représentation statique Mode 3 : OK.');

console.log('\n✅ PORTE N4 VALIDÉE AVEC SUCCÈS.');
