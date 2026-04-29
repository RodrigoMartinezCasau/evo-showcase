/**
 * AppAnimationLayer
 *
 * Global overlay rendered above the full Stack (in _layout.tsx).
 * Manages all app-level animation triggers via WebView.
 *
 * Triggers:
 *   - App launch       → clan-entry animation (every launch, with user's actual clan)
 *   - streakDays rises → streak animation
 */

import React, { useEffect, useRef, useState } from 'react';
import { EvoAnimationWebView, ensureAnimationAssets } from './EvoAnimationWebView';
import { useDebugStats } from '@evoconn/debug/DebugStatsContext';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';

export default function AppAnimationLayer() {
  const { streakDays, statsLoaded } = useDebugStats();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const clanId = (activeClan ?? 'none') as string;

  // Assets must be ready before we show any animation (avoids showing the spinner)
  const [assetsReady, setAssetsReady] = useState(false);
  // Entry animation: shown once assets are ready
  const [showEntry, setShowEntry] = useState(false);

  useEffect(() => {
    ensureAnimationAssets()
      .then(() => {
        setAssetsReady(true);
        setShowEntry(true);
      })
      .catch(() => {
        // If copy fails, skip entry animation gracefully
        setAssetsReady(true);
      });
  }, []);

  // Streak animation
  const [showStreak, setShowStreak] = useState(false);
  const [streakCount, setStreakCount] = useState(1);
  const [prevStreakCount, setPrevStreakCount] = useState(0);

  const prevStreakRef = useRef<number | null>(null);

  // ── Streak trigger ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!statsLoaded) return;
    const prev = prevStreakRef.current;
    if (prev === null) { prevStreakRef.current = streakDays; return; }
    if (streakDays > prev) {
      setPrevStreakCount(prev);
      setStreakCount(streakDays);
      if (assetsReady && !showEntry) setShowStreak(true);
    }
    prevStreakRef.current = streakDays;
  }, [streakDays, statsLoaded, showEntry, assetsReady]);

  return (
    <>
      {/* ── Entry animation (plays on every launch) ── */}
      <EvoAnimationWebView
        visible={showEntry}
        name="clanEntry"
        params={{ clanId }}
        onComplete={() => setShowEntry(false)}
        onClose={() => setShowEntry(false)}
      />

      {/* ── Streak animation ── */}
      <EvoAnimationWebView
        visible={showStreak}
        name="streak"
        params={{
          clanId,
          streakCount,
          previousStreakCount: prevStreakCount,
        }}
        onComplete={() => setShowStreak(false)}
        onClose={() => setShowStreak(false)}
      />
    </>
  );
}
