/**
 * classificationStorage.ts
 *
 * Per-user persistent storage for the philosophical-clan classification
 * engine. Survives app reload and switching between simulated users.
 *
 * Storage shape (single AsyncStorage key):
 *
 *   {
 *     [userId: string]: UserClassificationState
 *   }
 *
 * Each user has:
 *   - `inputs`              recent per-input score records (capped to last N)
 *   - `totals`              accumulated weighted clan totals
 *   - `totalReflectionsSent` / `totalPhrasesSent` — reveal needs ≥2 reflections,
 *     ≥3 phrases, and ≥5 combined (see ClassificationContext)
 *   - `totalPhrasesSent`     counter for completeness
 *   - `visibleClanId`        currently-revealed clan ('Sin clan' = null)
 *   - `lastActivityAt`       ISO date of the last reflection or phrase
 *   - `revealedAt`           ISO date of the first reveal (null until then)
 *   - `lastSwitchAt`         ISO date of the last clan switch (null if none)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type ClanScoreId,
  type ClanScores,
  type InputType,
  ALL_CLAN_IDS,
  makeZeroScores,
  totalsToPercentages,
} from './clanClassifier';
import type { Rank } from '@evoconn/types';
import { getRankFromPct } from '@evoconn/utils/getRankFromPct';

const KEY = '@physicscopilot/classification_v1';

/** Cap recent per-input records per user so the AsyncStorage blob stays small. */
const MAX_INPUTS_PER_USER = 200;

export type ClassifiedInputRecord = {
  /** Unique id (debate id for reflections, phrase id for phrases, or generated). */
  inputId: string;
  inputType: InputType;
  /** Final hybrid blend score (H+S+ML+Claude, or fallback subset). */
  clanScores: ClanScores;
  /** Raw scores from the Claude layer, if available (undefined when offline or API error). */
  claudeScores?: ClanScores;
  weight: number;
  createdAt: string;
};

export type UserClassificationState = {
  inputs: ClassifiedInputRecord[];
  totals: ClanScores;
  totalReflectionsSent: number;
  totalPhrasesSent: number;
  visibleClanId: ClanScoreId | null;
  /** Highest rank reached for each clan during the current stay in that clan. */
  clanRankHistory: Partial<Record<ClanScoreId, Rank>>;
  lastActivityAt: string | null;
  revealedAt: string | null;
  lastSwitchAt: string | null;
};

export type ClassificationDatabase = Record<string, UserClassificationState>;

// ─── Defaults ────────────────────────────────────────────────────────────────

export function makeEmptyUserState(): UserClassificationState {
  return {
    inputs: [],
    totals: makeZeroScores(),
    totalReflectionsSent: 0,
    totalPhrasesSent: 0,
    visibleClanId: null,
    clanRankHistory: {},
    lastActivityAt: null,
    revealedAt: null,
    lastSwitchAt: null,
  };
}

const RANK_VALUE: Record<Rank, number> = { aprendiz: 1, maestro: 2, filosofo: 3 };

/** Keep the highest rank ever reached per clan (medals never downgrade). */
export function mergeClanRankRecord(
  history: Partial<Record<ClanScoreId, Rank>>,
  clanId: ClanScoreId | null,
  rank: Rank | null,
): Partial<Record<ClanScoreId, Rank>> {
  if (!clanId || !rank) return history;
  const previous = history[clanId];
  if (previous && RANK_VALUE[previous] >= RANK_VALUE[rank]) return history;
  return { ...history, [clanId]: rank };
}

export function setClanRankRecord(
  history: Partial<Record<ClanScoreId, Rank>>,
  clanId: ClanScoreId,
  rank: Rank,
): Partial<Record<ClanScoreId, Rank>> {
  return { ...history, [clanId]: rank };
}

/** Merge two medal records, keeping the higher rank per clan. */
export function mergeClanRankHistories(
  a: Partial<Record<ClanScoreId, Rank>>,
  b: Partial<Record<ClanScoreId, Rank>>,
): Partial<Record<ClanScoreId, Rank>> {
  let out = { ...a };
  for (const c of ALL_CLAN_IDS) {
    const rb = b[c];
    if (rb) out = mergeClanRankRecord(out, c, rb);
  }
  return out;
}

/**
 * Update medal history after a reveal, rank gain, or clan switch.
 * On switch: freeze the leaving clan's rank, start the new clan at aprendiz.
 */
export function applyClanRankHistoryUpdate(
  prevHistory: Partial<Record<ClanScoreId, Rank>>,
  prevVisibleClanId: ClanScoreId | null,
  nextVisibleClanId: ClanScoreId | null,
  pcts: Record<ClanScoreId, number>,
  switchedClan: boolean,
): Partial<Record<ClanScoreId, Rank>> {
  let history = prevHistory;
  if (switchedClan && nextVisibleClanId && prevVisibleClanId) {
    const leavingRank = getRankFromPct(pcts[prevVisibleClanId] ?? 0);
    history = mergeClanRankRecord(history, prevVisibleClanId, leavingRank);
    return setClanRankRecord(history, nextVisibleClanId, 'aprendiz');
  }
  const achievedRank = nextVisibleClanId
    ? getRankFromPct(pcts[nextVisibleClanId] ?? 0)
    : null;
  return mergeClanRankRecord(history, nextVisibleClanId, achievedRank);
}

// ─── Sanitisation ────────────────────────────────────────────────────────────

/**
 * Defensive parsing: the stored blob came from a previous app version or
 * a user who manually cleared parts of storage, so we accept missing
 * fields and fill them with zeroes.
 */
function sanitiseUserState(raw: unknown): UserClassificationState {
  if (!raw || typeof raw !== 'object') return makeEmptyUserState();
  const r = raw as Partial<UserClassificationState>;

  const totals = makeZeroScores();
  if (r.totals && typeof r.totals === 'object') {
    for (const c of ALL_CLAN_IDS) {
      const v = (r.totals as Record<string, unknown>)[c];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) totals[c] = v;
    }
  }

  const inputs: ClassifiedInputRecord[] = Array.isArray(r.inputs)
    ? r.inputs
        .filter(
          (i): i is ClassifiedInputRecord =>
            !!i &&
            typeof i === 'object' &&
            typeof (i as ClassifiedInputRecord).inputId === 'string' &&
            !!(i as ClassifiedInputRecord).clanScores,
        )
        .slice(-MAX_INPUTS_PER_USER)
    : [];

  const vid = r.visibleClanId;
  const visibleClanId =
    vid && typeof vid === 'string' && (ALL_CLAN_IDS as string[]).includes(vid)
      ? (vid as ClanScoreId)
      : null;

  const clanRankHistory: Partial<Record<ClanScoreId, Rank>> = {};
  const rawHistory = (r as Partial<UserClassificationState>).clanRankHistory;
  if (rawHistory && typeof rawHistory === 'object') {
    for (const c of ALL_CLAN_IDS) {
      const rank = (rawHistory as Record<string, unknown>)[c];
      if (rank === 'aprendiz' || rank === 'maestro' || rank === 'filosofo') {
        clanRankHistory[c] = rank;
      }
    }
  }

  return {
    inputs,
    totals,
    totalReflectionsSent:
      typeof r.totalReflectionsSent === 'number' && r.totalReflectionsSent >= 0
        ? r.totalReflectionsSent
        : 0,
    totalPhrasesSent:
      typeof r.totalPhrasesSent === 'number' && r.totalPhrasesSent >= 0
        ? r.totalPhrasesSent
        : 0,
    visibleClanId,
    clanRankHistory,
    lastActivityAt:
      typeof r.lastActivityAt === 'string'
        ? r.lastActivityAt
        : (inputs[inputs.length - 1]?.createdAt ?? null),
    revealedAt: typeof r.revealedAt === 'string' ? r.revealedAt : null,
    lastSwitchAt: typeof r.lastSwitchAt === 'string' ? r.lastSwitchAt : null,
  };
}

function sanitiseDb(raw: unknown): ClassificationDatabase {
  if (!raw || typeof raw !== 'object') return {};
  const out: ClassificationDatabase = {};
  for (const [userId, state] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof userId !== 'string' || !userId) continue;
    out[userId] = healState(sanitiseUserState(state));
  }
  return out;
}

// ─── Self-healing (consistency guarantees) ────────────────────────────────────
//
// Three corruption modes we've seen in the wild that healState eliminates:
//
//   A. Ghost-clan: visibleClanId is set, but totals are all zero / counters
//      are zero. Cause: AsyncStorage wiped while Supabase still had the old
//      `clan_id`, then the user got hydrated from a partial backup. Fix:
//      treat counters/totals as the source of truth → drop the clan.
//
//   B. Mismatched-clan: visibleClanId says X, but in the percentages another
//      clan dominates by a wide margin (e.g. "soy existencialista pero
//      tengo 35% racionalista y 20% humanista"). This means the on-disk
//      visibleClanId lost causality with the totals (interrupted write, bad
//      migration, manual edit). Fix: if a different clan satisfies the
//      reveal threshold AND leads X by at least REVEAL_LEAD_OVER_SECOND_PP,
//      promote it; otherwise un-reveal completely. This is intentionally
//      stricter than the in-app switch rule because we're reacting to a
//      corruption, not to a normal score drift.
//
//   C. Weak-clan: visibleClanId is set but pct < a sanity floor. Inertia
//      can legitimately keep a clan below 25%, but going below 10% means
//      the state is no longer believable.
//
// Heal is idempotent — a healed state passes through unchanged on a re-run.

/** A clan losing this much pct vs the current top is treated as a corruption signal. */
const HEAL_LEAD_OVER_CLAIM_PP = 5;
/** Top clan must reach at least this pct before we promote it on heal. */
const HEAL_PROMOTE_TOP_PCT = 25;
/** Floor below which a revealed clan is no longer believable. */
const HEAL_MIN_CLAIM_PCT = 10;

export function healState(state: UserClassificationState): UserClassificationState {
  const totalInputs = state.totalReflectionsSent + state.totalPhrasesSent;
  const totalMass = ALL_CLAN_IDS.reduce((s, c) => s + (state.totals[c] ?? 0), 0);

  // ── Mode A: zero inputs / zero totals → no clan should survive ─────────────
  // Medals (clanRankHistory) are permanent achievements — never wipe them even
  // when totals/counters got corrupted or reset (ghost-clan recovery).
  if (totalInputs === 0 && totalMass === 0) {
    if (
      state.visibleClanId === null &&
      state.revealedAt === null &&
      state.lastSwitchAt === null &&
      Object.keys(state.clanRankHistory ?? {}).length === 0
    ) {
      return state; // already a clean empty state
    }
    return {
      ...makeEmptyUserState(),
      clanRankHistory: state.clanRankHistory ?? {},
    };
  }

  if (state.visibleClanId === null) {
    // Nothing to validate further — pre-reveal state with some data is fine.
    return state;
  }

  // ── Mode B / C: visibleClanId is set; check it against the totals ──────────
  const pcts = totalsToPercentages(state.totals);
  const claim = state.visibleClanId;
  const claimPct = pcts[claim] ?? 0;

  let topId: ClanScoreId = ALL_CLAN_IDS[0];
  let topPct = pcts[topId];
  let secondPct = 0;
  for (const c of ALL_CLAN_IDS) {
    const p = pcts[c];
    if (p > topPct) {
      secondPct = topPct;
      topPct = p;
      topId = c;
    } else if (p > secondPct) {
      secondPct = p;
    }
  }

  // Mode B — another clan clearly dominates and the claim is far behind.
  const claimedIsNotTop = topId !== claim;
  const topClearlyLeadsClaim = topPct - claimPct >= HEAL_LEAD_OVER_CLAIM_PP;
  if (claimedIsNotTop && topPct >= HEAL_PROMOTE_TOP_PCT && topClearlyLeadsClaim) {
    return {
      ...state,
      visibleClanId: topId,
      lastSwitchAt: new Date().toISOString(),
    };
  }

  // Mode C — claimed clan is below the believability floor → un-reveal.
  if (claimPct < HEAL_MIN_CLAIM_PCT) {
    return {
      ...state,
      visibleClanId: null,
      revealedAt: null,
      lastSwitchAt: null,
    };
  }

  // Mode B without a clear winner — still demote: if the claim isn't even
  // top and the gap is significant, fall back to "Sin clan" rather than
  // promoting an undeserving runner-up.
  if (claimedIsNotTop && topClearlyLeadsClaim) {
    return {
      ...state,
      visibleClanId: null,
      revealedAt: null,
      lastSwitchAt: null,
    };
  }

  return state;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function loadClassificationDb(): Promise<ClassificationDatabase> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    return sanitiseDb(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function saveClassificationDb(db: ClassificationDatabase): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // best-effort persistence; in-memory state is the source of truth this session
  }
}

/** Convenience: cap inputs in-place. */
export function trimInputs(state: UserClassificationState): void {
  if (state.inputs.length > MAX_INPUTS_PER_USER) {
    state.inputs = state.inputs.slice(-MAX_INPUTS_PER_USER);
  }
}

export { MAX_INPUTS_PER_USER };
