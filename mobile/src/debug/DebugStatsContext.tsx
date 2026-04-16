import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

/**
 * Master switch — always false in production builds.
 * When true, the top bar and detail screens read from simulated values
 * instead of the real backend data.
 */
export const IS_DEBUG_STATS_MODE: boolean = __DEV__;

/**
 * Default starting values for the debug simulation.
 * Adjust these constants to change the initial simulated state on each
 * simulator launch without opening the editor panel.
 */
const DEFAULT_SIMULATED_STREAK_DAYS       = 7;
const DEFAULT_SIMULATED_REMAINING_USES    = 28;
const DEFAULT_SIMULATED_UNLOCKED_PHRASES  = 30;

/** Total daily uses limit (used by the simulation editor max clamp). */
export const SIMULATED_TOTAL_DAILY_USES = 30;

type DebugStatsContextValue = {
  // ── Simulated values — editable in debug mode ─────────────────────────────
  simulatedStreakDays: number;
  setSimulatedStreakDays: (n: number) => void;
  simulatedRemainingUses: number;
  setSimulatedRemainingUses: (n: number) => void;
  simulatedUnlockedPhrases: number;
  setSimulatedUnlockedPhrases: (n: number) => void;

  // ── Real values — populated by detail screens after API load ─────────────
  realStreakDays: number;
  setRealStreakDays: (n: number) => void;
  realRemainingUses: number;
  setRealRemainingUses: (n: number) => void;

  // ── Resolved values — use these everywhere ────────────────────────────────
  /**
   * In debug mode → simulatedStreakDays.
   * In production → realStreakDays (set by StreakScreen after API load).
   */
  streakDays: number;
  /**
   * In debug mode → simulatedRemainingUses.
   * In production → realRemainingUses (set by DailyUsesScreen after API load).
   */
  remainingUses: number;
  /**
   * In debug mode → simulatedUnlockedPhrases.
   * In production → real unlocked phrases count from QuotesContext.
   */
  unlockedPhrases: number;
};

const Ctx = createContext<DebugStatsContextValue>({
  simulatedStreakDays: DEFAULT_SIMULATED_STREAK_DAYS,
  setSimulatedStreakDays: () => {},
  simulatedRemainingUses: DEFAULT_SIMULATED_REMAINING_USES,
  setSimulatedRemainingUses: () => {},
  simulatedUnlockedPhrases: DEFAULT_SIMULATED_UNLOCKED_PHRASES,
  setSimulatedUnlockedPhrases: () => {},
  realStreakDays: 0,
  setRealStreakDays: () => {},
  realRemainingUses: 0,
  setRealRemainingUses: () => {},
  streakDays:      IS_DEBUG_STATS_MODE ? DEFAULT_SIMULATED_STREAK_DAYS      : 0,
  remainingUses:   IS_DEBUG_STATS_MODE ? DEFAULT_SIMULATED_REMAINING_USES   : 0,
  unlockedPhrases: IS_DEBUG_STATS_MODE ? DEFAULT_SIMULATED_UNLOCKED_PHRASES : 0,
});

export function DebugStatsProvider({ children }: { children: ReactNode }) {
  const [simulatedStreakDays,      setSimulatedRaw]        = useState(DEFAULT_SIMULATED_STREAK_DAYS);
  const [simulatedRemainingUses,   setRemainingRaw]        = useState(DEFAULT_SIMULATED_REMAINING_USES);
  const [simulatedUnlockedPhrases, setUnlockedPhrasesRaw]  = useState(DEFAULT_SIMULATED_UNLOCKED_PHRASES);
  const [realStreakDays,            setRealStreakRaw]       = useState(0);
  const [realRemainingUses,         setRealRemainingRaw]   = useState(0);

  const setSimulatedStreakDays = useCallback(
    (n: number) => setSimulatedRaw(Math.max(0, Math.round(n))),
    [],
  );
  const setSimulatedRemainingUses = useCallback(
    (n: number) =>
      setRemainingRaw(Math.max(0, Math.min(SIMULATED_TOTAL_DAILY_USES, Math.round(n)))),
    [],
  );
  const setSimulatedUnlockedPhrases = useCallback(
    (n: number) => setUnlockedPhrasesRaw(Math.max(0, Math.round(n))),
    [],
  );
  const setRealStreakDays = useCallback(
    (n: number) => setRealStreakRaw(Math.max(0, Math.round(n))),
    [],
  );
  const setRealRemainingUses = useCallback(
    (n: number) => setRealRemainingRaw(Math.max(0, Math.round(n))),
    [],
  );

  const streakDays      = IS_DEBUG_STATS_MODE ? simulatedStreakDays      : realStreakDays;
  const remainingUses   = IS_DEBUG_STATS_MODE ? simulatedRemainingUses   : realRemainingUses;
  const unlockedPhrases = IS_DEBUG_STATS_MODE ? simulatedUnlockedPhrases : 0;

  return (
    <Ctx.Provider
      value={{
        simulatedStreakDays,
        setSimulatedStreakDays,
        simulatedRemainingUses,
        setSimulatedRemainingUses,
        simulatedUnlockedPhrases,
        setSimulatedUnlockedPhrases,
        realStreakDays,
        setRealStreakDays,
        realRemainingUses,
        setRealRemainingUses,
        streakDays,
        remainingUses,
        unlockedPhrases,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useDebugStats(): DebugStatsContextValue {
  return useContext(Ctx);
}
