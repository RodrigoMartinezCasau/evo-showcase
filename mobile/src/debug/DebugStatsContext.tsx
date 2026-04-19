/**
 * DebugStatsContext — real per-user persistent stats for streak, daily uses,
 * and unlocked phrase counts.
 *
 * Architecture (mirrors the working ThoughtsDatabase model)
 * ─────────────────────────────────────────────────────────
 * - The provider holds the FULL multi-user stats database in memory.
 * - Loaded once on app mount from a single AsyncStorage key.
 * - Every mutation produces a new database snapshot, sets it in memory, and
 *   persists the entire snapshot. No race conditions between user-switch
 *   and async load — there is only one source of truth.
 * - The active user's stats are a pure derived slice of the DB.
 *
 *   markStreakActivated() and decrementUses() are write-through atomic.
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
import { useQuotes } from '@evoconn/hooks/QuotesContext';
import {
  loadStatsDB,
  saveStatsDB,
  defaultUserStats,
  applyDailyRollover,
  applyStreakActivation,
  applyDecrementUses,
  getLocalDayKey,
  DAILY_USES_LIMIT,
  type UserStats,
  type StatsDatabase,
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
  /** True once the initial AsyncStorage DB load has completed. */
  statsLoaded: boolean;

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
  statsLoaded: false,
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
  const { totalUnlocked: quotesTotalUnlocked } = useQuotes();

  // ── Whole multi-user DB held in memory ────────────────────────────────────
  const [db, setDB] = useState<StatsDatabase>({});
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Load the entire DB ONCE on app mount.
  useEffect(() => {
    let cancelled = false;
    loadStatsDB().then((loaded) => {
      if (cancelled) return;
      console.log('[USERSTATS] Initial DB hydrated:', loaded);
      setDB(loaded);
      setStatsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Day-rollover detection ────────────────────────────────────────────────
  const [currentDay, setCurrentDay] = useState(() => getLocalDayKey());
  useEffect(() => {
    const id = setInterval(() => setCurrentDay(getLocalDayKey()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Helper: mutate the active user's slice and persist atomically ────────
  const mutateActiveSlice = useCallback(
    (mutator: (slice: UserStats) => UserStats) => {
      setDB((prev) => {
        const userId = sim.activeUserId;
        const current = prev[userId] ?? defaultUserStats();
        // Always apply day-rollover before any other mutation.
        const rolled = applyDailyRollover(current, getLocalDayKey());
        const next = mutator(rolled);
        if (next === current && rolled === current) return prev;
        const nextDB: StatsDatabase = { ...prev, [userId]: next };
        // Persist the entire snapshot (write-through).
        saveStatsDB(nextDB);
        return nextDB;
      });
    },
    [sim.activeUserId],
  );

  // ── Auto-rollover for the active user when the calendar day changes ──────
  useEffect(() => {
    if (!statsLoaded) return;
    const userId = sim.activeUserId;
    const slice = db[userId];
    if (!slice) return; // No record yet — nothing to roll over.
    if (slice.lastUsesResetDate === currentDay) return; // Already up to date.
    mutateActiveSlice((s) => s); // Forces rollover via mutateActiveSlice.
  }, [currentDay, sim.activeUserId, statsLoaded, db, mutateActiveSlice]);

  // ── Derived values for the ACTIVE user ────────────────────────────────────
  const activeSlice: UserStats = useMemo(
    () => db[sim.activeUserId] ?? defaultUserStats(),
    [db, sim.activeUserId],
  );
  const hasSentToday = activeSlice.hasSentTodayDate === currentDay;
  const streakDays = activeSlice.currentStreak;
  const remainingUses = activeSlice.dailyUsesRemaining;

  // Phrase count = KB phrases unlocked by this user via reflections (QuotesContext).
  const unlockedPhrases = quotesTotalUnlocked;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const markStreakActivated = useCallback(() => {
    console.log('[USERSTATS] markStreakActivated() for user', sim.activeUserId);
    mutateActiveSlice((s) => applyStreakActivation(s));
  }, [mutateActiveSlice, sim.activeUserId]);

  const decrementUses = useCallback(() => {
    console.log('[USERSTATS] decrementUses() for user', sim.activeUserId);
    mutateActiveSlice((s) => applyDecrementUses(s));
  }, [mutateActiveSlice, sim.activeUserId]);

  // ── Production compat ─────────────────────────────────────────────────────
  const [realStreakDays, setRealStreakRaw] = useState(0);
  const [realRemainingUses, setRealRemainingRaw] = useState(0);
  const setRealStreakDays = useCallback(
    (n: number) => setRealStreakRaw(Math.max(0, n)),
    [],
  );
  const setRealRemainingUses = useCallback(
    (n: number) => setRealRemainingRaw(Math.max(0, n)),
    [],
  );

  const value = useMemo<DebugStatsContextValue>(
    () => ({
      streakDays: IS_DEBUG_STATS_MODE ? streakDays : realStreakDays,
      remainingUses: IS_DEBUG_STATS_MODE ? remainingUses : realRemainingUses,
      unlockedPhrases,
      hasSentToday,
      statsLoaded,
      markStreakActivated,
      decrementUses,
      realStreakDays,
      setRealStreakDays,
      realRemainingUses,
      setRealRemainingUses,
      // No-op shims — kept for API compatibility, no longer have any effect.
      simulatedStreakDays: streakDays,
      setSimulatedStreakDays: () => {},
      simulatedRemainingUses: remainingUses,
      setSimulatedRemainingUses: () => {},
      simulatedUnlockedPhrases: unlockedPhrases,
      setSimulatedUnlockedPhrases: () => {},
    }),
    [
      streakDays,
      remainingUses,
      unlockedPhrases,
      hasSentToday,
      statsLoaded,
      markStreakActivated,
      decrementUses,
      realStreakDays,
      realRemainingUses,
      setRealStreakDays,
      setRealRemainingUses,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDebugStats(): DebugStatsContextValue {
  return useContext(Ctx);
}
