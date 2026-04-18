/**
 * thoughtsStorage.ts — unified, per-user persistent storage for ALL thoughts
 * (reflections AND phrases).
 *
 * Storage key scheme
 * ──────────────────
 * Each of the 9 simulated users gets their own AsyncStorage slot:
 *
 *   evoconn_thoughts_v2_{userId}   →  JSON array of PersistedThought[]
 *
 * User isolation is therefore enforced at the storage key level, not by
 * filtering a global bucket.  Switching simulated users calls
 * loadThoughtsForUser with the new id and gets completely different data.
 *
 * Migration
 * ─────────
 * The old global key `evoconn_phrase_threads_v1` (no user separation) is
 * migrated once, on the first load for a user.  All legacy phrases are
 * assigned to the user that is active at migration time (typically 'u1',
 * the default).  After migration the old key is removed.
 *
 * Reflections were previously fetched from the backend API list; with this
 * module they are persisted locally too, so the list survives reloads and is
 * fully user-scoped.  The backend is still used for AI generation but the
 * client is now the source of truth for the thread list and message cache.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConversationItem } from '@evoconn/types';
import type { DebateMessage } from '@evoconn/types/debate';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Serialised representation of a single thought (reflection or phrase).
 * Extends `ConversationItem` with the full message thread so it can be
 * displayed instantly on reopen without an extra network round-trip.
 */
export type PersistedThought = ConversationItem & {
  type: 'reflection' | 'phrase';
  /** Full thread — populated after the first AI response (reflections) or on
   *  creation (phrases).  Optional because old persisted items may not have it. */
  messages?: DebateMessage[];
  /** Private notes (phrase mode only). */
  phraseNotes?: string;
  /**
   * ID of the simulated user who owns this thought.  Required for correct
   * user isolation; items created before this field was introduced may have it
   * undefined, and are treated as belonging to the user on whose load they
   * were first encountered (migration path).
   */
  ownerUserId: string;
};

// ─── Storage key helpers ──────────────────────────────────────────────────────

const KEY_V2 = (userId: string) => `evoconn_thoughts_v2_${userId}`;
/** Legacy global key written by the old phraseThreadsStorage module. */
const LEGACY_PHRASE_KEY = 'evoconn_phrase_threads_v1';

// ─── Validation guard ─────────────────────────────────────────────────────────

function isPersistedThought(x: unknown): x is PersistedThought {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    (o.type === 'phrase' || o.type === 'reflection') &&
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.ownerUserId === 'string'
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load all thoughts (reflections + phrases) for a specific simulated user.
 * Returns an empty array on any error so the UI always has a valid state.
 */
export async function loadThoughtsForUser(userId: string): Promise<PersistedThought[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_V2(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPersistedThought);
  } catch {
    return [];
  }
}

/**
 * Persist the current thought list for a specific simulated user.
 * Only saves thoughts whose `ownerUserId === userId` as a safety guard
 * against accidentally writing another user's data.
 */
export async function saveThoughtsForUser(
  userId: string,
  thoughts: PersistedThought[],
): Promise<void> {
  try {
    const owned = thoughts.filter((t) => t.ownerUserId === userId);
    await AsyncStorage.setItem(KEY_V2(userId), JSON.stringify(owned));
  } catch {
    // Non-fatal — the in-memory state is still correct for this session.
  }
}

/**
 * One-time migration from the old global phrase-threads key.
 *
 * Reads `evoconn_phrase_threads_v1`, stamps every found phrase with
 * `ownerUserId = migrateToUserId`, removes the old key, and returns the
 * migrated items (or [] if the key didn't exist or an error occurred).
 *
 * It is safe to call this on every app launch — it is a no-op once the old
 * key is gone.
 */
export async function migrateFromLegacyPhraseStorage(
  migrateToUserId: string,
): Promise<PersistedThought[]> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_PHRASE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      await AsyncStorage.removeItem(LEGACY_PHRASE_KEY);
      return [];
    }
    const migrated: PersistedThought[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        (item as Record<string, unknown>).type === 'phrase' &&
        typeof (item as Record<string, unknown>).id === 'string'
      ) {
        migrated.push({ ...(item as PersistedThought), ownerUserId: migrateToUserId });
      }
    }
    await AsyncStorage.removeItem(LEGACY_PHRASE_KEY);
    return migrated;
  } catch {
    return [];
  }
}
