/**
 * ThoughtsProvider — manages every simulated user's saved reflections/phrases.
 *
 * Architecture (v3 — bulletproof per-user persistence)
 * ────────────────────────────────────────────────────
 * - The COMPLETE multi-user database lives in a single state object
 *   (`{ [userId]: PersistedThought[] }`) and a single AsyncStorage key.
 * - Switching simulated users is a pure in-memory slice lookup — it never
 *   loads, saves, clears, or otherwise touches storage.
 * - Every mutation (create/update/remove) writes the WHOLE database snapshot
 *   to disk, so partial/lost-update bugs are impossible.
 * - A one-time load on app start rehydrates all 9 users' content at once.
 *
 * This is intentionally the simplest correct design.  Earlier attempts used
 * per-user storage keys with reactive save effects, which suffered from
 * unrecoverable race conditions on rapid profile switching.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ConversationItem } from '@evoconn/types';
import type { DebateMessage, DebateThread } from '@evoconn/types/debate';
import { getShortTitle } from '@evoconn/types/debate';
import * as api from '@evoconn/services/debateApi';
import {
  loadAllThoughts,
  saveAllThoughts,
  type PersistedThought,
  type ThoughtsDatabase,
} from '@evoconn/services/thoughtsStorage';
import {
  deleteThoughtRemote,
  fetchUserThoughts,
  mergeThoughts,
  pushThought,
} from '@evoconn/services/thoughtsSync';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import { useAuth } from '../../mobile/lib/AuthContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';

export type ThoughtEntry = ConversationItem & {
  /** Cached messages so we can show them instantly when reopening. */
  messages?: DebateMessage[];
  /** Notas privadas del usuario (solo flujo Nueva frase). */
  phraseNotes?: string;
  /** Backend debate id for legacy `phrase_*` local thread ids. */
  backendDebateId?: string;
};

type ThoughtsContextValue = {
  thoughts: ThoughtEntry[];
  /** Create a new reflection thread. Returns the new ID. */
  createThought: (firstMessage: string) => Promise<string>;
  /** Nueva frase (solo local, sin IA). */
  createPhraseThought: (phraseText: string) => Promise<string>;
  /** Update fields on an existing thought (e.g. messages, title, notes). */
  updateThought: (id: string, patch: Partial<ThoughtEntry>) => void;
  /** Delete a thought. */
  removeThought: (id: string) => void;
  /** Load full thread (uses local cache if present). */
  loadThread: (id: string) => Promise<DebateThread | null>;
  /** True while the initial multi-user load is in progress. */
  loading: boolean;
  /** Force-reload from disk (rarely needed). */
  refresh: () => Promise<void>;
};

const ThoughtsContext = createContext<ThoughtsContextValue | null>(null);

export function ThoughtsProvider({ children }: { children: React.ReactNode }) {
  const sim = useSimulation();
  const activeUserId = sim.activeUserId;
  const { profile: authProfile } = useAuth();

  // List of every known user ID — used to migrate any legacy v2 per-user keys.
  const knownUserIds = useMemo(() => Object.keys(sim.users), [sim.users]);

  // ── Supabase backup wiring ─────────────────────────────────────────────────
  //
  // For real (Supabase-authenticated) users we mirror every thought into
  // public.user_thoughts so a reinstall / device switch / backend wipe
  // can never lose history. Mirroring is per-thoughtId debounced so a
  // chat stream of N tokens collapses into one upsert.
  const pushTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const PUSH_DEBOUNCE_MS = 800;

  const schedulePush = useCallback((userId: string, thought: PersistedThought) => {
    if (!isRealUserId(userId)) return;
    const key = `${userId}:${thought.id}`;
    const timers = pushTimersRef.current;
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      timers.delete(key);
      // Snapshot the latest state by re-reading dbRef inside the timer.
      const list = dbRef.current[userId] ?? [];
      const latest = list.find((x) => x.id === thought.id) ?? thought;
      void pushThought(userId, latest);
    }, PUSH_DEBOUNCE_MS);
    timers.set(key, t);
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup all pending timers on unmount.
      for (const t of pushTimersRef.current.values()) clearTimeout(t);
      pushTimersRef.current.clear();
    };
  }, []);

  /**
   * The COMPLETE multi-user thoughts database lives here.  It is the single
   * source of truth: the UI reads `db[activeUserId]`, and every mutation
   * produces a new `db` snapshot that is also written to disk in one shot.
   */
  const [db, setDb] = useState<ThoughtsDatabase>({});
  const [loading, setLoading] = useState(true);

  // Always-current refs for use in async callbacks.
  const dbRef = useRef<ThoughtsDatabase>(db);
  const activeUserIdRef = useRef<string>(activeUserId);

  useLayoutEffect(() => {
    dbRef.current = db;
  }, [db]);

  useLayoutEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  // ── One-time load on mount ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadAllThoughts(knownUserIds);
      if (cancelled) return;
      setDb(loaded);
      setLoading(false);
      // eslint-disable-next-line no-console
      console.log(
        '[THOUGHTS] Loaded multi-user db:',
        Object.fromEntries(
          Object.entries(loaded).map(([uid, list]) => [uid, list.length]),
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
    // knownUserIds is intentionally omitted — first mount uses the snapshot
    // available at that time; user list does not change during a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cross-device recovery: hydrate real user's thoughts from Supabase ─────
  //
  // Runs once per authenticated session (per userId). The merge is
  // non-destructive: if local has a longer thread than remote we keep
  // local, and vice-versa (see mergeThoughts). This protects users who:
  //   • reinstalled the app (local empty → repopulate from remote)
  //   • switched device (same Supabase user, different AsyncStorage)
  //   • survived a backend SQLite wipe (messages now live here too)
  const hydratedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const uid = authProfile?.id;
    if (!uid || !isRealUserId(uid)) return;
    if (loading) return; // wait for the local load to finish first
    if (hydratedRef.current.has(uid)) return;
    hydratedRef.current.add(uid);

    let cancelled = false;
    void (async () => {
      const remote = await fetchUserThoughts(uid);
      if (cancelled || remote.length === 0) return;
      setDb((prev) => {
        const localSlice = prev[uid] ?? [];
        const merged = mergeThoughts(localSlice, remote);
        if (merged.length === localSlice.length && merged.every((m, i) => m === localSlice[i])) {
          return prev; // no-op: nothing actually changed
        }
        const next: ThoughtsDatabase = { ...prev, [uid]: merged };
        saveAllThoughts(next).catch(() => {});
        // eslint-disable-next-line no-console
        console.log('[THOUGHTS] Hydrated from Supabase backup:', uid, 'remote=', remote.length, 'merged=', merged.length);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [authProfile?.id, loading]);

  // ── Core mutation: update one user's slice and persist the whole db ────────

  const mutateUserSlice = useCallback(
    (userId: string, mutator: (prev: PersistedThought[]) => PersistedThought[]) => {
      setDb((prev) => {
        const prevSlice = prev[userId] ?? [];
        const nextSlice = mutator(prevSlice);
        const next: ThoughtsDatabase = { ...prev, [userId]: nextSlice };
        // Fire-and-forget save; in-memory state already has the new value.
        saveAllThoughts(next).catch(() => {});
        return next;
      });
    },
    [],
  );

  // ── Public API: thoughts for the active user ─────────────────────────────────

  const thoughts = useMemo<ThoughtEntry[]>(() => {
    const list = (db[activeUserId] ?? []) as ThoughtEntry[];
    return [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [db, activeUserId]);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createThought = useCallback(
    async (firstMessage: string): Promise<string> => {
      const { id, title } = await api.createDebate(firstMessage);
      const userId = activeUserIdRef.current;
      const entry: PersistedThought = {
        id,
        type: 'reflection',
        title: title || getShortTitle(firstMessage),
        updatedAt: new Date().toISOString(),
        ownerUserId: userId,
      };
      mutateUserSlice(userId, (prev) => [entry, ...prev]);
      schedulePush(userId, entry);
      // eslint-disable-next-line no-console
      console.log(`[THOUGHTS] createThought (reflection) id=${id} ownerUserId=${userId}`);
      return id;
    },
    [mutateUserSlice, schedulePush],
  );

  const createPhraseThought = useCallback(
    async (phraseText: string): Promise<string> => {
      const trimmed = phraseText.trim();
      // Same backend debate store as reflections so follow-up messages can call
      // POST /debates/{id}/chat (legacy local-only `phrase_*` ids could not).
      const { id, title } = await api.createDebate(trimmed);
      const userMsg: DebateMessage = { role: 'user', content: trimmed };
      const publishSlot: DebateMessage = {
        role: 'assistant',
        content: '',
        phrasePublishUI: { status: 'pending' },
      };
      const userId = activeUserIdRef.current;
      const entry: PersistedThought = {
        id,
        type: 'phrase',
        title: title || getShortTitle(trimmed),
        updatedAt: new Date().toISOString(),
        messages: [userMsg, publishSlot],
        ownerUserId: userId,
      };
      mutateUserSlice(userId, (prev) => [entry, ...prev]);
      schedulePush(userId, entry);
      // eslint-disable-next-line no-console
      console.log(`[THOUGHTS] createPhraseThought id=${id} ownerUserId=${userId}`);
      return id;
    },
    [mutateUserSlice, schedulePush],
  );

  const updateThought = useCallback(
    (id: string, patch: Partial<ThoughtEntry>) => {
      // Find which user owns this thought and patch it in their slice.
      // We search across ALL slices because the user might have switched
      // profiles between create and update (e.g. an in-flight AI response
      // resolves after a profile switch — it must still update the original
      // owner's record, not the now-active user's).
      const currentDb = dbRef.current;
      let targetUserId: string | null = null;
      for (const [uid, list] of Object.entries(currentDb)) {
        if (list.some((t) => t.id === id)) {
          targetUserId = uid;
          break;
        }
      }
      if (!targetUserId) {
        // Thought not yet in db (still being created); fall back to active user.
        targetUserId = activeUserIdRef.current;
      }
      mutateUserSlice(targetUserId, (prev) =>
        prev.map((t) =>
          t.id === id
            ? ({
                ...t,
                ...patch,
                updatedAt: new Date().toISOString(),
                ownerUserId: targetUserId!, // keep ownership stable
              } as PersistedThought)
            : t,
        ),
      );
      // Debounced push to Supabase. We look up the latest snapshot inside
      // the timer so streaming updates collapse into a single network call.
      const list = dbRef.current[targetUserId] ?? [];
      const thoughtNow = list.find((t) => t.id === id);
      if (thoughtNow) schedulePush(targetUserId, thoughtNow);
    },
    [mutateUserSlice, schedulePush],
  );

  const removeThought = useCallback(
    (id: string) => {
      const currentDb = dbRef.current;
      let targetUserId: string | null = null;
      let foundThought: PersistedThought | undefined;
      for (const [uid, list] of Object.entries(currentDb)) {
        const found = list.find((t) => t.id === id);
        if (found) {
          targetUserId = uid;
          foundThought = found;
          break;
        }
      }
      if (!targetUserId) return;
      const debateApiId =
        foundThought?.backendDebateId ?? (id.startsWith('phrase_') ? null : id);
      if (debateApiId) {
        api.deleteDebate(debateApiId).catch(() => {});
      }
      mutateUserSlice(targetUserId, (prev) => prev.filter((t) => t.id !== id));
      // Cancel any pending debounced push for this thought + delete remote.
      const key = `${targetUserId}:${id}`;
      const t = pushTimersRef.current.get(key);
      if (t) {
        clearTimeout(t);
        pushTimersRef.current.delete(key);
      }
      void deleteThoughtRemote(targetUserId, id);
    },
    [mutateUserSlice],
  );

  /**
   * Load the full thread for a thought.
   *
   * Strategy:
   *  1. If we have a local cached `messages` array (true for all phrases and
   *     for reflections after their first AI turn), return it instantly.
   *  2. Otherwise, fall back to the backend to fetch the thread, and cache
   *     the result for next time.
   */
  const loadThread = useCallback(
    async (id: string): Promise<DebateThread | null> => {
      const currentDb = dbRef.current;
      let local: PersistedThought | null = null;
      let ownerUserId: string | null = null;
      for (const [uid, list] of Object.entries(currentDb)) {
        const found = list.find((t) => t.id === id);
        if (found) {
          local = found;
          ownerUserId = uid;
          break;
        }
      }

      if (local && (local.messages?.length ?? 0) > 0) {
        return {
          id: local.id,
          title: local.title,
          messages: local.messages ?? [],
          createdAt: Date.parse(local.updatedAt) || Date.now(),
        };
      }

      if (local?.type === 'phrase') {
        return {
          id: local.id,
          title: local.title,
          messages: local.messages ?? [],
          createdAt: Date.parse(local.updatedAt) || Date.now(),
        };
      }

      // Reflection without local messages → fetch from backend.
      const thread = await api.getDebate(id);
      if (thread && ownerUserId) {
        mutateUserSlice(ownerUserId, (prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, messages: thread.messages, title: thread.title }
              : t,
          ),
        );
      }
      return thread;
    },
    [mutateUserSlice],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const loaded = await loadAllThoughts(knownUserIds);
    setDb(loaded);
    setLoading(false);
  }, [knownUserIds]);

  const value = useMemo<ThoughtsContextValue>(
    () => ({
      thoughts,
      createThought,
      createPhraseThought,
      updateThought,
      removeThought,
      loadThread,
      loading,
      refresh,
    }),
    [
      thoughts,
      createThought,
      createPhraseThought,
      updateThought,
      removeThought,
      loadThread,
      loading,
      refresh,
    ],
  );

  return <ThoughtsContext.Provider value={value}>{children}</ThoughtsContext.Provider>;
}

export function useThoughts(): ThoughtsContextValue {
  const ctx = useContext(ThoughtsContext);
  if (!ctx) throw new Error('useThoughts must be used within ThoughtsProvider');
  return ctx;
}
