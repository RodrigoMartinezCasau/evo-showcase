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
 *   - daily uses exhausted  → no-uses modal (exactly when the last use is consumed)
 *
 * Queue ordering (when multiple social animations fire on the same send):
 *   1. streak  →  2. rankUp  →  3. clanReveal
 *
 * Each plays fully (onComplete / onClose) before the next starts.
 * noUses is kept separate and defers behind any queued animation.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EvoAnimationWebView, ensureAnimationAssets, prewarmClanEntryHtml } from './EvoAnimationWebView';
import {
  isClanRevealSuppressed,
  setEntryAnimPlaying,
  suppressClanRevealAnimations,
} from '../../../mobile/lib/animationState';
import { useDebugStats } from '@evoconn/debug/DebugStatsContext';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useAuth } from '../../../mobile/lib/AuthContext';
import type { Rank } from '@evoconn/types';

const RANK_ORDER: Record<Rank, number> = { aprendiz: 0, maestro: 1, filosofo: 2 };
const ENTRY_SOCIAL_ANIM_COOLDOWN_MS = 8_000;

/**
 * Último rango anunciado por la animación de subida de rango, persistido por
 * usuario. Sin esto, al hidratar la clasificación al abrir la app `displayRank`
 * transiciona de `aprendiz` (estado inicial mientras `visibleClanId === null`)
 * a `maestro` / `filosofo` (estado real una vez cargado), lo que el detector
 * confundía con una subida y provocaba que la animación de rango se mostrara
 * en cada arranque (en vez de la de bienvenida).
 */
const LAST_ANNOUNCED_RANK_KEY = (uid: string) => `evo_last_announced_rank_v1_${uid}`;
async function readLastAnnouncedRank(uid: string): Promise<Rank | null> {
  try {
    const v = await AsyncStorage.getItem(LAST_ANNOUNCED_RANK_KEY(uid));
    if (v === 'aprendiz' || v === 'maestro' || v === 'filosofo') return v;
    return null;
  } catch {
    return null;
  }
}
async function writeLastAnnouncedRank(uid: string, rank: Rank): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_ANNOUNCED_RANK_KEY(uid), rank);
  } catch {
    /* noop */
  }
}

// ── Queue types ───────────────────────────────────────────────────────────────

type StreakAnim = {
  kind: 'streak';
  streakCount: number;
  prevStreakCount: number;
};
type RankUpAnim = {
  kind: 'rankUp';
  previous: string;
  current: string;
  percentage: number;
};
type ClanRevealAnim = {
  kind: 'clanReveal';
  clanId: string;
  previousClanId: string | null;
  isChange: boolean;
};

type QueuedAnimation = StreakAnim | RankUpAnim | ClanRevealAnim;

/** Lower number = higher priority = plays first. */
const ANIM_PRIORITY: Record<QueuedAnimation['kind'], number> = {
  streak: 0,
  rankUp: 1,
  clanReveal: 2,
};

// ── Module-level entry / no-uses triggers ─────────────────────────────────────

let _requestEntry: (() => void) | null = null;
let _entryQueued = false;

export function requestEntryAnimation() {
  suppressClanRevealAnimations(ENTRY_SOCIAL_ANIM_COOLDOWN_MS + 5_000);
  setEntryAnimPlaying(true);
  if (_requestEntry) {
    _requestEntry();
  } else {
    _entryQueued = true;
  }
}

let _requestNoUses: (() => void) | null = null;
let _noUsesQueued = false;

export function requestNoUsesAnimation() {
  queueMicrotask(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (_requestNoUses) _requestNoUses();
        else _noUsesQueued = true;
      });
    });
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppAnimationLayer() {
  const { streakDays, statsLoaded, streakTrigger, lostStreakPrompt, acknowledgeLostStreak } = useDebugStats();
  const router = useRouter();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const clanId = (activeClan ?? 'none') as string;
  const clanIdRef = useRef(clanId);
  clanIdRef.current = clanId;
  const classification = useClassification();
  const { session, loading: authLoading, fetching: authFetching } = useAuth();
  const userId = session?.user?.id ?? null;
  const profileSettled = !authLoading && !authFetching;

  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    ensureAnimationAssets()
      .then(() => {
        setAssetsReady(true);
        // Precalentar el HTML de entrada en background mientras auth/nav siguen
        // cargando, para que al abrir showEntry el WebView monte al instante.
        return prewarmClanEntryHtml();
      })
      .catch(() => setAssetsReady(true));
  }, []);

  // ── Entry animation ──────────────────────────────────────────────────────
  const [showEntry, setShowEntry] = useState(false);
  const pendingEntryRef = useRef(_entryQueued);
  const showEntryRef = useRef(false);
  const entryCooldownUntilRef = useRef(0);
  // True once the entry ("Sin clan" crown) animation has actually started this
  // session — gates the launch reveal so it can only fire AFTER the entry anim.
  const entryPlayedRef = useRef(false);

  useEffect(() => {
    showEntryRef.current = showEntry;
    setEntryAnimPlaying(showEntry);
    if (showEntry) entryPlayedRef.current = true;
  }, [showEntry]);

  // ── Social animation queue ───────────────────────────────────────────────
  //
  // queueRef holds pending items sorted by ANIM_PRIORITY.
  // activeAnim is what is currently on screen.
  // When an animation closes → advanceQueue() picks the next one.

  const queueRef = useRef<QueuedAnimation[]>([]);
  const [activeAnim, setActiveAnim] = useState<QueuedAnimation | null>(null);
  const activeAnimRef = useRef<QueuedAnimation | null>(null);
  const prevClanRef = useRef<string | undefined>(undefined);
  const clanSeededRef = useRef(false);
  const noneBaselineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advanceQueue = useCallback(() => {
    if (showEntryRef.current) return;
    const next = queueRef.current.shift() ?? null;
    activeAnimRef.current = next;
    setActiveAnim(next);
  }, []);

  const clearClanRevealFromQueue = useCallback(() => {
    queueRef.current = queueRef.current.filter((q) => q.kind !== 'clanReveal');
    if (activeAnimRef.current?.kind === 'clanReveal') {
      activeAnimRef.current = null;
      setActiveAnim(null);
    }
  }, []);

  const finishEntryAnimation = useCallback(() => {
    setShowEntry(false);
    if (Date.now() < entryCooldownUntilRef.current) {
      queueRef.current = queueRef.current.filter((q) => q.kind !== 'clanReveal');
    }
    if (!activeAnimRef.current && queueRef.current.length > 0) {
      advanceQueue();
    }
  }, [advanceQueue]);

  useEffect(() => {
    _requestEntry = () => {
      suppressClanRevealAnimations(ENTRY_SOCIAL_ANIM_COOLDOWN_MS + 5_000);
      clearClanRevealFromQueue();
      clanSeededRef.current = true;
      prevClanRef.current = clanIdRef.current;
      entryCooldownUntilRef.current = Date.now() + ENTRY_SOCIAL_ANIM_COOLDOWN_MS;
      if (assetsReady) setShowEntry(true);
      else pendingEntryRef.current = true;
    };
    return () => { _requestEntry = null; };
  }, [assetsReady, clearClanRevealFromQueue]);

  useEffect(() => {
    if (assetsReady && (pendingEntryRef.current || _entryQueued)) {
      pendingEntryRef.current = false;
      _entryQueued = false;
      suppressClanRevealAnimations(ENTRY_SOCIAL_ANIM_COOLDOWN_MS + 5_000);
      clearClanRevealFromQueue();
      clanSeededRef.current = true;
      prevClanRef.current = clanIdRef.current;
      entryCooldownUntilRef.current = Date.now() + ENTRY_SOCIAL_ANIM_COOLDOWN_MS;
      setShowEntry(true);
    }
  }, [assetsReady, clearClanRevealFromQueue]);

  useEffect(() => {
    if (!showEntry) return;
    const t = setTimeout(() => finishEntryAnimation(), 12000);
    return () => clearTimeout(t);
  }, [showEntry, finishEntryAnimation]);

  const enqueue = useCallback(
    (item: QueuedAnimation) => {
      // Deduplicate: skip if same kind is already queued or playing.
      const alreadyQueued = queueRef.current.some((q) => q.kind === item.kind);
      const alreadyPlaying = activeAnimRef.current?.kind === item.kind;
      if (alreadyQueued || alreadyPlaying) return;

      // Insert in priority order (stable sort: same priority → FIFO).
      const insertAt = queueRef.current.findIndex(
        (q) => ANIM_PRIORITY[q.kind] > ANIM_PRIORITY[item.kind],
      );
      if (insertAt === -1) {
        queueRef.current.push(item);
      } else {
        queueRef.current.splice(insertAt, 0, item);
      }

      // No iniciar cola social mientras corre la animación de entrada.
      if (!activeAnimRef.current && !showEntryRef.current) {
        advanceQueue();
      }
    },
    [advanceQueue],
  );

  // Pending no-uses: fires after the entire social queue drains.
  const pendingNoUsesAfterQueueRef = useRef(false);

  const handleAnimComplete = useCallback(() => {
    // If the queue is now empty and no-uses was deferred, show it.
    if (
      queueRef.current.length === 0 &&
      pendingNoUsesAfterQueueRef.current
    ) {
      pendingNoUsesAfterQueueRef.current = false;
      // Advance first (sets activeAnim = null), then show no-uses.
      activeAnimRef.current = null;
      setActiveAnim(null);
      setShowNoUses(true);
      return;
    }
    advanceQueue();
    // Safety net: si al cerrarse la animación social no hay ya otra activa
    // ni una de entrada en curso, asegurar que el flag global de "entry
    // playing" queda limpio. Sin esto, una rank-up que se hubiera mostrado
    // mientras `_isEntryPlaying = true` (puesto por requestEntryAnimation)
    // dejaba el starfield overlay colgado tras pulsar "Continuar" → pantalla
    // bloqueada hasta el failsafe de 14 s.
    if (!showEntryRef.current && queueRef.current.length === 0) {
      setEntryAnimPlaying(false);
    }
  }, [advanceQueue]);

  // Safety net: if a WebView never sends 'complete', auto-close after 90 s.
  useEffect(() => {
    if (!activeAnim) return;
    const t = setTimeout(() => handleAnimComplete(), 90_000);
    return () => clearTimeout(t);
  }, [activeAnim, handleAnimComplete]);

  // ── No daily uses left ───────────────────────────────────────────────────
  const [showNoUses, setShowNoUses] = useState(false);

  useEffect(() => {
    _requestNoUses = () => {
      if (!assetsReady) { _noUsesQueued = true; return; }
      if (showEntryRef.current) return;
      // Defer behind the social queue.
      if (activeAnimRef.current || queueRef.current.length > 0) {
        pendingNoUsesAfterQueueRef.current = true;
        return;
      }
      setShowNoUses(true);
    };
    return () => { _requestNoUses = null; };
  }, [assetsReady]);

  useEffect(() => {
    if (assetsReady && _noUsesQueued) {
      _noUsesQueued = false;
      _requestNoUses?.();
    }
  }, [assetsReady]);

  useEffect(() => {
    if (!showNoUses) return;
    const t = setTimeout(() => setShowNoUses(false), 120_000);
    return () => clearTimeout(t);
  }, [showNoUses]);

  // ── Lost-streak recovery prompt ──────────────────────────────────────────
  //
  // Aparece al abrir la app el día siguiente al día saltado (ventana 24 h),
  // solo si la racha perdida era >2 días. Se difiere detrás de la animación de
  // entrada y de la cola social, y se marca como reconocida en cuanto se muestra
  // para que no reaparezca. El botón "Publicar una frase" lleva al compositor:
  // al enviar la frase, DebugStatsContext restablece la racha y dispara la
  // animación de aumento de racha.
  const [lostStreakValue, setLostStreakValue] = useState<number | null>(null);
  const lostStreakShownRef = useRef(false);

  useEffect(() => {
    if (!assetsReady || lostStreakPrompt == null) return;
    if (showEntry || activeAnim || showNoUses) return;
    if (lostStreakShownRef.current) return;
    lostStreakShownRef.current = true;
    setLostStreakValue(lostStreakPrompt);
    acknowledgeLostStreak();
  }, [assetsReady, lostStreakPrompt, showEntry, activeAnim, showNoUses, acknowledgeLostStreak]);

  // ── Streak detection → enqueue ───────────────────────────────────────────
  const prevTriggerRef = useRef(0);

  useEffect(() => {
    if (!statsLoaded || streakTrigger === 0) return;
    if (streakTrigger === prevTriggerRef.current) return;
    prevTriggerRef.current = streakTrigger;
    if (!assetsReady || showEntryRef.current) return;
    enqueue({
      kind: 'streak',
      streakCount: streakDays,
      prevStreakCount: Math.max(0, streakDays - 1),
    });
  }, [streakTrigger, streakDays, statsLoaded, assetsReady, enqueue]);

  // ── Rank-up detection → enqueue ──────────────────────────────────────────
  //
  // SEEDING: la primera vez que tenemos un rango estable (assetsReady +
  // profileSettled + clanId real) hidratamos `prevRankRef` desde AsyncStorage
  // (último rango anunciado a este usuario). Si no hay valor persistido,
  // usamos el `displayRank` actual como baseline. De este modo la transición
  // de hidratación `aprendiz → maestro` que ocurre al abrir la app NO se
  // confunde con una subida real.
  //
  // FIRING: solo encolamos cuando `displayRank` supera estrictamente al
  // baseline. Tras encolar, persistimos el nuevo rango para que en el próximo
  // arranque no se vuelva a anunciar.
  const prevRankRef = useRef<Rank | null>(null);
  const rankSeededRef = useRef(false);
  const displayRank = classification.getDisplayRank();

  useEffect(() => {
    if (!assetsReady) return;
    if (!profileSettled) return;
    if (clanId === 'none') return;
    if (!userId) return;

    let cancelled = false;

    const run = async () => {
      // Seed la primera vez que tenemos contexto fiable.
      if (!rankSeededRef.current) {
        const stored = await readLastAnnouncedRank(userId);
        if (cancelled) return;
        prevRankRef.current = stored ?? displayRank;
        rankSeededRef.current = true;
        // Si nunca habíamos persistido nada, dejamos en disco el rango actual
        // como baseline para futuros arranques.
        if (stored === null) {
          void writeLastAnnouncedRank(userId, displayRank);
        }
        return;
      }

      const prev = prevRankRef.current;
      if (prev === null) return;
      if (RANK_ORDER[displayRank] <= RANK_ORDER[prev]) return;
      if (Date.now() < entryCooldownUntilRef.current) return;
      // No solapar con la animación de entrada.
      if (showEntryRef.current) return;

      const percentages = classification.getPercentages();
      const dominantPct = percentages.find((p) => p.clanId === clanId)?.pct ?? 0;
      prevRankRef.current = displayRank;
      void writeLastAnnouncedRank(userId, displayRank);
      enqueue({
        kind: 'rankUp',
        previous: prev,
        current: displayRank,
        percentage: Math.round(dominantPct),
      });
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [displayRank, clanId, assetsReady, profileSettled, userId, classification, enqueue]);

  // Reset del seed cuando cambia el usuario (logout / login otra cuenta) para
  // que el siguiente perfil hidrate su propio baseline desde storage.
  useEffect(() => {
    rankSeededRef.current = false;
    prevRankRef.current = null;
  }, [userId]);

  // ── Clan reveal detection → enqueue ─────────────────────────────────────
  //
  // IMPORTANT: at app launch with a clan already assigned, `clanId` typically
  // transitions: undefined → 'none' (while profile loads) → 'existencialista'.
  // The naive prev/next comparison would treat that as a brand-new reveal and
  // play the clan-reveal animation every time the user opens the app.
  //
  // Strategy:
  //   1. Wait until both `assetsReady` and the FIRST non-'none' clanId before
  //      seeding `prevClanRef`. This means we accept whatever clan the profile
  //      reports on first arrival as the baseline, with no reveal animation.
  //   2. Only after a real clan has been seen do we start enqueueing reveals
  //      on subsequent changes.
  useEffect(() => {
    if (!assetsReady) return;

    if (!profileSettled) {
      if (!clanSeededRef.current) return;
      return;
    }

    if (!clanSeededRef.current) {
      if (clanId !== 'none') {
        if (noneBaselineTimerRef.current) {
          clearTimeout(noneBaselineTimerRef.current);
          noneBaselineTimerRef.current = null;
        }
        clanSeededRef.current = true;
        prevClanRef.current = clanId;
        return;
      }
      if (noneBaselineTimerRef.current) return;
      noneBaselineTimerRef.current = setTimeout(() => {
        noneBaselineTimerRef.current = null;
        if (clanSeededRef.current) return;
        clanSeededRef.current = true;
        prevClanRef.current = clanIdRef.current;
      }, 700);
      return () => {
        if (noneBaselineTimerRef.current) {
          clearTimeout(noneBaselineTimerRef.current);
          noneBaselineTimerRef.current = null;
        }
      };
    }

    if (isClanRevealSuppressed()) return;

    const prev = prevClanRef.current;
    prevClanRef.current = clanId;
    if (prev === undefined) return;
    if (prev === clanId) return;
    if (clanId === 'none') return;
    if (showEntryRef.current) return;
    if (Date.now() < entryCooldownUntilRef.current) return;

    const wasNone = prev === 'none';
    enqueue({
      kind: 'clanReveal',
      clanId,
      previousClanId: wasNone ? null : prev,
      isChange: !wasNone,
    });
  }, [clanId, assetsReady, enqueue, profileSettled]);

  // ── Launch reveal (threshold migration) → enqueue after entry ─────────────
  //
  // ClassificationContext may detect, at launch, that the user's already-stored
  // totals now cross the reveal threshold (e.g. after lowering the clan-lead
  // margin). It holds that reveal back as `pendingLaunchReveal` instead of
  // mutating the visible clan, so the entry "Sin clan" crown plays untouched.
  //
  // Here we wait until the entry animation has played AND finished, then commit
  // the reveal into the classification state and enqueue the reveal animation.
  // We deliberately BYPASS the entry suppression/cooldown that normally blocks
  // launch reveals, because this reveal IS the intended launch behaviour. We
  // also seed prevClanRef so the generic change-detection effect (which fires
  // once the committed clan flips clanId) treats it as already-known and does
  // not double-enqueue.
  const pendingLaunchReveal = classification.pendingLaunchReveal;
  const commitLaunchReveal = classification.commitLaunchReveal;
  const launchRevealHandledRef = useRef(false);

  useEffect(() => {
    if (!assetsReady) return;
    if (!pendingLaunchReveal) return;
    if (launchRevealHandledRef.current) return;
    // Must come AFTER the entry crown: require it to have played and ended.
    // We intentionally ignore the entry suppression/cooldown here — this reveal
    // is the intended post-entry behaviour, not an incidental clan change.
    if (!entryPlayedRef.current) return;
    if (showEntry) return;

    launchRevealHandledRef.current = true;
    const reveal = pendingLaunchReveal;

    // Apply the clan to the visible state (and publish) as we reveal it.
    commitLaunchReveal();

    // Prevent the generic change-detection effect from re-enqueueing once the
    // committed clan changes `clanId`.
    clanSeededRef.current = true;
    prevClanRef.current = reveal.clanId;

    enqueue({
      kind: 'clanReveal',
      clanId: reveal.clanId,
      previousClanId: reveal.previousClanId,
      isChange: reveal.isChange,
    });
  }, [pendingLaunchReveal, commitLaunchReveal, showEntry, assetsReady, enqueue]);

  // ── Render ───────────────────────────────────────────────────────────────

  const isStreak = activeAnim?.kind === 'streak';
  const isRankUp = activeAnim?.kind === 'rankUp';
  const isClanReveal = activeAnim?.kind === 'clanReveal';

  return (
    <>
      {/* ── Entry animation (plays on every launch) ── */}
      {/* ── Entry animation (plays on every launch) ── */}
      <EvoAnimationWebView
        visible={showEntry}
        name="clanEntry"
        params={{ clanId }}
        onComplete={finishEntryAnimation}
        onClose={finishEntryAnimation}
      />

      {/* ── Streak animation ── */}
      <EvoAnimationWebView
        visible={isStreak}
        name="streak"
        params={{
          clanId,
          streakCount: isStreak ? (activeAnim as StreakAnim).streakCount : 0,
          previousStreakCount: isStreak ? (activeAnim as StreakAnim).prevStreakCount : 0,
        }}
        onComplete={handleAnimComplete}
        onClose={handleAnimComplete}
      />

      {/* ── Rank-up animation ── */}
      <EvoAnimationWebView
        visible={isRankUp}
        name="rankUp"
        params={{
          clanId,
          rank: isRankUp
            ? {
                previous: (activeAnim as RankUpAnim).previous,
                current: (activeAnim as RankUpAnim).current,
                percentage: (activeAnim as RankUpAnim).percentage,
              }
            : undefined,
        }}
        onComplete={handleAnimComplete}
        onClose={handleAnimComplete}
      />

      {/* ── Clan reveal / change animation ── */}
      <EvoAnimationWebView
        visible={isClanReveal}
        name="clanReveal"
        params={{
          clanId: isClanReveal ? (activeAnim as ClanRevealAnim).clanId : clanId,
          previousClanId: isClanReveal ? (activeAnim as ClanRevealAnim).previousClanId : null,
          isChange: isClanReveal ? (activeAnim as ClanRevealAnim).isChange : false,
        }}
        onComplete={handleAnimComplete}
        onClose={handleAnimComplete}
      />

      {/* ── Daily uses depleted ── */}
      <EvoAnimationWebView
        visible={showNoUses}
        name="noUses"
        params={{ clanId }}
        onComplete={() => setShowNoUses(false)}
        onClose={() => setShowNoUses(false)}
      />

      {/* ── Racha perdida (recuperable) ── */}
      <EvoAnimationWebView
        visible={lostStreakValue !== null}
        name="lostStreak"
        params={{ clanId, streakCount: lostStreakValue ?? 0 }}
        onComplete={() => {
          setLostStreakValue(null);
          router.push('/phrase');
        }}
        onClose={() => setLostStreakValue(null)}
      />
    </>
  );
}
