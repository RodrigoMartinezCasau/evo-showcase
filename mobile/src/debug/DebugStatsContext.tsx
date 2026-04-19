/**
 * DebugStatsContext — real per-user persistent stats for streak, daily uses,
 * and unlocked phrase counts.
 *
 * All three values are now backed by real device-date-aware AsyncStorage per user.
 * No manual fake overrides. No fake seed defaults.
 *
 * - streakDays: consecutive days this user has taken a qualifying action.
 * - remainingUses: uses left today (resets to DAILY_USES_LIMIT each calendar day).
 * - unlockedPhrases: count of phrase-type conversations owned by the active user.
 * - hasSentToday: true if the user has already sent a reflection or phrase today.
 *
 * markStreakActivated() and decrementUses() persist changes immediately.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import {
  loadUserStats,
  saveUserStats,
  decrementUsesForUser,
  activateStreakForUser,
  getLocalDayKey,
  DAILY_USES_LIMIT,
  type UserStats,
} from '@evoconn/services/userStatsStorage';

// ─── Master switch ─────────────────────────────────────────────────────────────

/** Always false in production builds. True in dev/simulation mode. */
export const IS_DEBUG_STATS_MODE: boolean = __DEV__;

/** Daily uses limit — exported for display in UI. */
export const SIMULATED_TOTAL_DAILY_USES = DAILY_USES_LIMIT;

// ─── Context type ─────────────────────────────────────────────────────────────

type DebugStatsContextValue = {
  // ── Resolved per-user values ──────────────────────────────────────────────
  streakDays: number;
  remainingUses: number;
  unlockedPhrases: number;
  /** True when the active user has completed their first qualifying action today. */
  hasSentToday: boolean;

  // ── Mutation helpers ──────────────────────────────────────────────────────
  /** Call after a successful reflection or phrase send (not publish). */
  markStreakActivated: () => void;
  /** Call when a use is consumed. Decrements and persists immediately. */
  decrementUses: () => void;

  // ── Production compat (set by StreakScreen / DailyUsesScreen after API load) ──
  realStreakDays: number;
  setRealStreakDays: (n: number) => void;
  realRemainingUses: number;
  setRealRemainingUses: (n: number) => void;

  // ── API compat shims (no longer functional — kept to avoid breaking callers) ──
  simulatedStreakDays: number;
  setSimulatedStreakDays: (n: number) => void;
  simulatedRemainingUses: number;
  setSimulatedRemainingUses: (n: number) => void;
  simulatedUnlockedPhrases: number;
  setSimulatedUnlockedPhrases: (n: number) => void;
};

const Ctx = createContext<DebugStatsContextValue>({
  streakDays: 0,
  remainingUses: DAILY_USES_LIMIT,
  unlockedPhrases: 0,
  hasSentToday: false,
  markStreakActivated: () => {},
  decrementUses: () => {},
  realStreakDays: 0,
  setRealStreakDays: () => {},
  realRemainingUses: 0,
  setRealRemainingUses: () => {},
  simulatedStreakDays: 0,
  setSimulatedStreakDays: () => {},
  simulatedRemainingUses: DAILY_USES_LIMIT,
  setSimulatedRemainingUses: () => {},
  simulatedUnlockedPhrases: 0,
  setSimulatedUnlockedPhrases: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DebugStatsProvider({ children }: { children: ReactNode }) {
  const sim = useSimulation();
  const { thoughts } = useThoughts();

  // ── Per-user persisted stats ──────────────────────────────────────────────
  const [stats, setStats] = useState<UserStats>({
    currentStreak: 0,
    hasSentTodayDate: null,
    dailyUsesRemaining: DAILY_USES_LIMIT,
    lastUsesResetDate: null,
  });

  // Load from AsyncStorage whenever the active user changes (or on first mount).
  useEffect(() => {
    let cancelled = false;
    loadUserStats(sim.activeUserId).then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => { cancelled = true; };
  }, [sim.activeUserId]);

  // ── Day-rollover detection ────────────────────────────────────────────────
  const [currentDay, setCurrentDay] = useState(() => getLocalDayKey());
  useEffect(() => {
    const id = setInterval(() => setCurrentDay(getLocalDayKey()), 60_000);
    return () => clearInterval(id);
  }, []);

  // When the calendar day changes, reset uses if they haven't been reset yet.
  useEffect(() => {
    if (stats.lastUsesResetDate !== null && stats.lastUsesResetDate !== currentDay) {
      const reset: UserStats = {
        ...stats,
        dailyUsesRemaining: DAILY_USES_LIMIT,
        lastUsesResetDate: currentDay,
      };
      setStats(reset);
      saveUserStats(sim.activeUserId, reset);
    }
  }, [currentDay, stats, sim.activeUserId]);

  // ── Derived values ────────────────────────────────────────────────────────
  const hasSentToday = stats.hasSentTodayDate === currentDay;
  const streakDays = stats.currentStreak;
  const remainingUses = stats.dailyUsesRemaining;

  // Phrase count = number of phrase-type conversations owned by the active user.
  const unlockedPhrases = useMemo(
    () => thoughts.filter((t) => t.type === 'phrase').length,
    [thoughts],
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const markStreakActivated = useCallback(() => {
    activateStreakForUser(sim.activeUserId).then((updated) => setStats(updated));
  }, [sim.activeUserId]);

  const decrementUses = useCallback(() => {
    decrementUsesForUser(sim.activeUserId).then((remaining) =>
      setStats((prev) => ({ ...prev, dailyUsesRemaining: remaining })),
    );
  }, [sim.activeUserId]);

  // ── Production compat ─────────────────────────────────────────────────────
  const [realStreakDays, setRealStreakRaw] = useState(0);
  const [realRemainingUses, setRealRemainingRaw] = useState(0);
  const setRealStreakDays = useCallback((n: number) => setRealStreakRaw(Math.max(0, n)), []);
  const setRealRemainingUses = useCallback((n: number) => setRealRemainingRaw(Math.max(0, n)), []);

  const value = useMemo<DebugStatsContextValue>(
    () => ({
      streakDays:      IS_DEBUG_STATS_MODE ? streakDays      : realStreakDays,
      remainingUses:   IS_DEBUG_STATS_MODE ? remainingUses   : realRemainingUses,
      unlockedPhrases,
      hasSentToday,
      markStreakActivated,
      decrementUses,
      realStreakDays,
      setRealStreakDays,
      realRemainingUses,
      setRealRemainingUses,
      // No-op shims — kept for API compatibility, no longer have any effect.
      simulatedStreakDays:         streakDays,
      setSimulatedStreakDays:      () => {},
      simulatedRemainingUses:      remainingUses,
      setSimulatedRemainingUses:   () => {},
      simulatedUnlockedPhrases:    unlockedPhrases,
      setSimulatedUnlockedPhrases: () => {},
    }),
    [
      streakDays, remainingUses, unlockedPhrases, hasSentToday,
      markStreakActivated, decrementUses,
      realStreakDays, realRemainingUses, setRealStreakDays, setRealRemainingUses,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDebugStats(): DebugStatsContextValue {
  return useContext(Ctx);
}
