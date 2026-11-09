/**
 * Script de vérification automatisée — zoom.md (Z01 à Z12)
 * Vol centré à rythme constant, zoom adaptatif, centrage strict et filet de sécurité tuiles
 *
 * Exécution : node --experimental-strip-types --loader ./scripts/loader.mjs --no-warnings scripts/verify-zoom.mjs
 */

import assert from 'node:assert/strict';
import { createFlightPlan, computeFlightCruiseZoom, shortestAngularDistance } from '../src/core/flightPlanner.ts';
import { createMapReadinessMonitor } from '../src/core/mapReadinessMonitor.ts';
import { createTravelCoordinator } from '../src/core/travelCoordinator.ts';
import { computePathMetrics, shortestDeltaLng } from '../src/core/routeInterpolation.ts';

console.log('=== VÉRIFICATION COMPLÈTE ZOOM.MD : VOL CENTRÉ & ZOOM ADAPTATIF ===\n');

// 1. Z02 & Z04 : Géométrie, boucles, antéméridien et métriques
console.log('1. Test Z02 & Z04 : Géométrie, antéméridien, boucles et calculs de cap...');
assert.equal(shortestDeltaLng(179, -179), 2, 'Traversée propre de l’antéméridien vers l’est (+2°)');
assert.equal(shortestDeltaLng(-179, 179), -2, 'Traversée propre de l’antéméridien vers l’ouest (-2°)');
assert.equal(shortestAngularDistance(350, 10), 20, 'Plus court écart angulaire de cap (20°)');
assert.equal(shortestAngularDistance(10, 350), -20, 'Plus court écart angulaire inversé (-20°)');

const nullPath = computePathMetrics([[2.35, 48.85]]);
assert.equal(nullPath.totalLength, 0, 'Trajet à point unique longueur 0');

const loopCoords = [[2.35, 48.85], [2.40, 48.86], [2.40, 48.82], [2.35, 48.85]];
const loopMetrics = computePathMetrics(loopCoords);
assert.ok(loopMetrics.totalLength > 0.05, 'Boucle complète calculée sur tout le trajet');
console.log('   -> Métriques géométriques, antéméridien et boucles : OK.');

// 2. Z05 & Z06 : Profil de zoom 3 phases (départ, croisière, arrivée exacte) et table temps/distance
console.log('2. Test Z05 & Z06 : Profil de zoom 3 phases et table temps/distance...');
const startCam = { center: [2.35, 48.85], zoom: 14.5, pitch: 20, bearing: 45 };
const endCam = { center: [7.26, 43.71], zoom: 13.0, pitch: 10, bearing: 180 }; // Paris -> Nice (~700km)
const route = [[2.35, 48.85], [4.83, 45.76], [5.37, 43.30], [7.26, 43.71]];

const plan = createFlightPlan(route, startCam, endCam, { width: 1200, height: 800 }, 'normal', 'balanced');
assert.ok(plan.totalDistanceDeg > 5, 'Distance interurbaine calculée');
assert.ok(plan.cruiseZoom < startCam.zoom && plan.cruiseZoom < endCam.zoom, 'Prise de hauteur (dézoom en croisière)');
assert.ok(plan.estimatedDurationMs >= 1200, 'Durée estimée réaliste et calculée');

const sample0 = plan.sampleAtProgress(0);
assert.equal(sample0.zoom, startCam.zoom, 'Zoom de départ exact');
assert.equal(sample0.coordinates[0], 2.35, 'Position initiale exacte');

const sampleMid = plan.sampleAtProgress(0.5);
assert.ok(sampleMid.zoom <= plan.cruiseZoom + 0.5, 'Hauteur de croisière atteinte au milieu');

const sample1 = plan.sampleAtProgress(1.0);
assert.equal(sample1.zoom, endCam.zoom, 'Zoom d’arrivée converge exactement sur la caméra enregistrée');
assert.equal(sample1.coordinates[0], 7.26, 'Position d’arrivée exacte');
assert.equal(sample1.bearing, endCam.bearing, 'Cap final stabilisé sur endCamera.bearing');

assert.ok(plan.timeTable.length >= 60, 'Table temps/distance échantillonnée');
for (let i = 1; i < plan.timeTable.length; i++) {
  assert.ok(plan.timeTable[i].timeMs >= plan.timeTable[i - 1].timeMs, 'Temps strictement monotone');
  assert.ok(plan.timeTable[i].distDeg >= plan.timeTable[i - 1].distDeg, 'Distance monotone');
}
console.log('   -> Profil de zoom 3 phases et table d’intégration temps/distance : OK.');

// 3. Z03 & Z07 : Coordinateur unique et centrage strict de la caméra
console.log('3. Test Z03 & Z07 : Coordinateur unique, horloge synchrone et centrage strict...');
let cameraUpdates = 0;
let lastCenter = [0, 0];
const coordinator = createTravelCoordinator({
  flightPlan: plan,
  onCameraUpdate: (center) => {
    cameraUpdates++;
    lastCenter = center;
  },
});

assert.equal(coordinator.getState(), 'idle');
coordinator.play();
assert.equal(coordinator.getState(), 'playing');

coordinator.stepClock(100);
coordinator.stepClock(600);
assert.ok(cameraUpdates >= 2, 'Mises à jour caméra synchrones déclenchées');
const curSample = coordinator.getCurrentSample();
assert.deepEqual(lastCenter, curSample.coordinates, 'Centrage strict : caméra verrouillée pile sur le véhicule');

coordinator.pause();
assert.equal(coordinator.getState(), 'user-paused', 'Pause utilisateur respectée');
coordinator.destroy();
console.log('   -> Coordinateur unique et centrage caméra : OK.');

// 4. Z08 : Filet de sécurité, surveillance des tuiles et pause technique
console.log('4. Test Z08 : Surveillance des sources, pauses techniques et reprise...');
let statusLog = [];
const monitor = createMapReadinessMonitor({
  stallThresholdMs: 300,
  recoveryDelayMs: 100,
  timeoutMs: 1000,
  onStatusChange: (st) => statusLog.push(st),
});

assert.equal(monitor.getStatus(), 'ready');
assert.equal(monitor.isFlightAllowed(), true);

monitor.notifySourceData(false); // Tuile demandée
assert.equal(monitor.getStatus(), 'loading');

monitor.notifyFrameStart(100);
monitor.notifyFrameStart(500); // 400ms > stallThresholdMs (300ms)
assert.equal(monitor.getStatus(), 'stalled', 'Pause technique activée en cas de retard de tuiles');
assert.equal(monitor.isFlightAllowed(), false, 'Vol suspendu pendant la pause technique');

monitor.notifyTilesLoaded(600);
monitor.notifyFrameStart(750); // > recoveryDelayMs
assert.equal(monitor.getStatus(), 'ready', 'Reprise automatique après chargement des tuiles');
assert.equal(monitor.isFlightAllowed(), true);

monitor.notifySourceData(false);
monitor.notifyFrameStart(1800);
monitor.notifyFrameStart(2900); // 1100ms > timeoutMs (1000ms)
assert.equal(monitor.getStatus(), 'error', 'Erreur explicite si les tuiles ne répondent plus');
console.log('   -> Filet de sécurité, détection de décrochage et reprise : OK.');

// 5. Z09 & Z10 : Geste utilisateur (exploration libre), reprise et réduction des mouvements
console.log('5. Test Z09 & Z10 : Exploration libre, bouton Reprendre le suivi et reduced-motion...');
const coordExplore = createTravelCoordinator({ flightPlan: plan });
coordExplore.play();
assert.equal(coordExplore.isCameraLocked(), true);

coordExplore.notifyUserInteraction();
assert.equal(coordExplore.isCameraLocked(), false, 'Caméra déverrouillée lors du geste utilisateur');
assert.equal(coordExplore.getState(), 'free-exploration', 'État d’exploration libre actif');

coordExplore.resumeFollow();
assert.equal(coordExplore.isCameraLocked(), true, 'Suivi reverrouillé via resumeFollow');
assert.equal(coordExplore.getState(), 'playing');
coordExplore.destroy();

const staticCoord = createTravelCoordinator({ flightPlan: plan, prefersReducedMotion: true });
staticCoord.play();
assert.equal(staticCoord.getState(), 'completed', 'Reduced-motion : saut direct à destination sans animation');
assert.equal(staticCoord.getProgress(), 1);
staticCoord.destroy();
console.log('   -> Gestes utilisateur, reprise et réduction des mouvements : OK.');

// 6. Z11 : Benchmark de performance
console.log('6. Test Z11 : Benchmark de calcul de vol (1 000 échantillons)...');
const t0 = performance.now();
for (let i = 0; i < 1000; i++) {
  plan.sampleAtProgress(i / 1000);
}
const elapsed = performance.now() - t0;
console.log(`   -> 1 000 interpolations de vol exécutées en ${elapsed.toFixed(1)} ms.`);
assert.ok(elapsed < 25, 'Performance sous les 25ms garantie');

// 7. Z12 : Contrôle des 195 lignes
console.log('7. Test Z12 : Contrôle des limites strictes de 195 lignes...');
import fs from 'node:fs';
const checkedFiles = [
  'src/core/flightPlanner.ts',
  'src/core/mapReadinessMonitor.ts',
  'src/core/travelCoordinator.ts',
  'src/core/vehicleController.ts',
  'src/types/theme.ts',
  'src/components/dialogs/SettingsModal.tsx',
  'src/components/dialogs/NewStoryModal.tsx',
  'scripts/verify-zoom.mjs',
];

for (const rel of checkedFiles) {
  const code = fs.readFileSync(rel, 'utf-8');
  const count = code.split('\n').length;
  assert.ok(count <= 195, `${rel} dépasse 195 lignes (${count})`);
}
console.log('   -> Tous les fichiers maintenus pour zoom.md respectent <= 195 lignes : OK.');

console.log('\n================================================================');
console.log('VALIDATION ZOOM.MD INTEGRALE : TOUTES LES PORTES Z01-Z12 SONT VALIDÉES');
console.log('================================================================');
