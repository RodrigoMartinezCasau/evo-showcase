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
import { useSimulation } from '@evoconn/hooks/SimulationContext';

export type ThoughtEntry = ConversationItem & {
  /** Cached messages so we can show them instantly when reopening. */
  messages?: DebateMessage[];
  /** Notas privadas del usuario (solo flujo Nueva frase). */
  phraseNotes?: string;
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

  // List of every known user ID — used to migrate any legacy v2 per-user keys.
  const knownUserIds = useMemo(() => Object.keys(sim.users), [sim.users]);

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

  const thoughts = useMemo<ThoughtEntry[]>(
    () => (db[activeUserId] ?? []) as ThoughtEntry[],
    [db, activeUserId],
  );

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
      // eslint-disable-next-line no-console
      console.log(`[THOUGHTS] createThought (reflection) id=${id} ownerUserId=${userId}`);
      return id;
    },
    [mutateUserSlice],
  );

  const createPhraseThought = useCallback(
    async (phraseText: string): Promise<string> => {
      const trimmed = phraseText.trim();
      const id = `phrase_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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
        title: getShortTitle(trimmed),
        updatedAt: new Date().toISOString(),
        messages: [userMsg, publishSlot],
        ownerUserId: userId,
      };
      mutateUserSlice(userId, (prev) => [entry, ...prev]);
      // eslint-disable-next-line no-console
      console.log(`[THOUGHTS] createPhraseThought id=${id} ownerUserId=${userId}`);
      return id;
    },
    [mutateUserSlice],
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
    },
    [mutateUserSlice],
  );

  const removeThought = useCallback(
    (id: string) => {
      const currentDb = dbRef.current;
      let targetUserId: string | null = null;
      let targetType: 'reflection' | 'phrase' | undefined;
      for (const [uid, list] of Object.entries(currentDb)) {
        const found = list.find((t) => t.id === id);
        if (found) {
          targetUserId = uid;
          targetType = found.type;
          break;
        }
      }
      if (!targetUserId) return;
      if (targetType !== 'phrase') {
        api.deleteDebate(id).catch(() => {});
      }
      mutateUserSlice(targetUserId, (prev) => prev.filter((t) => t.id !== id));
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
