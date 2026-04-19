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
 *   - `totalReflectionsSent` counter used for the reveal threshold
 *   - `totalPhrasesSent`     counter for completeness
 *   - `visibleClanId`        currently-revealed clan ('Sin clan' = null)
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
} from './clanClassifier';

const KEY = '@physicscopilot/classification_v1';

/** Cap recent per-input records per user so the AsyncStorage blob stays small. */
const MAX_INPUTS_PER_USER = 200;

export type ClassifiedInputRecord = {
  /** Unique id (debate id for reflections, phrase id for phrases, or generated). */
  inputId: string;
  inputType: InputType;
  clanScores: ClanScores;
  weight: number;
  createdAt: string;
};

export type UserClassificationState = {
  inputs: ClassifiedInputRecord[];
  totals: ClanScores;
  totalReflectionsSent: number;
  totalPhrasesSent: number;
  visibleClanId: ClanScoreId | null;
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
    revealedAt: null,
    lastSwitchAt: null,
  };
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
    revealedAt: typeof r.revealedAt === 'string' ? r.revealedAt : null,
    lastSwitchAt: typeof r.lastSwitchAt === 'string' ? r.lastSwitchAt : null,
  };
}

function sanitiseDb(raw: unknown): ClassificationDatabase {
  if (!raw || typeof raw !== 'object') return {};
  const out: ClassificationDatabase = {};
  for (const [userId, state] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof userId !== 'string' || !userId) continue;
    out[userId] = sanitiseUserState(state);
  }
  return out;
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
