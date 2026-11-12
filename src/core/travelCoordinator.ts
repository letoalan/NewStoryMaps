/**
 * StoryMap — Coordinateur unique de vol centré, centrage strict et cycle de vie (zoom.md Z07-Z10)
 */

import { type FlightPlan, type FlightPlanSample } from './flightPlanner';
import { type MapReadinessMonitor, createMapReadinessMonitor } from './mapReadinessMonitor';

export type TravelCoordinatorState = 'idle' | 'preparing' | 'playing' | 'user-paused' | 'technical-pause' | 'free-exploration' | 'completed' | 'error';

export interface TravelCoordinatorOptions {
  flightPlan: FlightPlan;
  prefersReducedMotion?: boolean;
  isStaticPrint?: boolean;
  onSample?: (sample: FlightPlanSample, state: TravelCoordinatorState) => void;
  onCameraUpdate?: (center: [number, number], zoom: number, bearing: number, pitch: number) => void;
  onStateChange?: (state: TravelCoordinatorState, detail?: string) => void;
  readinessMonitor?: MapReadinessMonitor;
}

export interface TravelCoordinator {
  getState: () => TravelCoordinatorState;
  getProgress: () => number;
  getCurrentSample: () => FlightPlanSample;
  isCameraLocked: () => boolean;
  play: () => void;
  pause: () => void;
  replay: () => void;
  seek: (progress: number) => FlightPlanSample;
  stop: () => void;
  resumeFollow: () => void;
  notifyUserInteraction: () => void;
  notifyVisibilityChange: (hidden: boolean) => void;
  stepClock: (nowMs: number) => FlightPlanSample;
  destroy: () => void;
}

export function createTravelCoordinator(options: TravelCoordinatorOptions): TravelCoordinator {
  const plan = options.flightPlan;
  const staticOnly = Boolean(options.prefersReducedMotion || options.isStaticPrint);
  const monitor = options.readinessMonitor || createMapReadinessMonitor();

  let state: TravelCoordinatorState = 'idle', progress = staticOnly ? 1 : 0;
  let elapsedActiveTimeMs = 0, lastFrameTimeMs: number | null = null, rafId: number | null = null;
  let cameraLocked = !staticOnly, resumeAfterVisibility = false;

  const setState = (next: TravelCoordinatorState, detail?: string) => {
    if (state !== next) { state = next; options.onStateChange?.(next, detail); }
  };

  const emitSample = (): FlightPlanSample => {
    const sample = plan.sampleAtProgress(progress);
    options.onSample?.(sample, state);
    if (cameraLocked && !staticOnly && (state === 'playing' || state === 'technical-pause' || state === 'completed')) {
      options.onCameraUpdate?.(sample.coordinates, sample.zoom, sample.bearing, sample.pitch);
    }
    return sample;
  };

  const cancelLoop = () => {
    if (rafId !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
    rafId = null;
  };

  const stepClock = (nowMs: number): FlightPlanSample => {
    if (state !== 'playing' && state !== 'technical-pause') return plan.sampleAtProgress(progress);
    monitor.notifyFrameStart(nowMs);
    if (!monitor.isFlightAllowed()) {
      if (state === 'playing') setState('technical-pause', 'Attente des tuiles cartographiques');
      lastFrameTimeMs = nowMs;
      return emitSample();
    }
    if (state === 'technical-pause') setState('playing');
    if (lastFrameTimeMs === null) { lastFrameTimeMs = nowMs; return emitSample(); }

    const delta = Math.max(0, Math.min(200, nowMs - lastFrameTimeMs));
    lastFrameTimeMs = nowMs;
    elapsedActiveTimeMs += delta;
    progress = Math.min(1, elapsedActiveTimeMs / Math.max(100, plan.estimatedDurationMs));

    if (progress >= 1) { progress = 1; setState('completed'); cancelLoop(); }
    return emitSample();
  };

  const scheduleTick = () => {
    cancelLoop();
    if (typeof requestAnimationFrame !== 'function') return;
    const loop = (ts: number) => {
      if (state !== 'playing' && state !== 'technical-pause') return;
      stepClock(ts);
      if (state === 'playing' || state === 'technical-pause') rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  };

  const play = () => {
    if (staticOnly) { progress = 1; setState('completed'); emitSample(); return; }
    if (progress >= 1) { progress = 0; elapsedActiveTimeMs = 0; }
    cameraLocked = true; lastFrameTimeMs = null; setState('playing'); emitSample(); scheduleTick();
  };

  const pause = () => {
    if (state === 'playing' || state === 'technical-pause') { setState('user-paused'); lastFrameTimeMs = null; cancelLoop(); emitSample(); }
  };

  const replay = () => { cameraLocked = true; progress = 0; elapsedActiveTimeMs = 0; lastFrameTimeMs = null; play(); };

  const seek = (targetProgress: number): FlightPlanSample => {
    progress = Math.max(0, Math.min(1, Number.isFinite(targetProgress) ? targetProgress : 0));
    elapsedActiveTimeMs = progress * plan.estimatedDurationMs;
    lastFrameTimeMs = null;
    if (progress >= 1 && state === 'playing') { setState('completed'); cancelLoop(); }
    return emitSample();
  };

  const stop = () => { cancelLoop(); setState('idle'); progress = 0; elapsedActiveTimeMs = 0; lastFrameTimeMs = null; emitSample(); };

  const notifyUserInteraction = () => {
    if (cameraLocked) { cameraLocked = false; if (state === 'playing') setState('free-exploration', 'Contrôle manuel de la caméra'); }
  };

  const resumeFollow = () => {
    cameraLocked = true;
    if (state === 'free-exploration') {
      setState('playing');
      lastFrameTimeMs = null;
      emitSample();
      scheduleTick();
      return;
    }
    emitSample();
  };

  const notifyVisibilityChange = (hidden: boolean) => {
    if (hidden) {
      if (state === 'playing' || state === 'technical-pause') { resumeAfterVisibility = true; pause(); }
    } else if (resumeAfterVisibility) {
      resumeAfterVisibility = false; play();
    }
  };

  const destroy = () => { cancelLoop(); setState('idle'); lastFrameTimeMs = null; };

  return {
    getState: () => state, getProgress: () => progress, getCurrentSample: () => plan.sampleAtProgress(progress),
    isCameraLocked: () => cameraLocked, play, pause, replay, seek, stop, resumeFollow, notifyUserInteraction,
    notifyVisibilityChange, stepClock, destroy,
  };
}
