/**
 * classificationSync.ts
 *
 * Bridge between the local classification engine (AsyncStorage) and the
 * authoritative public copy in Supabase (`profiles` table).
 *
 * Why this exists:
 *   The classification state used to live only in AsyncStorage. That meant
 *   (a) other users could never see your clan/percentages from their device
 *   and (b) a reinstall wiped all progression. By mirroring the state into
 *   Supabase we get a universal public display + automatic cross-device
 *   recovery without changing the local read path.
 *
 * Direction of truth:
 *   • Writes — the LOCAL store is the working source. After every change
 *     we push a snapshot to Supabase (debounced by the caller).
 *   • Reads — when LOCAL has no record for the authenticated real user,
 *     hydrate from Supabase on boot.
 *   • Other users' UI — read from Supabase (their profiles row already
 *     carries `clan_id`, `rank`, and now `clan_percentages`).
 */
import { supabase } from '../../mobile/lib/supabase';
import {
  ALL_CLAN_IDS,
  CLAN_LABELS,
  makeZeroScores,
  totalsToPercentages,
  type ClanScoreId,
  type ClanScores,
} from './clanClassifier';
import {
  healState,
  makeEmptyUserState,
  type UserClassificationState,
} from './classificationStorage';
import type { Rank } from '@evoconn/types';

// Bumped whenever the on-the-wire shape of classification_state changes.
const CLASSIFICATION_STATE_SCHEMA_VERSION = 1;

export type PublishedClanPct = { clanId: string; label: string; pct: number };

/**
 * Public-facing percentages payload stored in profiles.clan_percentages.
 * Sorted desc, only non-zero entries kept.
 */
export function buildPublicPercentages(totals: ClanScores): PublishedClanPct[] {
  const pcts = totalsToPercentages(totals);
  return ALL_CLAN_IDS
    .map((c) => ({ clanId: c, label: CLAN_LABELS[c], pct: pcts[c] }))
    .filter((e) => e.pct > 0)
    .sort((a, b) => b.pct - a.pct);
}

/**
 * Compact, privacy-safe snapshot we send to Supabase.
 * NB: we never persist raw input text (`inputs`) — that lives only in
 * AsyncStorage. Recovery rebuilds totals and reveal flags, which is
 * everything the UI needs.
 */
type ClassificationStatePayload = {
  schemaVersion: number;
  totals: ClanScores;
  totalReflectionsSent: number;
  totalPhrasesSent: number;
  visibleClanId: ClanScoreId | null;
  clanRankHistory: Partial<Record<ClanScoreId, Rank>>;
  lastActivityAt: string | null;
  revealedAt: string | null;
  lastSwitchAt: string | null;
};

export function stateToPayload(state: UserClassificationState): ClassificationStatePayload {
  return {
    schemaVersion: CLASSIFICATION_STATE_SCHEMA_VERSION,
    totals: state.totals,
    totalReflectionsSent: state.totalReflectionsSent,
    totalPhrasesSent: state.totalPhrasesSent,
    visibleClanId: state.visibleClanId,
    clanRankHistory: state.clanRankHistory ?? {},
    lastActivityAt: state.lastActivityAt,
    revealedAt: state.revealedAt,
    lastSwitchAt: state.lastSwitchAt,
  };
}

/**
 * Defensive: accept any payload shape (older or hand-edited) and produce a
 * fully-typed UserClassificationState. Unknown clans / bad values are
 * dropped silently.
 */
export function payloadToState(payload: unknown): UserClassificationState {
  const empty = makeEmptyUserState();
  if (!payload || typeof payload !== 'object') return empty;
  const p = payload as Partial<ClassificationStatePayload>;

  const totals = makeZeroScores();
  if (p.totals && typeof p.totals === 'object') {
    for (const c of ALL_CLAN_IDS) {
      const v = (p.totals as Record<string, unknown>)[c];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) totals[c] = v;
    }
  }

  const clanRankHistory: Partial<Record<ClanScoreId, Rank>> = {};
  if (p.clanRankHistory && typeof p.clanRankHistory === 'object') {
    for (const c of ALL_CLAN_IDS) {
      const rank = (p.clanRankHistory as Record<string, unknown>)[c];
      if (rank === 'aprendiz' || rank === 'maestro' || rank === 'filosofo') {
        clanRankHistory[c] = rank;
      }
    }
  }

  const vid = p.visibleClanId;
  const visibleClanId =
    typeof vid === 'string' && (ALL_CLAN_IDS as string[]).includes(vid)
      ? (vid as ClanScoreId)
      : null;

  return {
    inputs: [],
    totals,
    totalReflectionsSent:
      typeof p.totalReflectionsSent === 'number' && p.totalReflectionsSent >= 0
        ? p.totalReflectionsSent
        : 0,
    totalPhrasesSent:
      typeof p.totalPhrasesSent === 'number' && p.totalPhrasesSent >= 0
        ? p.totalPhrasesSent
        : 0,
    visibleClanId,
    clanRankHistory,
    lastActivityAt: typeof p.lastActivityAt === 'string' ? p.lastActivityAt : null,
    revealedAt: typeof p.revealedAt === 'string' ? p.revealedAt : null,
    lastSwitchAt: typeof p.lastSwitchAt === 'string' ? p.lastSwitchAt : null,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Pull the published classification snapshot for any user.
 * Used to hydrate the local store on boot when AsyncStorage is empty.
 * Returns null on network error / missing row.
 */
export async function fetchPublishedClassification(
  userId: string,
): Promise<{
  state: UserClassificationState;
  clanId: string | null;
  rank: Rank;
  percentages: PublishedClanPct[];
} | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('clan_id, rank, clan_percentages, classification_state')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[ClassificationSync] fetch failed', error.message);
    return null;
  }
  if (!data) return null;

  // The classification_state JSON is our authoritative backup: totals,
  // counters, and visibleClanId all come from there. We DELIBERATELY do NOT
  // synthesise visibleClanId from a bare profiles.clan_id — that's the
  // "ghost clan" bug (clan persists in DB while totals/counters got wiped).
  // healState then guarantees a consistent result: empty backup ⇒ Sin clan,
  // mismatched backup ⇒ un-revealed or promoted to the real top.
  const restoredState = healState(payloadToState(data.classification_state));

  return {
    state: restoredState,
    clanId: restoredState.visibleClanId ?? null,
    rank: (data.rank as Rank | null) ?? 'aprendiz',
    percentages: Array.isArray(data.clan_percentages)
      ? (data.clan_percentages as PublishedClanPct[])
      : [],
  };
}

/**
 * List published members of a given clan (used by the "Miembros destacados"
 * section of the clan display). Returns up to `limit` profiles ordered by
 * engagement so the most active filósofos surface first.
 *
 * Each entry includes the user's dominant pct for this clan (extracted
 * from their published `clan_percentages`) so the UI can show a real
 * percentage instead of a mock one.
 */
export type ClanMemberSummary = {
  id: string;
  username: string;
  clanId: string;
  rank: Rank;
  clanPct: number;
};

export async function fetchClanMembers(
  clanId: string,
  options: { limit?: number; excludeUserId?: string | null } = {},
): Promise<ClanMemberSummary[]> {
  const { limit = 24, excludeUserId = null } = options;

  let query = supabase
    .from('profiles')
    .select('id, username, clan_id, rank, clan_percentages, total_reflections, total_quotes')
    .eq('clan_id', clanId);
  if (excludeUserId) query = query.neq('id', excludeUserId);
  query = query
    .order('total_reflections', { ascending: false })
    .order('total_quotes', { ascending: false })
    .limit(limit);

  const { data, error } = await query;
  if (error) {
    console.warn('[ClassificationSync] fetchClanMembers failed', error.message);
    return [];
  }

  return (data ?? []).map((row): ClanMemberSummary => {
    const raw = (row as { clan_percentages?: unknown }).clan_percentages;
    const pcts = Array.isArray(raw) ? (raw as PublishedClanPct[]) : [];
    const dominant = pcts.find((e) => e.clanId === clanId)?.pct ?? 0;
    return {
      id: row.id as string,
      username:
        typeof row.username === 'string'
          ? '@' + row.username.toUpperCase()
          : '?',
      clanId,
      rank: (row.rank as Rank) ?? 'aprendiz',
      clanPct: dominant,
    };
  });
}

/**
 * Push a snapshot to Supabase. Designed to be called debounced by the
 * sync component. Best-effort: errors are logged and swallowed.
 *
 * When state is "empty" (no reflections, no clan revealed) we explicitly
 * clear clan_id and clan_percentages so a wipe never leaves a stale
 * "ghost clan" in the public profile.
 */
export async function pushClassificationSnapshot(
  userId: string,
  state: UserClassificationState,
  rank: Rank,
): Promise<void> {
  const isEmpty =
    state.totalReflectionsSent === 0 &&
    state.totalPhrasesSent === 0 &&
    state.visibleClanId == null;

  const update: Record<string, unknown> = isEmpty
    ? {
        clan_id: null,
        clan_percentages: [],
        classification_state: null,
        rank: 'aprendiz',
      }
    : {
        clan_id: state.visibleClanId,
        clan_percentages: buildPublicPercentages(state.totals),
        classification_state: stateToPayload(state),
        rank,
      };

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', userId);

  if (error) {
    // Non-fatal — local state stays as the working source.
    console.warn('[ClassificationSync] push failed', error.message);
  }
}
