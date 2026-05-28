/**
 * useSinglePressGate / useSinglePress — fix for the Android Fabric crash
 * `IllegalStateException: addViewAt failed to insert view into parent`.
 *
 * Cause: rapid multi-tap (3+ taps in <600ms) on an interactive element inside
 * a `Modal` triggers concurrent `onClose()` + child remount cycles in the same
 * frame. Fabric's `SurfaceMountingManager.addViewAt` then tries to insert a
 * view whose previous parent has not yet been detached → crash.
 *
 * Strategy: gate handlers with a `useRef` lock that auto-releases after a
 * short cooldown. No re-render cost, no state, safe across modal re-open.
 */
import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_COOLDOWN_MS = 400;

type Timeout = ReturnType<typeof setTimeout>;

/**
 * Returns `{ runGuarded, reset }`. Use when a single component dispatches
 * many different handlers (e.g. an action sheet with N options) and a single
 * press should disable all of them until the cooldown elapses.
 *
 * `reset()` is meant for the parent's `useEffect([visible])`: when the modal
 * closes, clear any leftover lock so the next open starts fresh.
 */
export function useSinglePressGate(cooldownMs: number = DEFAULT_COOLDOWN_MS) {
  const lockedRef = useRef(false);
  const timeoutRef = useRef<Timeout | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lockedRef.current = false;
  }, []);

  const runGuarded = useCallback(
    (fn: () => void) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      try {
        fn();
      } finally {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          lockedRef.current = false;
          timeoutRef.current = null;
        }, cooldownMs);
      }
    },
    [cooldownMs],
  );

  return { runGuarded, reset };
}

/**
 * Convenience wrapper for a single fixed handler — returns a guarded version
 * that ignores rapid-fire invocations within `cooldownMs`.
 */
export function useSinglePress<T extends unknown[]>(
  fn: (...args: T) => void,
  cooldownMs: number = DEFAULT_COOLDOWN_MS,
): (...args: T) => void {
  const lockedRef = useRef(false);
  const timeoutRef = useRef<Timeout | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return useCallback(
    (...args: T) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      try {
        fn(...args);
      } finally {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          lockedRef.current = false;
          timeoutRef.current = null;
        }, cooldownMs);
      }
    },
    [fn, cooldownMs],
  );
}
