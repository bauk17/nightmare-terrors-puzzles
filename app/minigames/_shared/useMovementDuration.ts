import { useSyncExternalStore } from 'react';
import { PLAYER_STEP_DURATION_MS } from './gameUtils';

export const MIN_PLAYER_STEP_DURATION_MS = 75;
export const MAX_PLAYER_STEP_DURATION_MS = 300;
export const PLAYER_STEP_DURATION_INCREMENT_MS = 25;
const STORAGE_KEY_PREFIX = 'nightmare-terror-puzzles:movement-duration:';
const subscribers = new Map<string, Set<() => void>>();

function normalizeDuration(durationMs: number) {
  const clampedDuration = Math.min(
    MAX_PLAYER_STEP_DURATION_MS,
    Math.max(MIN_PLAYER_STEP_DURATION_MS, durationMs),
  );
  const increments = Math.round(
    (clampedDuration - MIN_PLAYER_STEP_DURATION_MS) / PLAYER_STEP_DURATION_INCREMENT_MS,
  );

  return MIN_PLAYER_STEP_DURATION_MS + increments * PLAYER_STEP_DURATION_INCREMENT_MS;
}

function getDurationSnapshot(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) ?? String(PLAYER_STEP_DURATION_MS);
  } catch {
    return String(PLAYER_STEP_DURATION_MS);
  }
}

function subscribeToDuration(storageKey: string, subscriber: () => void) {
  const keySubscribers = subscribers.get(storageKey) ?? new Set<() => void>();
  keySubscribers.add(subscriber);
  subscribers.set(storageKey, keySubscribers);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) subscriber();
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    keySubscribers.delete(subscriber);
    window.removeEventListener('storage', handleStorage);
    if (keySubscribers.size === 0) subscribers.delete(storageKey);
  };
}

function notifyDurationSubscribers(storageKey: string) {
  subscribers.get(storageKey)?.forEach(subscriber => subscriber());
}

export function useMovementDuration(gameId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${gameId}`;
  const storedDuration = useSyncExternalStore(
    subscriber => subscribeToDuration(storageKey, subscriber),
    () => getDurationSnapshot(storageKey),
    () => String(PLAYER_STEP_DURATION_MS),
  );
  const parsedDuration = Number(storedDuration);
  const durationMs = normalizeDuration(
    Number.isFinite(parsedDuration) ? parsedDuration : PLAYER_STEP_DURATION_MS,
  );

  const updateDuration = (nextDurationMs: number) => {
    const normalizedDuration = normalizeDuration(nextDurationMs);

    try {
      window.localStorage.setItem(storageKey, String(normalizedDuration));
    } catch {
      return;
    }

    notifyDurationSubscribers(storageKey);
  };

  return { durationMs, setDurationMs: updateDuration };
}