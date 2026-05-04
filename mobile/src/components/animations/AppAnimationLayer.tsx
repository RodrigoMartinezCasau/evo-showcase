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
import { setEntryAnimPlaying } from '../../../mobile/lib/animationState';
import { useDebugStats } from '@evoconn/debug/DebugStatsContext';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import type { Rank } from '@evoconn/types';

const RANK_ORDER: Record<Rank, number> = { aprendiz: 0, maestro: 1, filosofo: 2 };

// Module-level setter so login/signup screens can trigger the entry animation
// from outside the React tree without needing a shared context. We also keep
// a "queued" flag so a request fired BEFORE the layer mounts (e.g. during
// initial AuthGate routing) still plays once we are ready.
let _requestEntry: (() => void) | null = null;
let _entryQueued = false;

export function requestEntryAnimation() {
  // Signal the guard IMMEDIATELY (synchronous) in ALL code paths so that
  // React 18 can batch this with any pending state update in the same call
  // stack. This prevents (tabs)/_layout.tsx from ever rendering community
  // content before the animation modal has a chance to cover it.
  setEntryAnimPlaying(true);

  if (_requestEntry) {
    _requestEntry();
  } else {
    _entryQueued = true;
  }
}

export default function AppAnimationLayer() {
  const { streakDays, statsLoaded, streakTrigger } = useDebugStats();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const clanId = (activeClan ?? 'none') as string;
  const classification = useClassification();

  // Assets must be ready before we show any animation (avoids showing the spinner)
  const [assetsReady, setAssetsReady] = useState(false);
  // Entry animation: shown once assets are ready
  const [showEntry, setShowEntry] = useState(false);
  // If a request was queued before we mounted, remember it
  const pendingEntryRef = useRef(_entryQueued);

  useEffect(() => {
    ensureAnimationAssets()
      .then(() => setAssetsReady(true))
      .catch(() => setAssetsReady(true));
  }, []);

  // Register the module-level trigger so login/signup screens can replay the
  // entry animation after a successful sign-in.
  useEffect(() => {
    _requestEntry = () => {
      if (assetsReady) {
        setShowEntry(true);
      } else {
        // Assets still loading — queue and keep the guard signal active until
        // the drain effect fires (which will call setShowEntry(true) and
        // trigger the useEffect([showEntry]) → setEntryAnimPlaying(true) path).
        pendingEntryRef.current = true;
      }
    };
    return () => { _requestEntry = null; };
  }, [assetsReady]);

  // Drain queued request (from before mount, or before assets ready)
  useEffect(() => {
    if (assetsReady && (pendingEntryRef.current || _entryQueued)) {
      pendingEntryRef.current = false;
      _entryQueued = false;
      setShowEntry(true);
    }
  }, [assetsReady]);

  // Tell (tabs)/_layout.tsx to keep showing StarFieldBackground while the
  // entry animation is active (prevents community-screen flash before Modal mounts).
  useEffect(() => {
    setEntryAnimPlaying(showEntry);
  }, [showEntry]);

  // Safety net: if the WebView never sends 'complete' (JS error in HTML in
  // production), force-close after 12 s so the modal can never block the UI.
  useEffect(() => {
    if (!showEntry) return;
    const t = setTimeout(() => setShowEntry(false), 12000);
    return () => clearTimeout(t);
  }, [showEntry]);

  // ── Streak animation ────────────────────────────────────────────────────
  const [showStreak, setShowStreak] = useState(false);
  const [streakCount, setStreakCount] = useState(1);
  const [prevStreakCount, setPrevStreakCount] = useState(0);
  // Track the last trigger value we acted on (0 = none yet this session).
  const prevTriggerRef = useRef(0);

  useEffect(() => {
    // Only fire when markStreakActivated() was explicitly called this session
    // (streakTrigger > 0 and different from last handled trigger). This prevents
    // the animation from firing on app open or user-switch hydration.
    if (!statsLoaded || streakTrigger === 0) return;
    if (streakTrigger === prevTriggerRef.current) return;
    prevTriggerRef.current = streakTrigger;
    const prev = Math.max(0, streakDays - 1);
    setPrevStreakCount(prev);
    setStreakCount(streakDays);
    if (assetsReady && !showEntry) setShowStreak(true);
  }, [streakTrigger, streakDays, statsLoaded, showEntry, assetsReady]);

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
