/**
 * userStatsStorage.ts — single-database, multi-user persistent stats.
 *
 * Storage model (v3 — bulletproof, mirrors thoughtsStorage.ts)
 * ────────────────────────────────────────────────────────────
 * ONE AsyncStorage key holds the ENTIRE stats database keyed by userId:
 *
 *   @physicscopilot/user_stats_v3  →  { [userId]: UserStats }
 *
 * Why single-key?
 *  - No race conditions between user-switch and async load.
 *  - No stale read can ever overwrite another user's slice.
 *  - Every write is a snapshot of the WHOLE database.
 *  - Identical pattern to the working thoughts/posts persistence.
 *
 * All values start from zero/baseline. New users get default stats.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@physicscopilot/user_stats_v3';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum daily uses each user gets per calendar day. */
export const DAILY_USES_LIMIT = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserStats = {
  /** Current consecutive day streak. */
  currentStreak: number;
  /**
   * The device date (YYYY-MM-DD) on which the first qualifying action was taken.
   * null = never activated (streak fire is off).
   */
  hasSentTodayDate: string | null;
  /** Remaining uses for today. Resets to DAILY_USES_LIMIT on each new calendar day. */
  dailyUsesRemaining: number;
  /** The device date on which uses were last reset. */
  lastUsesResetDate: string | null;
};

export type StatsDatabase = Record<string, UserStats>;

// ─── Day helper ───────────────────────────────────────────────────────────────

/** Returns the local calendar date as "YYYY-MM-DD" based on the device clock. */
export function getLocalDayKey(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Returns yesterday's local calendar date as "YYYY-MM-DD". */
function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Default stats for a brand-new user. */
export function defaultUserStats(): UserStats {
  return {
    currentStreak: 0,
    hasSentTodayDate: null,
    dailyUsesRemaining: DAILY_USES_LIMIT,
    lastUsesResetDate: getLocalDayKey(),
  };
}

// ─── Whole-DB load / save ─────────────────────────────────────────────────────

/**
 * Load the entire stats database from AsyncStorage.
 * Returns {} on first run or read failure.
 */
export async function loadStatsDB(): Promise<StatsDatabase> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      console.log('[USERSTATS] First run — empty DB.');
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn('[USERSTATS] Invalid stored DB shape, resetting.');
      return {};
    }
    console.log('[USERSTATS] Loaded DB with users:', Object.keys(parsed));
    return parsed as StatsDatabase;
  } catch (e) {
    console.error('[USERSTATS] Failed to load DB:', e);
    return {};
  }
}

/** Persist the entire database. Awaits to guarantee write completion. */
export async function saveStatsDB(db: StatsDatabase): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
    console.log('[USERSTATS] Saved DB. Users:', Object.keys(db));
  } catch (e) {
    console.error('[USERSTATS] Failed to save DB:', e);
  }
}

// ─── Pure stats transforms (no I/O) ───────────────────────────────────────────

/**
 * Apply daily-uses rollover to a stats slice if the calendar day has changed.
 * Returns either the unchanged input or a new slice with reset uses.
 */
export function applyDailyRollover(stats: UserStats, today: string): UserStats {
  if (stats.lastUsesResetDate === today) return stats;
  return {
    ...stats,
    dailyUsesRemaining: DAILY_USES_LIMIT,
    lastUsesResetDate: today,
  };
}

/**
 * Pure activation logic: bumps streak according to consecutive-day rules.
 * - Already activated today → no-op.
 * - Last activation was yesterday → streak += 1.
 * - Otherwise → streak = 1 (fresh start).
 */
export function applyStreakActivation(stats: UserStats): UserStats {
  const today = getLocalDayKey();
  if (stats.hasSentTodayDate === today) return stats;
  const yesterday = getYesterdayKey();
  const newStreak =
    stats.hasSentTodayDate === yesterday ? stats.currentStreak + 1 : 1;
  return {
    ...stats,
    currentStreak: newStreak,
    hasSentTodayDate: today,
  };
}

/** Pure decrement: subtracts one use, floored at zero. */
export function applyDecrementUses(stats: UserStats): UserStats {
  if (stats.dailyUsesRemaining <= 0) return stats;
  return { ...stats, dailyUsesRemaining: stats.dailyUsesRemaining - 1 };
}
