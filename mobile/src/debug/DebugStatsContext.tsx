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
  useRef,
  type ReactNode,
} from 'react';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useQuotes } from '@evoconn/hooks/QuotesContext';
import { useAuth } from '../../mobile/lib/AuthContext';
import { scheduleStreakReminder, cancelStreakReminder } from '@evoconn/services/pushNotifications';
import { syncProfileStats } from '@evoconn/services/profileStatsSync';
import { logAiUsageEvent } from '@evoconn/services/supabaseAnalytics';
import {
  loadStatsDB,
  saveStatsDB,
  defaultUserStats,
  applyDailyRollover,
  applyStreakActivation,
  applyStreakRecovery,
  applyDecrementUses,
  reconcileStreakOnLoad,
  mergeStatsFromRemote,
  getStreakRecovery,
  getLocalDayKey,
  DAILY_USES_LIMIT,
  type UserStats,
  type StatsDatabase,
  type StreakRecovery,
} from '@evoconn/services/userStatsStorage';
import { fetchStreak } from '@evoconn/services/streakApi';
import { isRealUserId } from '@evoconn/services/supabaseSocial';

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
  /**
   * Increments every time markStreakActivated() is explicitly called this session.
   * Use this (not streakDays) to gate the streak celebration animation, so it
   * only fires after a real send — never on app open or user-switch hydration.
   */
  streakTrigger: number;

  /**
   * Si el usuario perdió una racha de >2 días y está en la ventana de 24 h para
   * recuperarla (el día siguiente al día saltado), aquí van los días perdidos a
   * mostrar en la animación. null = no hay nada que recuperar / fuera de ventana
   * / ya reconocido hoy.
   */
  lostStreakPrompt: number | null;
  /** Marca la animación de racha perdida como ya mostrada hoy (no reaparece). */
  acknowledgeLostStreak: () => void;
  /**
   * Elegibilidad cruda de recuperación (ventana de 24 h), SIN tener en cuenta si
   * ya se mostró la animación. Úsalo para banners persistentes (p. ej. el aviso
   * en la pantalla de racha) que deben verse durante toda la ventana.
   */
  streakRecovery: StreakRecovery;

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
  streakTrigger: 0,
  lostStreakPrompt: null,
  acknowledgeLostStreak: () => {},
  streakRecovery: { eligible: false, lostValue: 0 },
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
  const { profile: authProfile } = useAuth();
  const { totalUnlocked: quotesTotalUnlocked } = useQuotes();

  // Use the real Supabase user ID when authenticated, fall back to sim ID for
  // dev/simulator sessions without a real account.
  const activeUserId = authProfile?.id ?? sim.activeUserId;

  // ── Whole multi-user DB held in memory ────────────────────────────────────
  const [db, setDB] = useState<StatsDatabase>({});
  const [statsLoaded, setStatsLoaded] = useState(false);
  const remoteStatsHydratedRef = useRef<Set<string>>(new Set());

  // Load the entire DB ONCE on app mount.
  // After loading, reconcile every user's streak so that stale non-zero
  // streaks from missed days are reset immediately — even when the daily
  // rollover already ran today (before the streak-break fix was present).
  useEffect(() => {
    let cancelled = false;
    loadStatsDB().then((loaded) => {
      if (cancelled) return;
      const today = getLocalDayKey();
      let changed = false;
      const reconciled: StatsDatabase = {};
      for (const [uid, stats] of Object.entries(loaded)) {
        const fixed = reconcileStreakOnLoad(stats, today);
        reconciled[uid] = fixed;
        if (fixed !== stats) changed = true;
      }
      console.log('[USERSTATS] Initial DB hydrated:', reconciled);
      setDB(reconciled);
      if (changed) saveStatsDB(reconciled);
      setStatsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Day-rollover detection (needed before streak reminder scheduling) ───
  const [currentDay, setCurrentDay] = useState(() => getLocalDayKey());
  useEffect(() => {
    const id = setInterval(() => setCurrentDay(getLocalDayKey()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Solo cambia al alternar usuario, día, o si ya reflexionó hoy — evita reprogramar en cada mutación de db.
  const streakReminderGateKey = useMemo(() => {
    const slice = db[activeUserId] ?? defaultUserStats();
    return `${activeUserId}|${currentDay}|${slice.hasSentTodayDate}`;
  }, [db, activeUserId, currentDay]);

  // ── Streak reminders (22:00 ≈ 2 h y 23:30 ≈ 30 min antes de medianoche) ───
  useEffect(() => {
    if (!statsLoaded) return;
    const slice = db[activeUserId] ?? defaultUserStats();
    const todaySent = slice.hasSentTodayDate === currentDay;
    if (!todaySent) {
      scheduleStreakReminder().catch(console.error);
    } else {
      cancelStreakReminder().catch(console.error);
    }
  }, [statsLoaded, activeUserId, currentDay, streakReminderGateKey]);

  // ── Helper: mutate the active user's slice and persist atomically ────────
  const mutateActiveSlice = useCallback(
    (mutator: (slice: UserStats) => UserStats) => {
      setDB((prev) => {
        const userId = activeUserId;
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
    [activeUserId],
  );

  // ── Auto-rollover for the active user when the calendar day changes ──────
  useEffect(() => {
    if (!statsLoaded) return;
    const userId = activeUserId;
    const slice = db[userId];
    if (!slice) return; // No record yet — nothing to roll over.
    if (slice.lastUsesResetDate === currentDay) return; // Already up to date.
    mutateActiveSlice((s) => s); // Forces rollover via mutateActiveSlice.
  }, [currentDay, activeUserId, statsLoaded, db, mutateActiveSlice]);

  // Alinear usos locales con Supabase (fuente de verdad en backend para IA).
  useEffect(() => {
    if (!statsLoaded || !authProfile?.id) return;
    const today = getLocalDayKey();
    const serverDay = authProfile.last_uses_reset_date
      ? String(authProfile.last_uses_reset_date).slice(0, 10)
      : null;
    let serverRemaining = Math.min(
      DAILY_USES_LIMIT,
      Math.max(0, Number(authProfile.remaining_uses ?? DAILY_USES_LIMIT)),
    );
    if (serverDay !== today) {
      serverRemaining = DAILY_USES_LIMIT;
    }
    setDB((prev) => {
      const cur = prev[authProfile.id] ?? defaultUserStats();
      const rolled = applyDailyRollover(cur, today);
      const mergedRemaining = Math.min(rolled.dailyUsesRemaining, serverRemaining);
      if (
        mergedRemaining === rolled.dailyUsesRemaining &&
        rolled.lastUsesResetDate === today
      ) {
        return prev;
      }
      const nextDB: StatsDatabase = {
        ...prev,
        [authProfile.id]: {
          ...rolled,
          dailyUsesRemaining: mergedRemaining,
          lastUsesResetDate: today,
        },
      };
      saveStatsDB(nextDB);
      return nextDB;
    });
  }, [
    statsLoaded,
    authProfile?.id,
    authProfile?.remaining_uses,
    authProfile?.last_uses_reset_date,
  ]);

  // Cross-device: racha + actividad de hoy desde Supabase profiles + backend streak.
  useEffect(() => {
    const uid = authProfile?.id;
    if (!uid || !isRealUserId(uid) || !statsLoaded) return;
    if (remoteStatsHydratedRef.current.has(uid)) return;
    remoteStatsHydratedRef.current.add(uid);

    let cancelled = false;
    void (async () => {
      const today = getLocalDayKey();
      const serverDay = authProfile.last_uses_reset_date
        ? String(authProfile.last_uses_reset_date).slice(0, 10)
        : null;
      let serverRemaining = Math.min(
        DAILY_USES_LIMIT,
        Math.max(0, Number(authProfile.remaining_uses ?? DAILY_USES_LIMIT)),
      );
      if (serverDay !== today) {
        serverRemaining = DAILY_USES_LIMIT;
      }

      let remoteStreak = Math.max(0, Number(authProfile.streak_days ?? 0));
      let hasSentToday = false;
      try {
        const streakData = await fetchStreak(uid);
        if (!cancelled) {
          remoteStreak = Math.max(remoteStreak, streakData.streak_current ?? 0);
          hasSentToday =
            streakData.last_activity_date === today ||
            (streakData.activity_log ?? []).includes(today);
        }
      } catch {
        // Offline: usar solo profiles.streak_days
      }

      if (cancelled) return;

      setDB((prev) => {
        const local = prev[uid] ?? defaultUserStats();
        const merged = mergeStatsFromRemote(
          local,
          {
            streakDays: remoteStreak,
            remainingUses: serverRemaining,
            hasSentToday,
            lastUsesResetDate: today,
          },
          today,
        );
        if (
          merged.currentStreak === local.currentStreak &&
          merged.dailyUsesRemaining === local.dailyUsesRemaining &&
          merged.hasSentTodayDate === local.hasSentTodayDate
        ) {
          return prev;
        }
        const nextDB: StatsDatabase = { ...prev, [uid]: merged };
        saveStatsDB(nextDB);
        return nextDB;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    statsLoaded,
    authProfile?.id,
    authProfile?.streak_days,
    authProfile?.remaining_uses,
    authProfile?.last_uses_reset_date,
  ]);

  // Sube racha/usos locales a Supabase tras mutaciones (the same figure as the bar).
  useEffect(() => {
    if (!statsLoaded || !authProfile?.id) return;
    const slice = db[authProfile.id] ?? defaultUserStats();
    void syncProfileStats(
      authProfile.id,
      slice.currentStreak,
      slice.dailyUsesRemaining,
      slice.lastUsesResetDate ?? getLocalDayKey(),
    );
  }, [statsLoaded, authProfile?.id, db]);

  // ── Derived values for the ACTIVE user ────────────────────────────────────
  const activeSlice: UserStats = useMemo(
    () => db[activeUserId] ?? defaultUserStats(),
    [db, activeUserId],
  );
  const hasSentToday = activeSlice.hasSentTodayDate === currentDay;
  const streakDays = activeSlice.currentStreak;
  const remainingUses = activeSlice.dailyUsesRemaining;

  // ── Recuperación de racha perdida ──────────────────────────────────────────
  // Solo elegible el día siguiente al día saltado (ventana 24 h) y si todavía no
  // se ha mostrado hoy la animación.
  const streakRecovery = useMemo<StreakRecovery>(
    () => getStreakRecovery(activeSlice, currentDay),
    [activeSlice, currentDay],
  );
  const lostStreakPrompt = useMemo<number | null>(() => {
    if (!streakRecovery.eligible) return null;
    if (activeSlice.lostStreakAckDate === currentDay) return null;
    return streakRecovery.lostValue;
  }, [streakRecovery, activeSlice.lostStreakAckDate, currentDay]);

  const acknowledgeLostStreak = useCallback(() => {
    const today = getLocalDayKey();
    mutateActiveSlice((s) =>
      s.lostStreakAckDate === today ? s : { ...s, lostStreakAckDate: today },
    );
  }, [mutateActiveSlice]);

  // Phrase count = KB phrases unlocked by this user via reflections (QuotesContext).
  const unlockedPhrases = quotesTotalUnlocked;

  // ── Mutations ─────────────────────────────────────────────────────────────
  // Counter incremented ONLY when markStreakActivated() is explicitly called
  // (not on storage load or user-switch). Used by AppAnimationLayer to gate
  // the streak celebration so it never fires on app open.
  const [streakTrigger, setStreakTrigger] = useState(0);

  const markStreakActivated = useCallback(() => {
    console.log('[USERSTATS] markStreakActivated() for user', activeUserId);
    const today = getLocalDayKey();
    const isFirstSendToday = activeSlice.hasSentTodayDate !== today;
    mutateActiveSlice((s) => {
      // Si está dentro de la ventana de recuperación, restablecemos la racha
      // perdida (días perdidos + hoy) en vez de empezar de 1. La animación de
      // aumento de racha la dispara streakTrigger igual que en una activación.
      const recovery = getStreakRecovery(s, today);
      const next = recovery.eligible ? applyStreakRecovery(s) : applyStreakActivation(s);
      if (authProfile?.id) {
        void syncProfileStats(
          authProfile.id,
          next.currentStreak,
          next.dailyUsesRemaining,
          today,
        );
      }
      return next;
    });
    if (isFirstSendToday) {
      setStreakTrigger((n) => n + 1);
      cancelStreakReminder().catch(console.error);
    }
  }, [mutateActiveSlice, activeUserId, activeSlice, authProfile?.id]);

  const decrementUses = useCallback(() => {
    console.log('[USERSTATS] decrementUses() for user', activeUserId);
    mutateActiveSlice((s) => {
      const next = applyDecrementUses(s);
      if (authProfile?.id) {
        void syncProfileStats(
          authProfile.id,
          next.currentStreak,
          next.dailyUsesRemaining,
          getLocalDayKey(),
        );
        void logAiUsageEvent({ source: 'app_daily_use' });
      }
      return next;
    });
  }, [mutateActiveSlice, activeUserId, authProfile?.id]);

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
      // Always use the local AsyncStorage values — they persist correctly per
      // user, handle day-rollover, and are updated immediately on every action.
      // The "real*" API values are kept for backwards-compat with StreakScreen /
      // DailyUsesScreen but the top bar now always reads from local storage.
      streakDays,
      remainingUses,
      streakTrigger,
      lostStreakPrompt,
      acknowledgeLostStreak,
      streakRecovery,
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
      streakTrigger,
      lostStreakPrompt,
      acknowledgeLostStreak,
      streakRecovery,
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
