/**
 * DebugStreakContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a single reactive source of truth for the debug streak simulation.
 *
 * WHY A CONTEXT (not a module variable):
 *   React only re-renders components when React state changes. A plain
 *   module-level variable is invisible to React — it cannot trigger re-renders
 *   no matter how many listeners you attach. This context wraps the flag in
 *   useState so that ANY component subscribed to it re-renders automatically
 *   the moment markStreakActivated() is called, from any screen in the tree.
 *
 * Usage:
 *   • StreakScreen  → const { hasSentToday } = useDebugStreak();
 *   • ReflectionCreationScreen / PhraseCreationScreen
 *                  → const { markStreakActivated } = useDebugStreak();
 *
 * Simulation behaviour (debug/dev builds only):
 *   • hasSentToday starts as false every time the JS bundle loads (app launch).
 *   • markStreakActivated() flips it to true on first call; subsequent calls
 *     are silent no-ops.
 *   • In production (__DEV__ === false) the flag stays false permanently and
 *     markStreakActivated() is a no-op — zero runtime cost.
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

/** Master switch — always false in production builds. */
export const IS_DEBUG_STREAK_MODE: boolean = __DEV__;

// ─── Types ────────────────────────────────────────────────────────────────────

type DebugStreakContextValue = {
  /** True once the user has sent the first reflection or phrase this session. */
  hasSentToday: boolean;
  /**
   * Call after a successful reflection or phrase publish.
   * Flips hasSentToday to true (once per session).
   * No-op in production or after the first call.
   */
  markStreakActivated: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<DebugStreakContextValue>({
  hasSentToday: false,
  markStreakActivated: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DebugStreakProvider({ children }: { children: ReactNode }) {
  // Starts as false on every app launch (module re-initialises each time).
  const [hasSentToday, setHasSentToday] = useState(false);

  const markStreakActivated = useCallback(() => {
    if (!IS_DEBUG_STREAK_MODE) return;

    setHasSentToday((prev) => {
      if (prev) {
        // eslint-disable-next-line no-console
        console.log('[DEBUG STREAK] Already activated today — no change.');
        return prev;
      }
      // eslint-disable-next-line no-console
      console.log('[DEBUG STREAK] First action of the day → hasSentToday = true. Fire activating.');
      return true;
    });
  }, []);

  if (IS_DEBUG_STREAK_MODE) {
    // Log once when the provider first mounts (app start).
    // Using a ref would add boilerplate; a simple module flag is fine here.
  }

  return (
    <Ctx.Provider value={{ hasSentToday, markStreakActivated }}>
      {children}
    </Ctx.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns the debug streak state and activation function.
 * Safe to call unconditionally — in production hasSentToday is always false
 * and markStreakActivated is a no-op.
 */
export function useDebugStreak(): DebugStreakContextValue {
  return useContext(Ctx);
}
