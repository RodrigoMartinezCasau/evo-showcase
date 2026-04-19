/**
 * DebugStreakContext — thin wrapper that exposes hasSentToday and
 * markStreakActivated from DebugStatsContext.
 *
 * The actual streak state (hasSentTodayDate, currentStreak) is now persisted
 * per-user in AsyncStorage via DebugStatsContext → userStatsStorage.
 * This context is kept only for API compatibility with screens that call
 * useDebugStreak() directly.
 *
 * DebugStreakProvider is a no-op pass-through — the provider tree structure
 * in _layout.tsx is preserved so nothing breaks.
 *
 * useDebugStreak() reads directly from useDebugStats() since all callers
 * are always mounted inside DebugStatsProvider.
 */
import React, { type ReactNode } from 'react';
import { useDebugStats } from './DebugStatsContext';

export const IS_DEBUG_STREAK_MODE: boolean = __DEV__;

/** Returns the user's current local calendar date as "YYYY-MM-DD". */
export function getLocalDayKey(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

type DebugStreakContextValue = {
  hasSentToday: boolean;
  markStreakActivated: () => void;
};

/** No-op provider — kept for layout compatibility. */
export function DebugStreakProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Returns the real per-user daily streak fire state, backed by AsyncStorage.
 * Must be called inside DebugStatsProvider (always true in this app).
 */
export function useDebugStreak(): DebugStreakContextValue {
  const { hasSentToday, markStreakActivated } = useDebugStats();
  return { hasSentToday, markStreakActivated };
}
