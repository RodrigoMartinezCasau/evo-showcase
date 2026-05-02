/**
 * AppAnimationLayer
 *
 * Global overlay rendered above the full Stack (in _layout.tsx).
 * Manages all app-level animation triggers via WebView.
 *
 * Triggers:
 *   - App launch            → clan-entry animation (every launch)
 *   - streakDays rises      → streak animation
 *   - clan assigned (first) → clan-reveal animation (isChange=false)
 *   - clan changes          → clan-reveal animation (isChange=true)
 *   - rank increases        → rank-up animation
 */

import React, { useEffect, useRef, useState } from 'react';
import { EvoAnimationWebView, ensureAnimationAssets } from './EvoAnimationWebView';
import { useDebugStats } from '@evoconn/debug/DebugStatsContext';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import type { Rank } from '@evoconn/types';

const RANK_ORDER: Record<Rank, number> = { aprendiz: 0, maestro: 1, filosofo: 2 };

// Module-level setter so login/signup screens can trigger the entry animation
// from outside the React tree without needing a shared context.
let _requestEntry: (() => void) | null = null;

export function requestEntryAnimation() {
  _requestEntry?.();
}

export default function AppAnimationLayer() {
  const { streakDays, statsLoaded } = useDebugStats();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const clanId = (activeClan ?? 'none') as string;
  const classification = useClassification();

  // Assets must be ready before we show any animation (avoids showing the spinner)
  const [assetsReady, setAssetsReady] = useState(false);
  // Entry animation: shown once assets are ready
  const [showEntry, setShowEntry] = useState(false);

  useEffect(() => {
    // Pre-load assets in the background. Entry animation is now handled by
    // ClanEntryAnimation (React Native) in (tabs)/_layout.tsx — no WebView delay.
    ensureAnimationAssets()
      .then(() => setAssetsReady(true))
      .catch(() => setAssetsReady(true));
  }, []);

  // Register the module-level trigger so login/signup screens can replay the
  // entry animation after a successful sign-in.
  useEffect(() => {
    _requestEntry = () => {
      if (assetsReady) setShowEntry(true);
    };
    return () => { _requestEntry = null; };
  }, [assetsReady]);

  // ── Streak animation ────────────────────────────────────────────────────
  const [showStreak, setShowStreak] = useState(false);
  const [streakCount, setStreakCount] = useState(1);
  const [prevStreakCount, setPrevStreakCount] = useState(0);
  const prevStreakRef = useRef<number | null>(null);

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

  // ── Clan reveal / change animation ──────────────────────────────────────
  const [showClanReveal, setShowClanReveal] = useState(false);
  const [clanRevealPreviousId, setClanRevealPreviousId] = useState<string | null>(null);
  const [isClanChange, setIsClanChange] = useState(false);
  // undefined = not yet initialized (skip first render)
  const prevClanRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!assetsReady) return;
    const prev = prevClanRef.current;
    prevClanRef.current = clanId;
    if (prev === undefined) return;
    if (prev === clanId) return;
    if (clanId === 'none') return;

    const wasNone = prev === 'none';
    setClanRevealPreviousId(wasNone ? null : prev);
    setIsClanChange(!wasNone);
    if (!showEntry) setShowClanReveal(true);
  }, [clanId, assetsReady, showEntry]);

  // ── Rank-up animation ───────────────────────────────────────────────────
  const [rankUpData, setRankUpData] = useState<{
    previous: string;
    current: string;
    percentage: number;
  } | null>(null);
  const prevRankRef = useRef<Rank | null>(null);

  const displayRank = classification.getDisplayRank();

  useEffect(() => {
    if (!assetsReady || clanId === 'none') return;
    const prev = prevRankRef.current;
    prevRankRef.current = displayRank;
    if (prev === null) return;
    if (RANK_ORDER[displayRank] <= RANK_ORDER[prev]) return;

    const percentages = classification.getPercentages();
    const dominantPct = percentages.find((p) => p.clanId === clanId)?.pct ?? 0;
    setRankUpData({
      previous: prev,
      current: displayRank,
      percentage: Math.round(dominantPct),
    });
  }, [displayRank, clanId, assetsReady, classification]);

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

      {/* ── Clan reveal / change animation ── */}
      <EvoAnimationWebView
        visible={showClanReveal}
        name="clanReveal"
        params={{
          clanId,
          previousClanId: clanRevealPreviousId,
          isChange: isClanChange,
        }}
        onComplete={() => setShowClanReveal(false)}
        onClose={() => setShowClanReveal(false)}
      />

      {/* ── Rank-up animation ── */}
      <EvoAnimationWebView
        visible={!!rankUpData}
        name="rankUp"
        params={{
          clanId,
          rank: rankUpData ?? undefined,
        }}
        onComplete={() => setRankUpData(null)}
        onClose={() => setRankUpData(null)}
      />
    </>
  );
}
