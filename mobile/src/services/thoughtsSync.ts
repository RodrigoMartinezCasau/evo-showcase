/**
 * thoughtsSync.ts
 *
 * Bridge between the local thoughts cache (AsyncStorage via thoughtsStorage)
 * and the authoritative public-but-private backup in Supabase
 * (`user_thoughts` table — RLS-protected per user).
 *
 * Goals:
 *   1) Reinstalling the app does NOT lose the user's reflection/phrase
 *      history — they re-hydrate from Supabase on first launch.
 *   2) A backend redeploy that wipes the SQLite debate store does NOT
 *      cost users their threads, because the full `messages` array is
 *      mirrored here.
 *
 * Direction of truth:
 *   • Working source = local (fast, offline-tolerant).
 *   • Public source  = Supabase (survives device + backend wipes).
 *   • Conflict rule  = the side with the larger / newer message array
 *     wins on merge, never destructive overwrite.
 *
 * Everything here is best-effort: every network call is wrapped so a
 * Supabase outage / RLS misconfig / missing migration never breaks the
 * normal in-app flow.
 */
import { supabase } from '../../mobile/lib/supabase';
import type { PersistedThought } from './thoughtsStorage';
import type { DebateMessage } from '@evoconn/types/debate';
import { isRealUserId } from './supabaseSocial';

const TABLE = 'user_thoughts';

// ─── Types ───────────────────────────────────────────────────────────────────

type RemoteThoughtRow = {
  user_id: string;
  thought_id: string;
  type: 'reflection' | 'phrase';
  title: string;
  messages: DebateMessage[] | null;
  phrase_notes: string | null;
  folder_id: string | null;
  updated_at: string;
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

function thoughtToRow(userId: string, t: PersistedThought): RemoteThoughtRow {
  return {
    user_id: userId,
    thought_id: t.id,
    type: t.type,
    title: t.title ?? '',
    messages: t.messages ?? [],
    phrase_notes: t.phraseNotes ?? null,
    folder_id: t.folderId ?? null,
    updated_at: t.updatedAt ?? new Date().toISOString(),
  };
}

function rowToThought(row: RemoteThoughtRow): PersistedThought {
  return {
    id: row.thought_id,
    type: row.type,
    title: row.title ?? '',
    messages: Array.isArray(row.messages) ? row.messages : [],
    phraseNotes: row.phrase_notes ?? undefined,
    folderId: row.folder_id ?? undefined,
    updatedAt: row.updated_at ?? new Date().toISOString(),
    ownerUserId: row.user_id,
  } as PersistedThought;
}

// ─── Push (per-thought, called debounced from useThoughts) ──────────────────

/**
 * Upsert one thought into Supabase. Best-effort: any error (RLS, missing
 * table, offline) is logged and swallowed so the caller never breaks.
 */
export async function pushThought(userId: string, thought: PersistedThought): Promise<void> {
  if (!isRealUserId(userId)) return; // sim users never sync remotely
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(thoughtToRow(userId, thought), { onConflict: 'user_id,thought_id' });
    if (error) {
      console.warn('[ThoughtsSync] pushThought failed', error.message);
    }
  } catch (err) {
    console.warn('[ThoughtsSync] pushThought threw', err);
  }
}

/** Delete one thought from Supabase. Best-effort. */
export async function deleteThoughtRemote(userId: string, thoughtId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('thought_id', thoughtId);
    if (error) console.warn('[ThoughtsSync] deleteThoughtRemote failed', error.message);
  } catch (err) {
    console.warn('[ThoughtsSync] deleteThoughtRemote threw', err);
  }
}

// ─── Fetch (called once on app open, for hydration) ─────────────────────────

/**
 * Pull every backed-up thought belonging to `userId`. Returns [] on
 * any error or if the table doesn't exist yet (graceful degradation).
 */
export async function fetchUserThoughts(userId: string): Promise<PersistedThought[]> {
  if (!isRealUserId(userId)) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) {
      console.warn('[ThoughtsSync] fetchUserThoughts failed', error.message);
      return [];
    }
    return (data ?? []).map((row) => rowToThought(row as RemoteThoughtRow));
  } catch (err) {
    console.warn('[ThoughtsSync] fetchUserThoughts threw', err);
    return [];
  }
}

// ─── Merge utilities ────────────────────────────────────────────────────────

/**
 * Non-destructive merge of local + remote for a single user:
 *   • Keys are thought ids.
 *   • If a thought exists on both sides, the one with more messages wins;
 *     ties broken by the newer `updatedAt`. Never silently overwrite a
 *     thread with fewer messages.
 *   • Local-only entries are kept (they may not have been pushed yet).
 *   • Remote-only entries are added (they came from another device or a
 *     previous install).
 *
 * This is deliberately conservative: when in doubt, KEEP, never drop.
 */
export function mergeThoughts(
  local: PersistedThought[],
  remote: PersistedThought[],
): PersistedThought[] {
  const byId = new Map<string, PersistedThought>();
  for (const t of local) byId.set(t.id, t);

  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l) {
      byId.set(r.id, r);
      continue;
    }
    const lMsgs = l.messages?.length ?? 0;
    const rMsgs = r.messages?.length ?? 0;
    if (rMsgs > lMsgs) {
      byId.set(r.id, r);
    } else if (rMsgs === lMsgs) {
      const lT = Date.parse(l.updatedAt) || 0;
      const rT = Date.parse(r.updatedAt) || 0;
      if (rT > lT) byId.set(r.id, r);
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const at = Date.parse(a.updatedAt) || 0;
    const bt = Date.parse(b.updatedAt) || 0;
    return bt - at;
  });
}
