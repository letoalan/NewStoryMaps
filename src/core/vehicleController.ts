/**
 * StoryMap — Contrôleur d'animation de véhicule réutilisable (N4.07 à N4.15)
 */

import type { RouteAnimationConfig } from '../types/theme';
import { type PathMetrics, type PathSamplePoint, computePathMetrics, interpolateAlongPath } from './routeInterpolation';
import { renderSafeVehicleSvg } from './vehicleCatalog';

export type VehiclePlaybackState = 'idle' | 'playing' | 'paused' | 'completed';

export interface VehicleControllerOptions {
  coords: Array<[number, number]>;
  config: RouteAnimationConfig;
  prefersReducedMotion?: boolean;
  isStaticPrint?: boolean;
  onSample?: (sample: PathSamplePoint, state: VehiclePlaybackState) => void;
  onCameraFollow?: (center: [number, number], bearing: number) => void;
}

export interface VehicleController {
  getState: () => VehiclePlaybackState;
  getProgress: () => number;
  getCurrentSample: () => PathSamplePoint;
  isCameraFollowActive: () => boolean;
  play: () => void;
  pause: () => void;
  replay: () => void;
  seek: (progress: number) => PathSamplePoint;
  stop: () => void;
  notifyUserMapInteraction: () => void;
  notifyVisibilityChange: (hidden: boolean) => void;
  stepClock: (nowMs: number) => PathSamplePoint;
  destroy: () => void;
}

export function createVehicleController(options: VehicleControllerOptions): VehicleController {
  const metrics: PathMetrics = computePathMetrics(options.coords);
  const durationMs = Math.max(200, (options.config.durationSec || 4) * 1000);
  const staticOnly = Boolean(options.prefersReducedMotion || options.isStaticPrint);

  let state: VehiclePlaybackState = 'idle';
  let progress = staticOnly ? 1 : 0;
  let lastTickMs: number | null = null;
  let rafId: number | null = null;
  let wasPlayingBeforeHide = false;
  let cameraFollowSuspended = false;

  const emitSample = (): PathSamplePoint => {
    const sample = interpolateAlongPath(metrics, progress);
    options.onSample?.(sample, state);
    if (state === 'playing' && options.config.cameraFollow && !cameraFollowSuspended && !staticOnly) {
      options.onCameraFollow?.(sample.coordinates, sample.bearing);
    }
    return sample;
  };

  const cancelRaf = () => {
    if (rafId !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
    rafId = null;
  };

  const stepClock = (nowMs: number): PathSamplePoint => {
    if (state !== 'playing') return interpolateAlongPath(metrics, progress);
    if (staticOnly || metrics.totalLength <= 0) {
      progress = 1; state = 'completed'; cancelRaf();
      return emitSample();
    }
    if (lastTickMs === null) {
      lastTickMs = nowMs;
      return emitSample();
    }
    const elapsed = Math.max(0, Math.min(250, nowMs - lastTickMs));
    lastTickMs = nowMs;
    progress += elapsed / durationMs;

    if (progress >= 1) {
      if (options.config.loop) progress = progress % 1;
      else { progress = 1; state = 'completed'; cancelRaf(); }
    }
    return emitSample();
  };

  const scheduleLoop = () => {
    cancelRaf();
    if (typeof requestAnimationFrame !== 'function' || state !== 'playing') return;
    const tick = (ts: number) => {
      if (state !== 'playing') return;
      stepClock(ts);
      if (state === 'playing') rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  };

  const play = () => {
    if (!options.config.enabled || options.config.vehicle === 'none') return;
    if (staticOnly || metrics.totalLength <= 0) {
      progress = 1; state = 'completed'; emitSample();
      return;
    }
    if (progress >= 1) progress = 0;
    state = 'playing'; lastTickMs = null; emitSample(); scheduleLoop();
  };

  const pause = () => {
    if (state === 'playing') { state = 'paused'; lastTickMs = null; cancelRaf(); emitSample(); }
  };

  const seek = (targetProgress: number): PathSamplePoint => {
    progress = Math.max(0, Math.min(1, Number.isFinite(targetProgress) ? targetProgress : 0));
    lastTickMs = null;
    if (progress >= 1 && !options.config.loop && state === 'playing') { state = 'completed'; cancelRaf(); }
    return emitSample();
  };

  const replay = () => { cameraFollowSuspended = false; progress = 0; lastTickMs = null; play(); };
  const stop = () => { cancelRaf(); state = 'idle'; progress = 0; lastTickMs = null; emitSample(); };
  const notifyUserMapInteraction = () => { cameraFollowSuspended = true; };

  const notifyVisibilityChange = (hidden: boolean) => {
    if (hidden) {
      if (state === 'playing') { wasPlayingBeforeHide = true; pause(); }
    } else if (wasPlayingBeforeHide) {
      wasPlayingBeforeHide = false; lastTickMs = null; play();
    }
  };

  const destroy = () => { cancelRaf(); state = 'idle'; lastTickMs = null; };

  return {
    getState: () => state,
    getProgress: () => progress,
    getCurrentSample: () => interpolateAlongPath(metrics, progress),
    isCameraFollowActive: () => Boolean(options.config.cameraFollow && !cameraFollowSuspended && !staticOnly),
    play, pause, replay, seek, stop, notifyUserMapInteraction, notifyVisibilityChange, stepClock, destroy,
  };
}

/** Construit un marqueur DOM à deux niveaux (.vehicle-marker-wrap + .vehicle-marker-icon) pour MapLibre (N4.15) */
export function createTwoLevelVehicleDomElement(
  doc: Document,
  config: RouteAnimationConfig,
  accentColor = '#d97706',
  initialBearing = 0
): { wrapper: HTMLElement; innerIcon: HTMLElement } {
  const wrapper = doc.createElement('div');
  wrapper.className = 'vehicle-marker-wrap';
  wrapper.style.width = `${config.sizePx || 28}px`;
  wrapper.style.height = `${config.sizePx || 28}px`;
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.pointerEvents = 'none';

  const innerIcon = doc.createElement('div');
  innerIcon.className = 'vehicle-marker-icon';
  innerIcon.style.width = '100%';
  innerIcon.style.height = '100%';
  innerIcon.style.display = 'flex';
  innerIcon.style.alignItems = 'center';
  innerIcon.style.justifyContent = 'center';
  innerIcon.style.transformOrigin = 'center center';
  innerIcon.style.transform = `rotate(${config.orientToRoute !== false ? initialBearing : 0}deg)`;
  innerIcon.innerHTML = renderSafeVehicleSvg(config.vehicle, accentColor, config.sizePx || 28);

  wrapper.appendChild(innerIcon);
  return { wrapper, innerIcon };
}
