/**
 * DEBUG STREAK SIMULATION MODE
 * ─────────────────────────────────────────────────────────────────────────────
 * Lets you test the apagado → encendido fire transition on every app launch
 * without touching the real backend streak data.
 *
 * How it works
 * ─────────────────────────────────────────────────────────────────────────────
 * • IS_DEBUG_STREAK_MODE  — enabled in __DEV__ builds only.
 *   Set to false to disable entirely; always false in production.
 *
 * • _activatedThisSession — module-level boolean, starts as false every time
 *   the JS bundle initialises (app launch, simulator reload, hot-reload).
 *   NEVER persisted — no AsyncStorage, no backend write.
 *
 * • debugMarkStreakActivated() — called by the reflection / phrase publish
 *   handlers. Only the FIRST call per session has any effect; subsequent
 *   calls are silent no-ops. Notifies all subscribed listeners (StreakScreen)
 *   so the animation can play in real time even when the screen is mounted
 *   but not currently focused.
 *
 * Production safety
 * ─────────────────────────────────────────────────────────────────────────────
 * Every exported function is a no-op when IS_DEBUG_STREAK_MODE === false, so
 * flipping the flag (or relying on tree-shaking in a prod build) is all that
 * is needed to disable this completely.
 */

/** Enable only in Expo dev / simulator builds. Flip to false to disable. */
export const IS_DEBUG_STREAK_MODE: boolean = __DEV__;

// ─── Session store ────────────────────────────────────────────────────────────

/**
 * Resets to false every time the JS bundle loads (i.e. every app launch,
 * simulator reload, or full hot-reload). This is the only "reset" needed.
 */
let _activatedThisSession = false;

if (IS_DEBUG_STREAK_MODE) {
  // eslint-disable-next-line no-console
  console.log(
    '[DEBUG STREAK] Session started. hasSentToday = false. Fire will be apagado until first action.',
  );
}

// ─── Subscriber list (minimal event bus) ─────────────────────────────────────

/** Callbacks registered by StreakScreen to receive live-activation events. */
const _listeners = new Set<() => void>();

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns true if the user has already sent a reflection or phrase this session. */
export function debugStreakIsActiveThisSession(): boolean {
  return _activatedThisSession;
}

/**
 * Call this when the user publishes a reflection or phrase.
 * Only the FIRST call per session fires the animation; all later calls are
 * silently ignored so the animation never plays twice.
 */
export function debugMarkStreakActivated(): void {
  if (!IS_DEBUG_STREAK_MODE) return;

  if (_activatedThisSession) {
    // eslint-disable-next-line no-console
    console.log('[DEBUG STREAK] hasSentToday already true — no repeated animation.');
    return;
  }

  _activatedThisSession = true;
  // eslint-disable-next-line no-console
  console.log('[DEBUG STREAK] First action detected → hasSentToday = true. Activating fire.');

  // Notify every mounted StreakScreen so the animation plays in real time.
  _listeners.forEach((fn) => fn());
}

/**
 * Subscribe to the first-activation event.
 * StreakScreen registers here on mount; the callback fires exactly once
 * per session when debugMarkStreakActivated() is first called.
 */
export function addDebugStreakListener(fn: () => void): void {
  if (!IS_DEBUG_STREAK_MODE) return;
  _listeners.add(fn);
}

/** Unsubscribe — call this in the useEffect cleanup of StreakScreen. */
export function removeDebugStreakListener(fn: () => void): void {
  _listeners.delete(fn);
}
