/**
 * ThoughtsProvider — manages the list of saved reflections/thoughts.
 *
 * Multi-user persistence model (v2)
 * ──────────────────────────────────
 * Each simulated user has their own isolated thought store:
 *   AsyncStorage key: `evoconn_thoughts_v2_{userId}`
 *
 * Rules:
 * - Every new thought is stamped with `ownerUserId = activeUserId`.
 * - Switching simulated users triggers a load of that user's own thoughts.
 * - The previous user's thoughts are saved before clearing state.
 * - No thought belonging to user A ever appears in user B's list.
 *
 * Save strategy (v2.1):
 * - Saves are EXPLICIT at every mutation point (create/update/remove), not
 *   driven by a reactive effect.  This removes all timing/batching ambiguity.
 * - A generation counter prevents stale async loads from overwriting freshly
 *   loaded data when the user switches profiles quickly.
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
  loadThoughtsForUser,
  saveThoughtsForUser,
  migrateFromLegacyPhraseStorage,
  type PersistedThought,
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
  /** Create a new thought (debate) on the backend. Returns the new ID. */
  createThought: (firstMessage: string) => Promise<string>;
  /** Nueva frase (solo local, sin IA): crea conversación tipo `phrase`. */
  createPhraseThought: (phraseText: string) => Promise<string>;
  /** Record that a thought was updated (e.g. new message). */
  updateThought: (id: string, patch: Partial<ThoughtEntry>) => void;
  /** Delete a thought. */
  removeThought: (id: string) => void;
  /** Load full thread from backend (for reopening). */
  loadThread: (id: string) => Promise<DebateThread | null>;
  /** Whether initial load is in progress. */
  loading: boolean;
  /** Reload from storage for the active user. */
  refresh: () => Promise<void>;
};

const ThoughtsContext = createContext<ThoughtsContextValue | null>(null);

export function ThoughtsProvider({ children }: { children: React.ReactNode }) {
  const sim = useSimulation();
  const activeUserId = sim.activeUserId;

  const [thoughts, setThoughts] = useState<ThoughtEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Always-current refs — used in async callbacks to avoid stale closures.
  const thoughtsRef = useRef<ThoughtEntry[]>(thoughts);
  const activeUserIdRef = useRef<string>(activeUserId);

  useLayoutEffect(() => {
    thoughtsRef.current = thoughts;
  }, [thoughts]);

  useLayoutEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  // ── Explicit persist helper ──────────────────────────────────────────────────
  // All mutations call this directly; no reactive save effect needed.

  const persistForUser = useCallback(
    (userId: string, items: ThoughtEntry[]) => {
      saveThoughtsForUser(
        userId,
        items.map((t) => ({ ...t, ownerUserId: userId } as PersistedThought)),
      ).catch(() => {});
    },
    [],
  );

  // ── Load thoughts for a given userId ────────────────────────────────────────
  // Generation counter: each call gets a unique ID.  If a newer load has
  // started by the time this one finishes, we silently discard the result
  // instead of overwriting the correctly-loaded data.

  const loadGenRef = useRef(0);

  const loadForUser = useCallback(
    async (userId: string) => {
      const gen = ++loadGenRef.current;

      const migrated = await migrateFromLegacyPhraseStorage(userId);
      const stored = await loadThoughtsForUser(userId);

      // Stale load — a newer load was started; discard.
      if (loadGenRef.current !== gen) return;

      const storedIds = new Set(stored.map((t) => t.id));
      const newItems: PersistedThought[] = migrated.filter(
        (m) => !storedIds.has(m.id),
      );
      const all = [...stored, ...newItems];

      if (newItems.length > 0) {
        persistForUser(userId, all as ThoughtEntry[]);
      }

      setThoughts(all.map((t) => t as ThoughtEntry));
      setLoading(false);
    },
    [persistForUser],
  );

  // ── React to user switches ───────────────────────────────────────────────────

  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevUserIdRef.current === activeUserId && prevUserIdRef.current !== null) {
      // Same user — nothing to do (guard against spurious re-renders).
      return;
    }

    // Defensive save: persist the current user's data BEFORE clearing state.
    // thoughtsRef is up-to-date because useLayoutEffect ran first.
    const prevUserId = prevUserIdRef.current;
    if (prevUserId) {
      persistForUser(prevUserId, thoughtsRef.current);
    }

    prevUserIdRef.current = activeUserId;

    // Show loading indicator and clear old user's thoughts immediately.
    setLoading(true);
    setThoughts([]);

    // Load the new user's thoughts from storage.
    loadForUser(activeUserId);
  }, [activeUserId, loadForUser, persistForUser]);

  // ── Mutation helpers ─────────────────────────────────────────────────────────

  const createThought = useCallback(
    async (firstMessage: string): Promise<string> => {
      const { id, title } = await api.createDebate(firstMessage);
      const userId = activeUserIdRef.current;
      const entry: ThoughtEntry = {
        id,
        type: 'reflection',
        title: title || getShortTitle(firstMessage),
        updatedAt: new Date().toISOString(),
        ownerUserId: userId,
      };
      // Compute next list before setThoughts so we can persist immediately.
      const nextThoughts = [entry, ...thoughtsRef.current];
      setThoughts(nextThoughts);
      persistForUser(userId, nextThoughts);
      return id;
    },
    [persistForUser],
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
      const entry: ThoughtEntry = {
        id,
        type: 'phrase',
        title: getShortTitle(trimmed),
        updatedAt: new Date().toISOString(),
        messages: [userMsg, publishSlot],
        ownerUserId: userId,
      };
      const nextThoughts = [entry, ...thoughtsRef.current];
      setThoughts(nextThoughts);
      persistForUser(userId, nextThoughts);
      return id;
    },
    [persistForUser],
  );

  const updateThought = useCallback(
    (id: string, patch: Partial<ThoughtEntry>) => {
      const userId = activeUserIdRef.current;
      const nextThoughts = thoughtsRef.current.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      );
      setThoughts(nextThoughts);
      persistForUser(userId, nextThoughts);
    },
    [persistForUser],
  );

  const removeThought = useCallback(
    (id: string) => {
      const userId = activeUserIdRef.current;
      const target = thoughtsRef.current.find((t) => t.id === id);
      if (target?.type !== 'phrase') {
        api.deleteDebate(id).catch(() => {});
      }
      const nextThoughts = thoughtsRef.current.filter((t) => t.id !== id);
      setThoughts(nextThoughts);
      persistForUser(userId, nextThoughts);
    },
    [persistForUser],
  );

  /**
   * Load the full thread for a thought.
   *
   * For phrases AND reflections that already have cached messages, the local
   * copy is returned immediately (no network call).  For reflections without a
   * cached message list, we fall back to the backend.
   *
   * The backend fallback is kept so that reflections created in an earlier
   * session (before v2 storage) can still be viewed.
   */
  const loadThread = useCallback(
    async (id: string): Promise<DebateThread | null> => {
      const local = thoughtsRef.current.find((t) => t.id === id);

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
      if (thread) {
        const userId = activeUserIdRef.current;
        const nextThoughts = thoughtsRef.current.map((t) =>
          t.id === id
            ? { ...t, messages: thread.messages, title: thread.title }
            : t,
        );
        setThoughts(nextThoughts);
        persistForUser(userId, nextThoughts);
      }
      return thread;
    },
    [persistForUser],
  );

  const refresh = useCallback(
    async () => {
      setLoading(true);
      await loadForUser(activeUserIdRef.current);
    },
    [loadForUser],
  );

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
