/**
 * thoughtsStorage.ts — single-database, multi-user persistent storage.
 *
 * Storage model (v3 — bulletproof)
 * ────────────────────────────────
 * ONE AsyncStorage key holds the ENTIRE database keyed by userId:
 *
 *   evoconn_thoughts_v3  →  { [userId]: PersistedThought[] }
 *
 * Why a single key?
 * - No race conditions during user switching (no "save before switch" needed).
 * - No stale-async-load can ever overwrite a different user's data, because
 *   every save is a snapshot of the WHOLE database.
 * - One-time load on app start; rehydrates all 9 users at once.
 * - Switching simulated users is a pure in-memory slice lookup (cost-free).
 *
 * Migration paths
 * ───────────────
 * Older versions stored data under per-user keys (`evoconn_thoughts_v2_{uid}`)
 * or under a single global phrase key (`evoconn_phrase_threads_v1`).  Both are
 * migrated into v3 on the first load, then their old keys are removed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConversationItem } from '@evoconn/types';
import type { DebateMessage } from '@evoconn/types/debate';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PersistedThought = ConversationItem & {
  type: 'reflection' | 'phrase';
  /** Full thread (assistant responses included) — populated after each AI turn
   *  for reflections, and at creation time for phrases. */
  messages?: DebateMessage[];
  /** Private notes (phrase mode only). */
  phraseNotes?: string;
  /** ID of the simulated user who owns this thought. Always present. */
  ownerUserId: string;
};

export type ThoughtsDatabase = Record<string, PersistedThought[]>;

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEY_V3 = 'evoconn_thoughts_v3';
const KEY_V2_PREFIX = 'evoconn_thoughts_v2_';
const KEY_LEGACY_PHRASES = 'evoconn_phrase_threads_v1';

// ─── Validation guard ─────────────────────────────────────────────────────────

function isPersistedThought(x: unknown): x is PersistedThought {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    (o.type === 'phrase' || o.type === 'reflection') &&
    typeof o.id === 'string' &&
    typeof o.title === 'string'
  );
}

function sanitiseList(list: unknown, ownerUserId: string): PersistedThought[] {
  if (!Array.isArray(list)) return [];
  const out: PersistedThought[] = [];
  for (const item of list) {
    if (isPersistedThought(item)) {
      // Force ownership to the slot's userId — defensive: never trust stored data.
      out.push({ ...item, ownerUserId });
    }
  }
  return out;
}

function sanitiseDatabase(db: unknown): ThoughtsDatabase {
  if (!db || typeof db !== 'object') return {};
  const out: ThoughtsDatabase = {};
  for (const [userId, list] of Object.entries(db as Record<string, unknown>)) {
    if (typeof userId !== 'string' || !userId) continue;
    out[userId] = sanitiseList(list, userId);
  }
  return out;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load the complete multi-user thoughts database from disk, running any
 * one-time migrations from older storage formats.  Always returns a valid
 * (possibly empty) database object.
 */
export async function loadAllThoughts(
  knownUserIds: string[] = [],
): Promise<ThoughtsDatabase> {
  let db: ThoughtsDatabase = {};

  // 1. Read the v3 root.
  try {
    const raw = await AsyncStorage.getItem(KEY_V3);
    if (raw) {
      db = sanitiseDatabase(JSON.parse(raw) as unknown);
    }
  } catch {
    db = {};
  }

  // 2. Migrate v2 per-user keys (if any) into v3.
  let migratedAnything = false;
  for (const userId of knownUserIds) {
    const v2Key = `${KEY_V2_PREFIX}${userId}`;
    try {
      const raw = await AsyncStorage.getItem(v2Key);
      if (raw == null) continue;
      const parsed = JSON.parse(raw) as unknown;
      const list = sanitiseList(parsed, userId);
      // Merge — only add items not already in v3 to avoid duplicates.
      const existing = db[userId] ?? [];
      const existingIds = new Set(existing.map((t) => t.id));
      const merged = [...existing, ...list.filter((t) => !existingIds.has(t.id))];
      if (merged.length > 0) {
        db[userId] = merged;
        migratedAnything = true;
      }
      await AsyncStorage.removeItem(v2Key);
    } catch {
      // Ignore — corrupt v2 slot is not worth retrying.
    }
  }

  // 3. Migrate legacy global phrase storage into the first known user's slot.
  try {
    const raw = await AsyncStorage.getItem(KEY_LEGACY_PHRASES);
    if (raw != null) {
      const parsed = JSON.parse(raw) as unknown;
      const fallbackUserId = knownUserIds[0] ?? 'u1';
      const list = sanitiseList(parsed, fallbackUserId);
      const existing = db[fallbackUserId] ?? [];
      const existingIds = new Set(existing.map((t) => t.id));
      const merged = [...existing, ...list.filter((t) => !existingIds.has(t.id))];
      if (merged.length > 0) {
        db[fallbackUserId] = merged;
        migratedAnything = true;
      }
      await AsyncStorage.removeItem(KEY_LEGACY_PHRASES);
    }
  } catch {
    // Ignore.
  }

  // 4. If we migrated anything, persist the merged db back immediately.
  if (migratedAnything) {
    saveAllThoughts(db).catch(() => {});
  }

  return db;
}

/**
 * Persist the COMPLETE multi-user database to disk in a single write.
 * Every mutation goes through here, guaranteeing that no partial state
 * can ever be left on disk.
 */
export async function saveAllThoughts(db: ThoughtsDatabase): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_V3, JSON.stringify(db));
  } catch {
    // Non-fatal — in-memory state is still the source of truth this session.
  }
}
