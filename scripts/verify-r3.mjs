import assert from 'node:assert';
import { createTravelCoordinator } from '../src/core/travelCoordinator.ts';
import { createMapReadinessMonitor } from '../src/core/mapReadinessMonitor.ts';

console.log('--- Test R3.1 / R3.2 / R3.3 : Zoom, cadrage final et MapReadinessMonitor ---');

// Mock FlightPlan
const mockPlan = {
  estimatedDurationMs: 1000,
  sampleAtProgress(p) {
    return {
      coordinates: [2.35 + p * 0.1, 48.85 + p * 0.1],
      zoom: 10 + p * 2,
      bearing: p * 45,
      pitch: p * 30,
      altitudeMeters: 100,
      roll: 0,
      fov: 60,
      cameraPosition: [2.35 + p * 0.1, 48.85 + p * 0.1, 100],
    };
  },
};

// 1. R3.2 : Test final camera framing emission at progress = 1
{
  let lastCameraUpdate = null;
  const coordinator = createTravelCoordinator({
    flightPlan: mockPlan,
    onCameraUpdate: (coords, zoom, bearing, pitch) => {
      lastCameraUpdate = { coords, zoom, bearing, pitch };
    },
  });

  coordinator.play();
  // Step through clock until completed (delta clamped at 200ms max per frame)
  for (let t = 0; t <= 1200; t += 100) {
    coordinator.stepClock(t);
  }

  assert.strictEqual(coordinator.getState(), 'completed', 'State should be completed at 1000ms');
  assert.strictEqual(coordinator.getProgress(), 1, 'Progress should be 1');
  assert.ok(lastCameraUpdate, 'onCameraUpdate should have been called on completion');
  assert.strictEqual(Math.round(lastCameraUpdate.zoom), 12, 'Final zoom should be 12');
  assert.strictEqual(Math.round(lastCameraUpdate.bearing), 45, 'Final bearing should be 45');
  console.log('✅ R3.2 : Cadrage final émis à progress = 1');
  coordinator.destroy();
}

// 2. R3.2 : Test resumeFollow restarts RAF when in free-exploration
{
  let rafCallback = null;
  globalThis.requestAnimationFrame = (cb) => {
    rafCallback = cb;
    return 123;
  };
  globalThis.cancelAnimationFrame = () => {
    rafCallback = null;
  };

  const coordinator = createTravelCoordinator({ flightPlan: mockPlan });
  coordinator.play();
  assert.strictEqual(coordinator.getState(), 'playing');

  // User interacts with map -> free-exploration
  coordinator.notifyUserInteraction();
  assert.strictEqual(coordinator.getState(), 'free-exploration');
  assert.strictEqual(coordinator.isCameraLocked(), false);

  // Resume follow
  coordinator.resumeFollow();
  assert.strictEqual(coordinator.getState(), 'playing');
  assert.strictEqual(coordinator.isCameraLocked(), true);
  assert.ok(rafCallback, 'RAF callback must be scheduled upon resumeFollow');

  coordinator.destroy();
  console.log('✅ R3.2 : resumeFollow relance la boucle RAF');
}

// 3. R3.3 : Test MapReadinessMonitor monotonic recovery
{
  const statusHistory = [];
  const monitor = createMapReadinessMonitor({
    stallThresholdMs: 1000,
    recoveryDelayMs: 300,
    timeoutMs: 5000,
    onStatusChange: (s) => statusHistory.push(s),
  });

  // Step 1: Tiles start loading at t=0
  monitor.notifyFrameStart(0);
  monitor.notifySourceData(false); // 1 pending tile
  assert.strictEqual(monitor.getStatus(), 'loading');

  // Step 2: Stall threshold reached at t=1200
  monitor.notifyFrameStart(1200);
  assert.strictEqual(monitor.getStatus(), 'stalled');

  // Step 3: Tiles finish loading at t=1300
  monitor.notifySourceData(true, false, 1300);

  // Step 4: Before recovery delay (t=1500, elapsed 200 < 300)
  monitor.notifyFrameStart(1500);
  assert.strictEqual(monitor.getStatus(), 'stalled', 'Should remain stalled before recovery delay');

  // Step 5: After recovery delay (t=1650, elapsed 350 >= 300)
  monitor.notifyFrameStart(1650);
  assert.strictEqual(monitor.getStatus(), 'ready', 'Should recover to ready after recovery delay');

  console.log('✅ R3.3 : MapReadinessMonitor utilise une horloge monotone et récupère après le délai prévu');
  monitor.destroy();
}

console.log('Tous les tests de la Porte R3 sont validés avec succès !');
