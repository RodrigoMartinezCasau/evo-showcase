/**
 * ClassificationContext
 *
 * Real per-user philosophical-clan classification engine.
 * Wraps clanClassifier + classificationStorage and exposes:
 *
 *   - recordInput(text, type)           → analyse, accumulate, persist
 *   - getPercentages(userId)            → ClanPct[] for the philosophy panel
 *   - getVisibleClanId(userId)          → 'Sin clan' (null) until reveal rules pass
 *   - getReflectionCount(userId)        → counter used by the reveal threshold
 *
 * Rules (from spec):
 *   - every reflection/phrase is scored against the 8 clans
 *   - scores accumulate per user, percentages always sum to 100%
 *   - all users start visibly as "Sin clan"
 *   - clan is revealed only when BOTH:
 *       totalReflectionsSent >= REVEAL_REFLECTION_THRESHOLD (30)
 *       AND any clan reaches REVEAL_PCT_THRESHOLD (30%)
 *   - phrases contribute to scores but NOT to the reflection counter
 *   - after reveal, new inputs are dampened (POST_REVEAL_WEIGHT)
 *   - after first reveal, clan switches require the new top clan to beat the
 *     current visible clan by SWITCH_MARGIN percentage points. The first-reveal
 *     percentage threshold does NOT apply to later reallocations.
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
import { Platform } from 'react-native';
import { useSimulation } from './SimulationContext';
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
import {
  loadClassificationDb,
  saveClassificationDb,
  makeEmptyUserState,
  trimInputs,
  type ClassificationDatabase,
  type UserClassificationState,
} from '@evoconn/services/classificationStorage';

// ─── Backend URL helper ──────────────────────────────────────────────────────

function _getApiBaseUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL
      ? String(process.env.EXPO_PUBLIC_API_URL).trim()
      : '';
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return (
    Platform.select({ android: 'http://10.0.2.2:8000', default: 'http://127.0.0.1:8000' }) ??
    'http://127.0.0.1:8000'
  );
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
    const res = await fetch(`${_getApiBaseUrl()}/classify/reflection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

/** Number of reflections required before any clan can be revealed. */
export const REVEAL_REFLECTION_THRESHOLD = 30;

/** Minimum percentage one clan must hit to be revealed. */
export const REVEAL_PCT_THRESHOLD = 30;

/** Score weight for a new input BEFORE the user has a revealed clan. */
const PRE_REVEAL_WEIGHT = 1.0;

/** Score weight for a new input AFTER the user has a revealed clan
 *  (introduces the inertia required by spec PART 15). */
const POST_REVEAL_WEIGHT = 0.35;

/** A new top clan must beat the current visible clan by at least this many
 *  percentage points before we switch after the first assignment. */
export const SWITCH_MARGIN = 5;

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

  /** Raw state for debugging / advanced screens. */
  getUserState: (userId?: string) => UserClassificationState;
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

function pickTopClan(pcts: Record<ClanScoreId, number>): { id: ClanScoreId; pct: number } {
  let topId: ClanScoreId = ALL_CLAN_IDS[0];
  let topPct = -1;
  for (const c of ALL_CLAN_IDS) {
    if (pcts[c] > topPct) {
      topPct = pcts[c];
      topId = c;
    }
  }
  return { id: topId, pct: topPct };
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
  nowIso: string,
): {
  visibleClanId: ClanScoreId | null;
  revealedAt: string | null;
  lastSwitchAt: string | null;
} {
  const pcts = totalsToPercentages(newTotals);
  const top = pickTopClan(pcts);

  const meetsCount = totalReflectionsSent >= REVEAL_REFLECTION_THRESHOLD;
  const meetsTopPct = top.pct >= REVEAL_PCT_THRESHOLD;

  // Not yet revealed.
  if (prev.visibleClanId == null) {
    if (meetsCount && meetsTopPct) {
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

  // Already revealed → consider switching.
  const currentPct = pcts[prev.visibleClanId];
  const topIsDifferent = top.id !== prev.visibleClanId;
  const beatsByMargin = top.pct - currentPct >= SWITCH_MARGIN;

  if (topIsDifferent && beatsByMargin) {
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

// ─── Provider ────────────────────────────────────────────────────────────────

export function ClassificationProvider({ children }: { children: ReactNode }) {
  const sim = useSimulation();
  const activeUserId = sim.activeUserId;

  const [db, setDb] = useState<ClassificationDatabase>({});
  const [loading, setLoading] = useState(true);

  // Hydration guard — avoid clobbering disk before initial load resolves.
  const hydratedRef = useRef(false);

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

  // ── Action: record a new input ────────────────────────────────────────
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

        const reveal = deriveVisibleClan(prevState, newTotals, totalReflectionsSent, nowIso);

        const nextRecord = {
          inputId: generatedId,
          inputType: type,
          clanScores: scores,         // original scores (pre-boost) for momentum history
          ...(claudeScores ? { claudeScores } : {}),
          weight: baseWeight,         // base weight for debug display
          createdAt: nowIso,
        };

        const nextState: UserClassificationState = {
          inputs: [...prevState.inputs, nextRecord],
          totals: newTotals,
          totalReflectionsSent,
          totalPhrasesSent,
          visibleClanId: reveal.visibleClanId,
          revealedAt: reveal.revealedAt,
          lastSwitchAt: reveal.lastSwitchAt,
        };
        trimInputs(nextState);

        return { ...prev, [userId]: nextState };
      });
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
      getUserState: getUserStateInternal,
    }),
    [loading, recordInput, getPercentages, getVisibleClanId, getReflectionCount, getUserStateInternal],
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
