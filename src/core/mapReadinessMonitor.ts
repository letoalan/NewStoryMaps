/**
 * StoryMap — Surveillance de chargement des tuiles et pauses techniques (zoom.md Section 10, Z08)
 */

export type MapReadinessStatus = 'ready' | 'loading' | 'stalled' | 'error';

export interface MapReadinessOptions {
  stallThresholdMs?: number;
  recoveryDelayMs?: number;
  timeoutMs?: number;
  onStatusChange?: (status: MapReadinessStatus, detail?: string) => void;
}

export interface MapReadinessMonitor {
  getStatus: () => MapReadinessStatus;
  notifyFrameStart: (nowMs: number) => void;
  notifySourceData: (isLoaded: boolean, hasError?: boolean, nowMs?: number) => void;
  notifyTilesLoaded: (nowMs: number) => void;
  notifyMapIdle: () => void;
  isFlightAllowed: () => boolean;
  reset: () => void;
  destroy: () => void;
}

export function createMapReadinessMonitor(options: MapReadinessOptions = {}): MapReadinessMonitor {
  const stallThresholdMs = options.stallThresholdMs ?? 1800;
  const recoveryDelayMs = options.recoveryDelayMs ?? 400;
  const timeoutMs = options.timeoutMs ?? 8000;

  let status: MapReadinessStatus = 'ready';
  let loadingSinceMs: number | null = null;
  let lastRecoveredMs: number | null = null;
  let currentClockMs = 0;
  let pendingTilesCount = 0;

  const setStatus = (next: MapReadinessStatus, detail?: string) => {
    if (status !== next) {
      status = next;
      options.onStatusChange?.(next, detail);
    }
  };

  const notifyFrameStart = (nowMs: number) => {
    currentClockMs = nowMs;
    if (status === 'error') return;
    if (pendingTilesCount > 0) {
      if (loadingSinceMs === null) loadingSinceMs = nowMs;
      const elapsed = nowMs - loadingSinceMs;
      if (elapsed >= timeoutMs) {
        setStatus('error', `Délai maximal dépassé (${Math.round(timeoutMs / 1000)}s) sans chargement des tuiles.`);
      } else if (elapsed >= stallThresholdMs) {
        setStatus('stalled', 'Pause technique : chargement du fond cartographique en cours...');
      }
    } else if (status === 'stalled' && lastRecoveredMs !== null) {
      if (nowMs - lastRecoveredMs >= recoveryDelayMs) {
        setStatus('ready', 'Fond cartographique prêt.');
        loadingSinceMs = null;
        lastRecoveredMs = null;
      }
    }
  };

  const notifySourceData = (isLoaded: boolean, hasError = false, nowMs?: number) => {
    if (hasError) {
      setStatus('error', 'Erreur de chargement d’une source cartographique.');
      return;
    }
    if (!isLoaded) {
      pendingTilesCount++;
      if (loadingSinceMs === null) {
        loadingSinceMs = typeof nowMs === 'number' ? nowMs : currentClockMs;
      }
      if (status === 'ready') setStatus('loading');
    } else {
      pendingTilesCount = Math.max(0, pendingTilesCount - 1);
      if (pendingTilesCount === 0) {
        lastRecoveredMs = typeof nowMs === 'number' ? nowMs : currentClockMs;
        if (status === 'loading') setStatus('ready');
      }
    }
  };

  const notifyTilesLoaded = (nowMs: number) => {
    pendingTilesCount = 0;
    lastRecoveredMs = nowMs;
    loadingSinceMs = null;
    if (status !== 'error') setStatus('ready');
  };

  const notifyMapIdle = () => {
    pendingTilesCount = 0;
    loadingSinceMs = null;
    if (status !== 'error') setStatus('ready');
  };

  const isFlightAllowed = (): boolean => status === 'ready' || status === 'loading';

  const reset = () => {
    status = 'ready';
    loadingSinceMs = null;
    lastRecoveredMs = null;
    pendingTilesCount = 0;
  };

  const destroy = () => {
    reset();
  };

  return {
    getStatus: () => status,
    notifyFrameStart,
    notifySourceData,
    notifyTilesLoaded,
    notifyMapIdle,
    isFlightAllowed,
    reset,
    destroy,
  };
}

