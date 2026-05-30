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
  /**
   * Recuperación de racha: cuando una racha de >2 días se rompe (el usuario se
   * salta un día), guardamos aquí los días que tenía. El usuario puede
   * recuperarla publicando una frase el día SIGUIENTE al día saltado (la ventana
   * de 24 h). Pasada esa ventana ya no es recuperable. null = nada que recuperar.
   */
  streakLostValue: number | null;
  /**
   * Día (YYYY-MM-DD) en el que ya mostramos la animación de "racha perdida", para
   * no repetirla en cada render. Se compara contra hoy.
   */
  lostStreakAckDate: string | null;
};

/** Racha mínima (en días) que debe tener una racha para ser recuperable. */
const MIN_RECOVERABLE_STREAK = 2; // estrictamente "más de 2 días" → > 2

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

/**
 * Returns the calendar day immediately before the given YYYY-MM-DD key.
 * Uses noon to avoid DST edge-case bugs when subtracting 24 h.
 */
function getPrevDayKey(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Whole number of calendar days between two YYYY-MM-DD keys (to - from).
 * Uses noon to avoid DST edge cases.
 */
export function daysBetweenDayKeys(fromKey: string, toKey: string): number {
  const a = new Date(`${fromKey}T12:00:00`).getTime();
  const b = new Date(`${toKey}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Default stats for a brand-new user. */
export function defaultUserStats(): UserStats {
  return {
    currentStreak: 0,
    hasSentTodayDate: null,
    dailyUsesRemaining: DAILY_USES_LIMIT,
    lastUsesResetDate: getLocalDayKey(),
    streakLostValue: null,
    lostStreakAckDate: null,
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
 *
 * Besides resetting dailyUsesRemaining, this is also the right place to
 * break the streak: if the user's last activation was neither today nor
 * yesterday (relative to the new day), they missed at least one day and
 * their currentStreak resets to 0.
 *
 * The historical record (hasSentTodayDate) is intentionally preserved so
 * the calendar UI keeps showing past activity dots even after a reset.
 */
export function applyDailyRollover(stats: UserStats, today: string): UserStats {
  if (stats.lastUsesResetDate === today) return stats;

  const yesterday = getPrevDayKey(today);
  const streakAlive =
    stats.hasSentTodayDate === today ||
    stats.hasSentTodayDate === yesterday;

  // Si la racha se rompe y era recuperable (>2 días), guardamos su valor para
  // que el usuario pueda recuperarla publicando una frase. La ventana de 24 h
  // se valida en getStreakRecovery() a partir de hasSentTodayDate.
  let streakLostValue = stats.streakLostValue;
  if (!streakAlive && stats.currentStreak > MIN_RECOVERABLE_STREAK) {
    streakLostValue = stats.currentStreak;
  }

  return {
    ...stats,
    dailyUsesRemaining: DAILY_USES_LIMIT,
    lastUsesResetDate: today,
    currentStreak: streakAlive ? stats.currentStreak : 0,
    streakLostValue,
  };
}

/**
 * Checks—independently of whether a rollover is needed—whether a stored
 * streak should already be 0 because the user missed one or more days.
 *
 * This is called once on DB load so that stale streaks stored before the
 * rollover fix are corrected immediately, even when lastUsesResetDate is
 * already today (meaning the old rollover already ran without resetting
 * the streak).
 *
 * hasSentTodayDate is preserved so the calendar keeps its history dots.
 */
export function reconcileStreakOnLoad(stats: UserStats, today: string): UserStats {
  if (!stats.currentStreak) return stats; // already 0, nothing to do
  const yesterday = getPrevDayKey(today);
  const streakAlive =
    stats.hasSentTodayDate === today ||
    stats.hasSentTodayDate === yesterday;
  if (streakAlive) return stats;
  // La racha murió. Capturamos su valor para posible recuperación (si era >2).
  // IMPORTANTE: hacerlo aquí además del rollover, porque en arranque en frío
  // este reconcile pone currentStreak=0 antes de que corra applyDailyRollover.
  const streakLostValue =
    stats.currentStreak > MIN_RECOVERABLE_STREAK
      ? stats.currentStreak
      : stats.streakLostValue;
  return { ...stats, currentStreak: 0, streakLostValue };
}

// ─── Recuperación de racha ──────────────────────────────────────────────────

export type StreakRecovery = { eligible: boolean; lostValue: number };

/**
 * ¿Puede el usuario recuperar su racha perdida AHORA?
 *
 * Reglas (según el producto):
 *  - La racha perdida debe haber sido >2 días (streakLostValue presente).
 *  - Solo el día SIGUIENTE al día que se saltó. Como hasSentTodayDate guarda el
 *    último día activo (A), el día saltado es A+1 y la racha se rompe en A+2.
 *    La ventana de recuperación es exactamente A+2 (24 h). Es decir, hoy debe
 *    estar a 2 días del último día activo.
 *  - Pasado ese día (≥3 días), ya no aparece ni se puede recuperar.
 */
export function getStreakRecovery(stats: UserStats, today: string): StreakRecovery {
  const lastActive = stats.hasSentTodayDate;
  const lost = stats.streakLostValue ?? 0;
  if (!lastActive || lost <= MIN_RECOVERABLE_STREAK) {
    return { eligible: false, lostValue: 0 };
  }
  const days = daysBetweenDayKeys(lastActive, today);
  return { eligible: days === 2, lostValue: lost };
}

/**
 * Recupera la racha perdida: la restablece (días perdidos + el día de hoy) y
 * limpia el marcador de recuperación. Pensado para llamarse desde la activación
 * de racha cuando getStreakRecovery() es elegible.
 */
export function applyStreakRecovery(stats: UserStats): UserStats {
  const today = getLocalDayKey();
  const lost = stats.streakLostValue ?? 0;
  return {
    ...stats,
    currentStreak: lost + 1,
    hasSentTodayDate: today,
    streakLostValue: null,
    lostStreakAckDate: today,
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
    // Activación normal: ya no hay racha perdida pendiente de recuperar.
    streakLostValue: null,
  };
}

/** Pure decrement: subtracts one use, floored at zero. */
export function applyDecrementUses(stats: UserStats): UserStats {
  if (stats.dailyUsesRemaining <= 0) return stats;
  return { ...stats, dailyUsesRemaining: stats.dailyUsesRemaining - 1 };
}

/**
 * Fusiona stats locales con datos remotos (Supabase profiles + backend streak).
 * Toma el máximo de racha y preserva hasSentToday si el servidor indica actividad hoy.
 * No destruye datos locales más recientes.
 */
export function mergeStatsFromRemote(
  local: UserStats,
  remote: {
    streakDays?: number;
    remainingUses?: number;
    hasSentToday?: boolean;
    lastUsesResetDate?: string | null;
  },
  today: string,
): UserStats {
  const rolled = applyDailyRollover(local, today);
  let next = { ...rolled };

  if (typeof remote.streakDays === 'number') {
    next.currentStreak = Math.max(next.currentStreak, Math.max(0, remote.streakDays));
  }
  if (typeof remote.remainingUses === 'number') {
    next.dailyUsesRemaining = Math.min(
      DAILY_USES_LIMIT,
      Math.max(0, remote.remainingUses),
    );
  }
  if (remote.hasSentToday) {
    next.hasSentTodayDate = today;
  }
  if (remote.lastUsesResetDate) {
    next.lastUsesResetDate = remote.lastUsesResetDate;
  }

  return next;
}
