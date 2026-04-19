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
 *   - clan switches require the new top clan to beat the current one by
 *     SWITCH_MARGIN percentage points to avoid noise-driven flicker
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
import { useSimulation } from './SimulationContext';
import {
  ALL_CLAN_IDS,
  CLAN_LABELS,
  classifyText,
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
 *  percentage points before we switch (PART 14: "should not happen too easily"). */
const SWITCH_MARGIN = 5;

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

  if (topIsDifferent && beatsByMargin && top.pct >= REVEAL_PCT_THRESHOLD) {
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

      const scores = classifyText(text, type);
      const nowIso = new Date().toISOString();
      const generatedId =
        inputId ?? `cls-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setDb((prev) => {
        const prevState = prev[userId] ?? makeEmptyUserState();

        // Inertia: pre-reveal full weight, post-reveal dampened.
        const weight =
          prevState.visibleClanId == null ? PRE_REVEAL_WEIGHT : POST_REVEAL_WEIGHT;

        const newTotals = applyScoresToTotals(prevState.totals, scores, weight);

        const totalReflectionsSent =
          prevState.totalReflectionsSent + (type === 'reflection' ? 1 : 0);
        const totalPhrasesSent =
          prevState.totalPhrasesSent + (type === 'phrase' ? 1 : 0);

        const reveal = deriveVisibleClan(prevState, newTotals, totalReflectionsSent, nowIso);

        const nextRecord = {
          inputId: generatedId,
          inputType: type,
          clanScores: scores,
          weight,
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
