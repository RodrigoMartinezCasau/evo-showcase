/**
 * ClassificationContext
 *
 * Real per-user philosophical-clan classification engine.
 * Wraps clanClassifier + classificationStorage and exposes:
 *
 *   - recordInput(text, type)           → analyse, accumulate, persist
 *   - getPercentages(userId)            → ClanPct[] for the philosophy panel
 *   - getVisibleClanId(userId)          → 'Sin clan' (null) until reveal rules pass
 *   - getReflectionCount(userId)        → reflections sent
 *   - getPhraseCount(userId)            → phrases (quotes) sent
 *
 * Rules (from spec):
 *   - every reflection/phrase is scored against the 8 clans
 *   - scores accumulate per user, percentages always sum to 100%
 *   - all users start visibly as "Sin clan"
 *   - clan is revealed only when ALL of:
 *       totalReflectionsSent >= REVEAL_MIN_REFLECTIONS (3)
 *       totalPhrasesSent >= REVEAL_MIN_PHRASES (5)
 *       (totalReflectionsSent + totalPhrasesSent) >= REVEAL_TOTAL_INPUTS_THRESHOLD (8)
 *       AND the top clan has ≥ REVEAL_PCT_THRESHOLD (22%)
 *       AND leads the runner-up by ≥ REVEAL_LEAD_OVER_SECOND_PP (3 pp)
 *   - phrases use the same hybrid scoring (semantic + ML + Claude) as reflections
 *   - after reveal, new inputs are dampened (POST_REVEAL_WEIGHT)
 *   - clan switches use the same clarity rule: new #1 must be ≥ REVEAL_PCT_THRESHOLD
 *     (22%) and ≥ REVEAL_LEAD_OVER_SECOND_PP (3 pp) ahead of #2 (not “vs previous
 *     visible clan”).
 *   - rank badges do not downgrade inside the same clan once Maestro/Filósofo
 *     has been reached; a clan switch resets the badge path for the new clan.
 *   - after 7 inactive days (no reflection or phrase), the visible badge is
 *     temporarily Aprendiz until the user sends a new input.
 *
 * Persistence: all of the above survives reload and user switch via
 * `classificationStorage` (single AsyncStorage key, keyed by userId).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ALL_CLAN_IDS,
  CLAN_LABELS,
  classifyText,
  classifyTextHybrid,
  totalsToPercentages,
  type ClanScoreId,
  type ClanScores,
  type InputType,
} from '@evoconn/services/clanClassifier';
import { useSimulation } from './SimulationContext';
import {
  healState,
  loadClassificationDb,
  saveClassificationDb,
  makeEmptyUserState,
  trimInputs,
  type ClassificationDatabase,
  type UserClassificationState,
} from '@evoconn/services/classificationStorage';
import {
  fetchPublishedClassification,
  pushClassificationSnapshot,
} from '@evoconn/services/classificationSync';
import { useAuth } from '../../mobile/lib/AuthContext';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import { getDefaultApiUrl, mergeApiHeaders } from '@evoconn/services/apiRuntimeConfig';
import { getRankFromPct } from '@evoconn/utils/getRankFromPct';
import type { Rank } from '@evoconn/types';

// ─── Backend URL helper ──────────────────────────────────────────────────────

function _getApiBaseUrl(): string {
  return getDefaultApiUrl();
}

/**
 * Fetch Claude-layer scores from the backend.
 * Resolves to null on any error (network, timeout, bad response) so the caller
 * can fall back to the H+S+ML blend transparently.
 */
async function _fetchClaudeScores(text: string): Promise<ClanScores | null> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 5000);
  try {
    // Same backend scorer for reflection and phrase text (`texto` is generic clan scoring).
    const res = await fetch(`${_getApiBaseUrl()}/classify/reflection`, {
      method: 'POST',
      headers: mergeApiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ texto: text }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { claude_scores?: ClanScores };
    const scores = data.claude_scores;
    if (!scores) return null;
    // Sanity-check: all 8 clans present with numeric values
    const valid = ALL_CLAN_IDS.every((c) => typeof scores[c] === 'number');
    return valid ? scores : null;
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

// ─── Tunable rules ──────────────────────────────────────────────────────────

/** Minimum reflections before any clan can be revealed. */
export const REVEAL_MIN_REFLECTIONS = 3;

/** Minimum phrases (quotes) before any clan can be revealed. */
export const REVEAL_MIN_PHRASES = 5;

/** Reflections + phrases must reach this total for reveal (with the mins above).
 *  Igual a la suma de los mínimos (3 + 5) para que ambos mínimos sean el único
 *  límite y no haya un tercer gate combinado más alto que los bloquee. */
export const REVEAL_TOTAL_INPUTS_THRESHOLD = 8;

/** Minimum percentage for the leading clan (reveal + switch). */
export const REVEAL_PCT_THRESHOLD = 22;

/** Leader must lead the second-place clan by at least this many percentage points.
 *  Aplica TANTO al primer revelado como al cambio de clan (un clan solo
 *  desplaza al actual si supera al 2.º por este margen). */
export const REVEAL_LEAD_OVER_SECOND_PP = 3;

/** Score weight for a new input BEFORE the user has a revealed clan. */
const PRE_REVEAL_WEIGHT = 1.0;

/** Score weight for a new input AFTER the user has a revealed clan
 *  (introduces the inertia required by spec PART 15). */
const POST_REVEAL_WEIGHT = 0.35;

/** @deprecated Alias of REVEAL_LEAD_OVER_SECOND_PP (switch uses lead over 2nd, not vs previous). */
export const SWITCH_MARGIN = REVEAL_LEAD_OVER_SECOND_PP;

/** Inactive users temporarily show Aprendiz until they send a new input again. */
const INACTIVITY_RANK_DOWNGRADE_DAYS = 7;
const INACTIVITY_RANK_DOWNGRADE_MS = INACTIVITY_RANK_DOWNGRADE_DAYS * 24 * 60 * 60 * 1000;

// ── Momentum constants ────────────────────────────────────────────────────────

/** Momentum activates from this input number onwards (1-indexed). */
const MOMENTUM_START_INPUT = 15;
/** Fraction of the relative trend applied as boost (0.3 = up to ±30%). */
const MOMENTUM_STRENGTH = 0.3;
/** Minimum and maximum boost multiplier to prevent runaway amplification. */
const MOMENTUM_MIN = 0.7;
const MOMENTUM_MAX = 1.5;

// ── Post-reveal inertia multipliers (applied on top of POST_REVEAL_WEIGHT) ───
/** Revealed clan is top-1 in current input → reinforce. */
const INERTIA_TOP1  = 1.2;
/** Revealed clan is top-2 or top-3 → neutral-positive. */
const INERTIA_TOP23 = 0.8;
/** Revealed clan not in top-3 → very hard to displace. */
const INERTIA_OUT   = 0.3;

// ─── Public types ───────────────────────────────────────────────────────────

export type ClanPct = { clanId: string; label: string; pct: number };

/**
 * A clan reveal/switch that became true at app launch (because the user's
 * already-accumulated totals now cross the reveal threshold) but has NOT been
 * committed to the visible state yet. It is held back so the launch sequence
 * can play the entry "Sin clan" animation first and only THEN reveal the clan.
 */
export type PendingLaunchReveal = {
  clanId: ClanScoreId;
  previousClanId: ClanScoreId | null;
  isChange: boolean;
};

export type ClassificationContextValue = {
  /** True until the initial AsyncStorage load resolves. */
  loading: boolean;

  /** Record an input the user just sent to the AI. Returns the resulting state. */
  recordInput: (text: string, type: InputType, inputId?: string) => Promise<void>;

  /** Percentages array for the philosophy panel. Defaults to active user. */
  getPercentages: (userId?: string) => ClanPct[];

  /** Visible clan ID (null = "Sin clan"). Defaults to active user. */
  getVisibleClanId: (userId?: string) => ClanScoreId | null;

  /** Total reflections sent by a user. Defaults to active user. */
  getReflectionCount: (userId?: string) => number;

  /** Total phrases (quotes) sent by a user. Defaults to active user. */
  getPhraseCount: (userId?: string) => number;

  /** Highest rank ever reached per clan. Defaults to active user. */
  getClanRankHistory: (userId?: string) => Partial<Record<ClanScoreId, Rank>>;

  /** Official rank badge to show for a user, including history + inactivity. */
  getDisplayRank: (userId?: string) => Rank;

  /** Raw state for debugging / advanced screens. */
  getUserState: (userId?: string) => UserClassificationState;

  /**
   * Force-publish the given (or active) user's current local state to
   * Supabase right now. Used by EffectiveClanSync as a retry safety net
   * when an earlier inline push failed.
   */
  publishNow: (userId?: string) => Promise<void>;

  /** True if a Supabase publish for this user failed and is pending retry. */
  isDirty: (userId?: string) => boolean;

  /**
   * A reveal/switch detected at launch from already-stored totals, deliberately
   * NOT yet applied to the visible state. null when there is nothing pending.
   * The animation layer reads this to play the reveal AFTER the entry anim.
   */
  pendingLaunchReveal: PendingLaunchReveal | null;

  /**
   * Commit the pending launch reveal into the visible state (and publish to
   * Supabase). Idempotent: a no-op when there is nothing pending. Called by the
   * animation layer right before it plays the reveal animation.
   */
  commitLaunchReveal: () => void;
};

const ClassificationContext = createContext<ClassificationContextValue | null>(null);

// ─── Pure helpers ───────────────────────────────────────────────────────────

function applyScoresToTotals(totals: ClanScores, scores: ClanScores, weight: number): ClanScores {
  const next: ClanScores = { ...totals };
  for (const c of ALL_CLAN_IDS) {
    next[c] = totals[c] + scores[c] * weight;
  }
  return next;
}

/** Accumulate using a per-clan weight map (momentum + inertia path). */
function applyScoresWithPerClanWeights(
  totals: ClanScores,
  scores: ClanScores,
  weights: Record<ClanScoreId, number>,
): ClanScores {
  const next: ClanScores = { ...totals };
  for (const c of ALL_CLAN_IDS) {
    next[c] = totals[c] + scores[c] * weights[c];
  }
  return next;
}

/**
 * Computes a per-clan momentum boost from recent vs historical score trends.
 *
 * Returns all 1.0 when there are fewer than MOMENTUM_START_INPUT − 1 historical
 * inputs (i.e. we are processing inputs 1–14; boost activates at input 15).
 *
 * Formula per clan:
 *   boost = clamp(
 *     1 + (mean_last5 − mean_all) / (mean_all + 0.001) × MOMENTUM_STRENGTH,
 *     MOMENTUM_MIN, MOMENTUM_MAX
 *   )
 *
 * `clanScores` stored in each input record are the original (pre-boost)
 * hybrid scores, so the mean calculation stays free of compounding.
 */
function computeMomentumBoosts(
  inputs: UserClassificationState['inputs'],
): Record<ClanScoreId, number> {
  const boosts = {} as Record<ClanScoreId, number>;

  if (inputs.length < MOMENTUM_START_INPUT - 1) {
    for (const c of ALL_CLAN_IDS) boosts[c] = 1.0;
    return boosts;
  }

  const last5 = inputs.slice(-5);
  const n = inputs.length;

  for (const c of ALL_CLAN_IDS) {
    const histMean  = inputs.reduce((sum, inp) => sum + (inp.clanScores[c] ?? 0), 0) / n;
    const recentMean = last5.reduce((sum, inp) => sum + (inp.clanScores[c] ?? 0), 0) / last5.length;
    const raw = 1 + ((recentMean - histMean) / (histMean + 0.001)) * MOMENTUM_STRENGTH;
    boosts[c] = Math.min(MOMENTUM_MAX, Math.max(MOMENTUM_MIN, raw));
  }

  return boosts;
}

function pickTopTwo(pcts: Record<ClanScoreId, number>): {
  first: { id: ClanScoreId; pct: number };
  second: { id: ClanScoreId; pct: number };
} {
  const sorted = ([...ALL_CLAN_IDS] as ClanScoreId[])
    .map((id) => ({ id, pct: pcts[id] }))
    .sort((a, b) => b.pct - a.pct);
  return { first: sorted[0], second: sorted[1] };
}

const RANK_VALUE: Record<Rank, number> = {
  aprendiz: 1,
  maestro: 2,
  filosofo: 3,
};

function mergeClanRankRecord(
  history: Partial<Record<ClanScoreId, Rank>>,
  clanId: ClanScoreId | null,
  rank: Rank | null,
): Partial<Record<ClanScoreId, Rank>> {
  if (!clanId || !rank) return history;
  const previous = history[clanId];
  if (previous && RANK_VALUE[previous] >= RANK_VALUE[rank]) return history;
  return { ...history, [clanId]: rank };
}

function setClanRankRecord(
  history: Partial<Record<ClanScoreId, Rank>>,
  clanId: ClanScoreId,
  rank: Rank,
): Partial<Record<ClanScoreId, Rank>> {
  return { ...history, [clanId]: rank };
}

function isTemporarilyInactive(state: UserClassificationState, nowMs = Date.now()): boolean {
  if (!state.lastActivityAt) return false;
  const lastMs = Date.parse(state.lastActivityAt);
  if (!Number.isFinite(lastMs)) return false;
  return nowMs - lastMs >= INACTIVITY_RANK_DOWNGRADE_MS;
}

function getPersistentRankForState(state: UserClassificationState): Rank {
  if (!state.visibleClanId) return 'aprendiz';
  const pcts = totalsToPercentages(state.totals);
  const percentageRank = getRankFromPct(pcts[state.visibleClanId] ?? 0);
  const savedRank = state.clanRankHistory?.[state.visibleClanId];
  return savedRank ?? percentageRank;
}

function getDisplayRankForState(state: UserClassificationState): Rank {
  if (!state.visibleClanId) return 'aprendiz';
  if (isTemporarilyInactive(state)) return 'aprendiz';
  return getPersistentRankForState(state);
}

/**
 * Apply spec PART 10–14 reveal/switch rules to derive the new visible clan.
 *
 * Returns:
 *   { visibleClanId, revealedAt, lastSwitchAt } — possibly unchanged.
 */
function deriveVisibleClan(
  prev: UserClassificationState,
  newTotals: ClanScores,
  totalReflectionsSent: number,
  totalPhrasesSent: number,
  nowIso: string,
): {
  visibleClanId: ClanScoreId | null;
  revealedAt: string | null;
  lastSwitchAt: string | null;
} {
  const pcts = totalsToPercentages(newTotals);
  const { first: top, second: runnerUp } = pickTopTwo(pcts);

  const totalInputs = totalReflectionsSent + totalPhrasesSent;
  const meetsCount =
    totalReflectionsSent >= REVEAL_MIN_REFLECTIONS &&
    totalPhrasesSent >= REVEAL_MIN_PHRASES &&
    totalInputs >= REVEAL_TOTAL_INPUTS_THRESHOLD;
  const meetsTopPct = top.pct >= REVEAL_PCT_THRESHOLD;
  const meetsLeadOverSecond = top.pct - runnerUp.pct >= REVEAL_LEAD_OVER_SECOND_PP;

  // Not yet revealed.
  if (prev.visibleClanId == null) {
    if (meetsCount && meetsTopPct && meetsLeadOverSecond) {
      return {
        visibleClanId: top.id,
        revealedAt: nowIso,
        lastSwitchAt: null,
      };
    }
    return {
      visibleClanId: null,
      revealedAt: null,
      lastSwitchAt: null,
    };
  }

  // Already revealed → switch only if a new #1 is clear vs #2 (same rule as first reveal).
  const topIsDifferent = top.id !== prev.visibleClanId;

  if (topIsDifferent && meetsTopPct && meetsLeadOverSecond) {
    return {
      visibleClanId: top.id,
      revealedAt: prev.revealedAt,
      lastSwitchAt: nowIso,
    };
  }

  return {
    visibleClanId: prev.visibleClanId,
    revealedAt: prev.revealedAt,
    lastSwitchAt: prev.lastSwitchAt,
  };
}

/**
 * True cuando un estado local no tiene NADA que mostrar: ni clan revelado,
 * ni reflexiones/frases, ni masa de totales. Un registro así (o su ausencia)
 * debe poder restaurarse desde el respaldo público de Supabase.
 */
/**
 * True cuando el estado local NO tiene un clan revelado (falta el registro o
 * su `visibleClanId` es null). Es la señal para intentar restaurar desde
 * Supabase: si allí hay un clan publicado, el perfil personal debe mostrarlo.
 */
function hasNoRevealedClan(s: UserClassificationState | undefined): boolean {
  return !s || s.visibleClanId == null;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ClassificationProvider({ children }: { children: ReactNode }) {
  const sim = useSimulation();
  const activeUserId = sim.activeUserId;
  const { profile } = useAuth();

  const [db, setDb] = useState<ClassificationDatabase>({});
  const [loading, setLoading] = useState(true);

  // Hydration guard — avoid clobbering disk before initial load resolves.
  const hydratedRef = useRef(false);
  // Track which real users we've already attempted to hydrate from Supabase,
  // so a "first launch after reinstall" only fetches once per user.
  const hydratedFromSupabaseRef = useRef<Set<string>>(new Set());
  // Real user IDs whose latest local state failed to publish to Supabase.
  // EffectiveClanSync drains this set on every render as a retry safety net.
  const dirtyUsersRef = useRef<Set<string>>(new Set());

  // ── Launch-time reveal (threshold migration) ───────────────────────────────
  // A reveal/switch that became true from already-stored totals at launch, held
  // back until the entry animation finishes. `pendingLaunchReveal` is the public
  // payload the animation layer watches; the precomputed next state to commit is
  // kept in a ref so the commit is a cheap, deterministic write.
  const [pendingLaunchReveal, setPendingLaunchReveal] = useState<PendingLaunchReveal | null>(null);
  const pendingLaunchStateRef = useRef<{
    userId: string;
    state: UserClassificationState;
    rank: Rank;
  } | null>(null);
  // Users we have already evaluated for a launch reveal (once per session).
  const launchRecalcDoneRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadClassificationDb();
      if (cancelled) return;
      setDb(loaded);
      hydratedRef.current = true;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist whenever db changes (after hydration).
  useEffect(() => {
    if (!hydratedRef.current) return;
    void saveClassificationDb(db);
  }, [db]);

  // ── Cross-device recovery ──────────────────────────────────────────────────
  // After local load, if the authenticated REAL user has no local record (e.g.
  // fresh install or AsyncStorage wiped), pull their last published snapshot
  // from Supabase and seed the local store. Idempotent — only the first
  // successful hydration per (userId) takes effect.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const uid = profile?.id;
    if (!uid || !isRealUserId(uid)) return;
    // Restaurar desde Supabase cuando el local NO TIENE CLAN REVELADO. Esto
    // cubre tres casos que antes fallaban y dejaban el PERFIL PERSONAL (que lee
    // del store local) en "Sin clan"/0% aunque Supabase tuviera la distribución:
    //   1. No existe registro local (instalación nueva / AsyncStorage borrado).
    //   2. Registro local totalmente vacío.
    //   3. Registro local con datos parciales pero visibleClanId == null
    //      (build nuevo con storage propio, hidratación a medias, etc.).
    // El perfil ajeno no se veía afectado porque lee directo de
    // `profiles.clan_percentages`.
    if (!hasNoRevealedClan(db[uid])) return;
    if (hydratedFromSupabaseRef.current.has(uid)) return;
    hydratedFromSupabaseRef.current.add(uid);

    let cancelled = false;
    void (async () => {
      const snapshot = await fetchPublishedClassification(uid);
      if (cancelled || !snapshot) return;
      // Solo restauramos si Supabase trae un clan REVELADO de verdad. Si allí
      // tampoco hay clan, respetamos el local (p. ej. usuario aún "Sin clan"
      // acumulando reflexiones sin haber cruzado el umbral).
      if (snapshot.state.visibleClanId == null) return;
      setDb((prev) =>
        // Race guard: si entretanto el local ya reveló un clan (p. ej. el
        // usuario acaba de reflexionar y cruzó el umbral), respetamos ese.
        hasNoRevealedClan(prev[uid])
          ? { ...prev, [uid]: snapshot.state }
          : prev,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, db]);

  // ── Launch-time reveal recalculation ───────────────────────────────────────
  // Reveal rules are normally only evaluated when a new input is recorded. That
  // means a threshold change (e.g. lowering REVEAL_LEAD_OVER_SECOND_PP) does NOT
  // retroactively reveal a clan for users who already crossed it — they'd only
  // see it on their next reflection/phrase.
  //
  // To roll the new threshold out "on app open", we re-run deriveVisibleClan
  // against the user's CURRENT stored totals once per session. If it would
  // reveal a new clan (or switch to one), we DO NOT mutate the visible state
  // yet — we stash it as `pendingLaunchReveal`. The animation layer plays the
  // entry "Sin clan" crown first and then calls commitLaunchReveal() to apply
  // it together with the reveal animation.
  //
  // deriveVisibleClan is deterministic on unchanged totals, so this is
  // idempotent: a user who already revealed/switched on their last input yields
  // "no change" and nothing pending. In practice it only fires for the one-time
  // migration of users whose totals already crossed the new (looser) threshold.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const uid = profile?.id;
    if (!uid || !isRealUserId(uid)) return;
    if (launchRecalcDoneRef.current.has(uid)) return;

    const state = db[uid];
    // Wait until this user's state has actually been loaded/restored.
    if (!state) return;

    const nowIso = new Date().toISOString();
    const reveal = deriveVisibleClan(
      state,
      state.totals,
      state.totalReflectionsSent,
      state.totalPhrasesSent,
      nowIso,
    );

    // Mark evaluated for this session regardless of outcome.
    launchRecalcDoneRef.current.add(uid);

    // No new reveal/switch from current totals → nothing to animate.
    if (reveal.visibleClanId == null || reveal.visibleClanId === state.visibleClanId) {
      return;
    }

    const isChange = state.visibleClanId != null;
    const pcts = totalsToPercentages(state.totals);
    const achievedRank = getRankFromPct(pcts[reveal.visibleClanId] ?? 0);
    const clanRankHistory = isChange
      ? setClanRankRecord(state.clanRankHistory ?? {}, reveal.visibleClanId, 'aprendiz')
      : mergeClanRankRecord(state.clanRankHistory ?? {}, reveal.visibleClanId, achievedRank);

    const nextState: UserClassificationState = {
      ...state,
      visibleClanId: reveal.visibleClanId,
      revealedAt: reveal.revealedAt,
      lastSwitchAt: reveal.lastSwitchAt,
      clanRankHistory,
    };

    pendingLaunchStateRef.current = {
      userId: uid,
      state: nextState,
      rank: getDisplayRankForState(nextState),
    };
    setPendingLaunchReveal({
      clanId: reveal.visibleClanId,
      previousClanId: state.visibleClanId,
      isChange,
    });
  }, [db, profile?.id]);

  const commitLaunchReveal = useCallback(() => {
    const pending = pendingLaunchStateRef.current;
    if (!pending) return;
    pendingLaunchStateRef.current = null;
    setPendingLaunchReveal(null);

    setDb((prev) => ({ ...prev, [pending.userId]: pending.state }));

    if (isRealUserId(pending.userId)) {
      void (async () => {
        try {
          await pushClassificationSnapshot(pending.userId, pending.state, pending.rank);
          dirtyUsersRef.current.delete(pending.userId);
        } catch {
          dirtyUsersRef.current.add(pending.userId);
        }
      })();
    }
  }, []);

  // ── Helpers that read state ───────────────────────────────────────────
  const getUserStateInternal = useCallback(
    (userId?: string): UserClassificationState => {
      const id = userId ?? activeUserId;
      return db[id] ?? makeEmptyUserState();
    },
    [db, activeUserId],
  );

  const getPercentages = useCallback(
    (userId?: string): ClanPct[] => {
      const state = getUserStateInternal(userId);
      const pcts = totalsToPercentages(state.totals);
      // Drop zero entries from the panel, sort descending — the panel
      // does its own sort but this also keeps the array compact.
      const list: ClanPct[] = ALL_CLAN_IDS
        .map((c) => ({ clanId: c, label: CLAN_LABELS[c], pct: pcts[c] }))
        .filter((e) => e.pct > 0)
        .sort((a, b) => b.pct - a.pct);
      return list;
    },
    [getUserStateInternal],
  );

  const getVisibleClanId = useCallback(
    (userId?: string): ClanScoreId | null => {
      return getUserStateInternal(userId).visibleClanId;
    },
    [getUserStateInternal],
  );

  const getReflectionCount = useCallback(
    (userId?: string): number => {
      return getUserStateInternal(userId).totalReflectionsSent;
    },
    [getUserStateInternal],
  );

  const getPhraseCount = useCallback(
    (userId?: string): number => {
      return getUserStateInternal(userId).totalPhrasesSent;
    },
    [getUserStateInternal],
  );

  const getClanRankHistory = useCallback(
    (userId?: string): Partial<Record<ClanScoreId, Rank>> => {
      const state = getUserStateInternal(userId);
      return state.clanRankHistory ?? {};
    },
    [getUserStateInternal],
  );

  const getDisplayRank = useCallback(
    (userId?: string): Rank => {
      return getDisplayRankForState(getUserStateInternal(userId));
    },
    [getUserStateInternal],
  );

  // ── Action: record a new input ────────────────────────────────────────
  //
  // Sync model: AsyncStorage is a local cache; Supabase is the public
  // source of truth. Every recordInput call publishes the new snapshot
  // to Supabase **immediately** (no debounce). Because callers invoke
  // this with `void` (fire-and-forget) from the reflection / phrase flow,
  // the extra network round-trip never delays the user-visible answer.
  //
  // If the push fails (offline, RLS, transient error) we mark the user's
  // local state as dirty so EffectiveClanSync picks it up later as a
  // retry safety net.
  const recordInput = useCallback(
    async (text: string, type: InputType, inputId?: string): Promise<void> => {
      const userId = activeUserId;
      if (!text || !text.trim()) return;

      // ── Claude layer (backend call, non-blocking) ───────────────────────
      // Fetched first so classifyTextHybrid can include it in the 4-signal blend.
      // Returns null on offline / API error — the hybrid falls back to H+S+ML.
      const claudeScores = await _fetchClaudeScores(text).catch(() => null);

      // ── Hybrid scoring (heuristic + semantic + ML + Claude) ─────────────
      // Hybrid internally falls back to pure heuristic if the semantic layer
      // fails — but we also wrap the call in try/catch as a defence-in-depth
      // measure so a recordInput() call can NEVER throw and abort the user's
      // reflection flow.
      let scores: ClanScores;
      try {
        scores = await classifyTextHybrid(text, type, claudeScores ?? undefined);
      } catch {
        scores = classifyText(text, type);
      }

      const nowIso = new Date().toISOString();
      const generatedId =
        inputId ?? `cls-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Capture the state we wrote so we can push the *exact* same snapshot
      // to Supabase outside the setDb callback (setDb's updater must be pure
      // and React may invoke it more than once).
      let publishedState: UserClassificationState | null = null;
      let publishedRank: Rank = 'aprendiz';

      setDb((prev) => {
        const prevState = prev[userId] ?? makeEmptyUserState();

        // ── Momentum boost (active from input MOMENTUM_START_INPUT onwards) ──
        const momentumBoosts = computeMomentumBoosts(prevState.inputs);
        const boostedScores: ClanScores = { ...scores };
        for (const c of ALL_CLAN_IDS) {
          boostedScores[c] = scores[c] * momentumBoosts[c];
        }

        // ── Per-clan accumulation weights (base inertia + revealed-clan inercia)
        const baseWeight = prevState.visibleClanId == null ? PRE_REVEAL_WEIGHT : POST_REVEAL_WEIGHT;
        let perClanWeights: Record<ClanScoreId, number>;

        if (prevState.visibleClanId == null) {
          // Pre-reveal: uniform full weight for all clans.
          perClanWeights = {} as Record<ClanScoreId, number>;
          for (const c of ALL_CLAN_IDS) perClanWeights[c] = PRE_REVEAL_WEIGHT;
        } else {
          // Post-reveal: revealed clan gets an inertia multiplier based on its
          // rank in the current boosted scores; all others keep POST_REVEAL_WEIGHT.
          const revealedClan = prevState.visibleClanId;
          const sorted = ([...ALL_CLAN_IDS] as ClanScoreId[]).sort(
            (a, b) => boostedScores[b] - boostedScores[a],
          );
          const revealedRank = sorted.indexOf(revealedClan);
          const inertiaMultiplier =
            revealedRank === 0 ? INERTIA_TOP1  :
            revealedRank <= 2  ? INERTIA_TOP23 :
                                 INERTIA_OUT;

          perClanWeights = {} as Record<ClanScoreId, number>;
          for (const c of ALL_CLAN_IDS) {
            perClanWeights[c] =
              c === revealedClan
                ? POST_REVEAL_WEIGHT * inertiaMultiplier
                : POST_REVEAL_WEIGHT;
          }
        }

        const newTotals = applyScoresWithPerClanWeights(prevState.totals, boostedScores, perClanWeights);

        const totalReflectionsSent =
          prevState.totalReflectionsSent + (type === 'reflection' ? 1 : 0);
        const totalPhrasesSent =
          prevState.totalPhrasesSent + (type === 'phrase' ? 1 : 0);

        const reveal = deriveVisibleClan(
          prevState,
          newTotals,
          totalReflectionsSent,
          totalPhrasesSent,
          nowIso,
        );
        const pcts = totalsToPercentages(newTotals);
        const switchedClan =
          prevState.visibleClanId !== null &&
          reveal.visibleClanId !== null &&
          reveal.visibleClanId !== prevState.visibleClanId;
        const achievedRank = reveal.visibleClanId
          ? getRankFromPct(pcts[reveal.visibleClanId] ?? 0)
          : null;
        const clanRankHistory =
          switchedClan && reveal.visibleClanId
            ? setClanRankRecord(prevState.clanRankHistory ?? {}, reveal.visibleClanId, 'aprendiz')
            : mergeClanRankRecord(
                prevState.clanRankHistory ?? {},
                reveal.visibleClanId,
                achievedRank,
              );

        const nextRecord = {
          inputId: generatedId,
          inputType: type,
          clanScores: scores,         // original scores (pre-boost) for momentum history
          ...(claudeScores ? { claudeScores } : {}),
          weight: baseWeight,         // base weight for debug display
          createdAt: nowIso,
        };

        const candidateState: UserClassificationState = {
          inputs: [...prevState.inputs, nextRecord],
          totals: newTotals,
          totalReflectionsSent,
          totalPhrasesSent,
          visibleClanId: reveal.visibleClanId,
          clanRankHistory,
          lastActivityAt: nowIso,
          revealedAt: reveal.revealedAt,
          lastSwitchAt: reveal.lastSwitchAt,
        };
        // Defense-in-depth: if deriveVisibleClan ever leaves the state in
        // an incoherent shape (impossible today, but guards against future
        // regressions and against weird hydration edge cases), self-heal.
        const nextState = healState(candidateState);
        nextState.inputs = candidateState.inputs;
        trimInputs(nextState);

        publishedState = nextState;
        publishedRank = getDisplayRankForState(nextState);

        return { ...prev, [userId]: nextState };
      });

      // ── Immediate publish to Supabase (universal source of truth) ───────
      //
      // We don't await this inside the reflection submission flow because
      // callers fire-and-forget; but doing it here (instead of relying on
      // the debounced EffectiveClanSync) guarantees that the very next
      // time anyone fetches this user's profile they see the same clan
      // and percentages the user just saw on their own device.
      if (publishedState && isRealUserId(userId)) {
        try {
          await pushClassificationSnapshot(userId, publishedState, publishedRank);
          dirtyUsersRef.current.delete(userId);
        } catch {
          // Network / RLS / transient — let EffectiveClanSync retry later.
          dirtyUsersRef.current.add(userId);
        }
      }
    },
    [activeUserId],
  );

  const publishNow = useCallback(
    async (userId?: string): Promise<void> => {
      const id = userId ?? activeUserId;
      if (!isRealUserId(id)) return;
      const state = db[id];
      if (!state) return;
      try {
        await pushClassificationSnapshot(id, state, getDisplayRankForState(state));
        dirtyUsersRef.current.delete(id);
      } catch {
        dirtyUsersRef.current.add(id);
      }
    },
    [db, activeUserId],
  );

  const isDirty = useCallback(
    (userId?: string): boolean => {
      const id = userId ?? activeUserId;
      return dirtyUsersRef.current.has(id);
    },
    [activeUserId],
  );

  const value = useMemo<ClassificationContextValue>(
    () => ({
      loading,
      recordInput,
      getPercentages,
      getVisibleClanId,
      getReflectionCount,
      getPhraseCount,
      getClanRankHistory,
      getDisplayRank,
      getUserState: getUserStateInternal,
      publishNow,
      isDirty,
      pendingLaunchReveal,
      commitLaunchReveal,
    }),
    [
      loading,
      recordInput,
      getPercentages,
      getVisibleClanId,
      getReflectionCount,
      getPhraseCount,
      getClanRankHistory,
      getDisplayRank,
      getUserStateInternal,
      publishNow,
      isDirty,
      pendingLaunchReveal,
      commitLaunchReveal,
    ],
  );

  return (
    <ClassificationContext.Provider value={value}>{children}</ClassificationContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useClassification(): ClassificationContextValue {
  const ctx = useContext(ClassificationContext);
  if (!ctx) {
    throw new Error('useClassification must be used inside a <ClassificationProvider>');
  }
  return ctx;
}
