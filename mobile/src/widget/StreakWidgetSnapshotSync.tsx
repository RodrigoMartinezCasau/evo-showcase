import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { useDebugStats } from '@evoconn/debug/DebugStatsContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { buildStreakWidgetPayload } from './streakWidgetPayload';
import { pushStreakWidgetSnapshot } from './iosWidgetBridge';

const DEBOUNCE_MS = 300;

/**
 * Keeps the Android streak widget in sync with local stats and visible clan.
 */
export function StreakWidgetSnapshotSync() {
  const { streakDays, hasSentToday, statsLoaded } = useDebugStats();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushSnapshot = useCallback(() => {
    if (Platform.OS !== 'android' || !statsLoaded) return;
    const payload = buildStreakWidgetPayload({
      streakDays,
      hasSentToday,
      clanId: activeClan,
    });
    void pushStreakWidgetSnapshot(payload);
  }, [streakDays, hasSentToday, statsLoaded, activeClan]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(pushSnapshot, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pushSnapshot]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') pushSnapshot();
    });
    return () => sub.remove();
  }, [pushSnapshot]);

  return null;
}
