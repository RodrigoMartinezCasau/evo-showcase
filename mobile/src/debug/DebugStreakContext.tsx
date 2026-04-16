/**
 * DebugStreakContext — daily streak activation state
 * ─────────────────────────────────────────────────────────────────────────────
 * Single reactive source of truth for "has the user sent their first
 * reflection or phrase today?".
 *
 * DAILY LOGIC
 * ─────────────────────────────────────────────────────────────────────────────
 * • State: activationDay  — local date string when streak was activated ("YYYY-MM-DD")
 *           currentDay    — today's local date string, updated every minute
 * • hasSentToday = (activationDay === currentDay)
 * • activationDay starts as null on every app launch → hasSentToday = false
 * • When markStreakActivated() is called: activationDay = currentDay → true
 * • When the day rolls over: currentDay changes → hasSentToday becomes false
 *   automatically, without touching activationDay
 *
 * TRIGGER (must be called from)
 * ─────────────────────────────────────────────────────────────────────────────
 * • ReflectionCreationScreen → handleSend (after sendMessage succeeds)
 * • PhraseCreationScreen     → handleSend (after createPhraseThought succeeds)
 * NOT from publish-to-community flows.
 *
 * SIMULATOR / DEBUG
 * ─────────────────────────────────────────────────────────────────────────────
 * • Each app launch starts with activationDay = null → grey fire
 * • First qualifying send → colored clan fire
 * • No AsyncStorage — state intentionally resets on every launch for easy testing
 *
 * PRODUCTION
 * ─────────────────────────────────────────────────────────────────────────────
 * StreakScreen's production useEffect uses real backend data (activity_log).
 * The context only drives the debug useEffect in StreakScreen.
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

/** Master switch — always false in production builds. */
export const IS_DEBUG_STREAK_MODE: boolean = __DEV__;

// ─── Day key helper ───────────────────────────────────────────────────────────

/** Returns the user's current local calendar date as "YYYY-MM-DD". */
function getLocalDayKey(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DebugStreakContextValue = {
  /** True when the user has already sent a reflection or phrase today. */
  hasSentToday: boolean;
  /**
   * Call this after a successful reflection OR phrase send (not publish).
   * Idempotent — subsequent calls on the same day are silent no-ops.
   * No-op in production (__DEV__ === false).
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
  // The local date when the streak was last activated (null = never this session).
  const [activationDay, setActivationDay] = useState<string | null>(null);

  // Today's local date key — recomputed every minute so day rollover is detected.
  const [currentDay, setCurrentDay] = useState<string>(() => getLocalDayKey());

  // Log session start once on mount.
  const loggedMount = useRef(false);
  useEffect(() => {
    if (!IS_DEBUG_STREAK_MODE || loggedMount.current) return;
    loggedMount.current = true;
    // eslint-disable-next-line no-console
    console.log(`[STREAK] Session started. currentDay = ${currentDay}. hasSentToday = false.`);
  }, [currentDay]);

  // Poll for day rollover every 60 seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      const newDay = getLocalDayKey();
      setCurrentDay((prev) => {
        if (prev === newDay) return prev; // no change
        // eslint-disable-next-line no-console
        console.log(`[STREAK] Day rolled over: ${prev} → ${newDay}. Streak reset to grey.`);
        return newDay;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // hasSentToday is true only if the activation happened on today's date.
  const hasSentToday = activationDay === currentDay;

  const markStreakActivated = useCallback(() => {
    if (!IS_DEBUG_STREAK_MODE) return;

    const today = getLocalDayKey();
    setActivationDay((prev) => {
      if (prev === today) {
        // eslint-disable-next-line no-console
        console.log(`[STREAK] Already activated for today (${today}). No change.`);
        return prev;
      }
      // eslint-disable-next-line no-console
      console.log(`[STREAK] First qualifying action of the day (${today}) → hasSentToday = true. Fire switching to clan color.`);
      return today;
    });
  }, []);

  return (
    <Ctx.Provider value={{ hasSentToday, markStreakActivated }}>
      {children}
    </Ctx.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns the reactive daily streak state.
 * Safe to call unconditionally — in production hasSentToday is always false
 * (StreakScreen uses real backend data instead) and markStreakActivated is a no-op.
 */
export function useDebugStreak(): DebugStreakContextValue {
  return useContext(Ctx);
}
