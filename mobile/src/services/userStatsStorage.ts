/**
 * userStatsStorage.ts — real per-user persistent stats for the 9-user simulation.
 *
 * Stores streak and daily-uses data in AsyncStorage under a single key.
 * All values start from zero and grow only through real in-app activity.
 * No fake defaults — new users begin at 0 streak and DAILY_USES_LIMIT uses.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@physicscopilot/user_stats_v2';

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
  /** The device date on which uses were last reset. null = never (will reset on first access). */
  lastUsesResetDate: string | null;
};

type StatsDB = Record<string, UserStats>;

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

// ─── In-memory write-through cache ───────────────────────────────────────────

let _cache: StatsDB | null = null;

async function loadDB(): Promise<StatsDB> {
  if (_cache !== null) return _cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    _cache = raw ? (JSON.parse(raw) as StatsDB) : {};
  } catch {
    _cache = {};
  }
  return _cache;
}

async function saveDB(db: StatsDB): Promise<void> {
  _cache = db;
  AsyncStorage.setItem(KEY, JSON.stringify(db)).catch(console.error);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load the persisted stats for a specific user.
 * First-time users start at 0 streak and full uses.
 * Uses are automatically reset to DAILY_USES_LIMIT if the calendar day has changed.
 */
export async function loadUserStats(userId: string): Promise<UserStats> {
  const db = await loadDB();
  const today = getLocalDayKey();
  const stored = db[userId];

  if (!stored) {
    const defaults: UserStats = {
      currentStreak: 0,
      hasSentTodayDate: null,
      dailyUsesRemaining: DAILY_USES_LIMIT,
      lastUsesResetDate: today,
    };
    await saveDB({ ...db, [userId]: defaults });
    return defaults;
  }

  // Auto-reset uses when the calendar day has changed since last access.
  if (stored.lastUsesResetDate !== today) {
    const reset: UserStats = {
      ...stored,
      dailyUsesRemaining: DAILY_USES_LIMIT,
      lastUsesResetDate: today,
    };
    await saveDB({ ...db, [userId]: reset });
    return reset;
  }

  return stored;
}

/** Overwrite the stored stats for a user. */
export async function saveUserStats(userId: string, stats: UserStats): Promise<void> {
  const db = await loadDB();
  await saveDB({ ...db, [userId]: stats });
}

/**
 * Decrement remaining uses by 1 for a user. No-op if already 0.
 * Returns the new remaining count.
 */
export async function decrementUsesForUser(userId: string): Promise<number> {
  const stats = await loadUserStats(userId);
  if (stats.dailyUsesRemaining <= 0) return 0;
  const updated: UserStats = {
    ...stats,
    dailyUsesRemaining: stats.dailyUsesRemaining - 1,
  };
  await saveUserStats(userId, updated);
  return updated.dailyUsesRemaining;
}

/**
 * Record the first qualifying streak action for a user on today's date.
 * Idempotent — calling multiple times on the same day is a no-op.
 * Handles consecutive-day continuation and non-consecutive reset.
 * Returns the updated stats.
 */
export async function activateStreakForUser(userId: string): Promise<UserStats> {
  const stats = await loadUserStats(userId);
  const today = getLocalDayKey();

  // Already activated today — no-op.
  if (stats.hasSentTodayDate === today) return stats;

  // Was the previous activation yesterday? → streak continues.
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  })();

  const newStreak =
    stats.hasSentTodayDate === yesterday ? stats.currentStreak + 1 : 1;

  const updated: UserStats = {
    ...stats,
    currentStreak: newStreak,
    hasSentTodayDate: today,
  };
  await saveUserStats(userId, updated);
  return updated;
}
