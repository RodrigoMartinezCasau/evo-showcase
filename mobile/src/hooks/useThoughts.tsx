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
 * Reflection messages (AI output) are now persisted locally together with
 * the reflection entry, so threads survive app reloads without an API call.
 * The backend is still used for creating new debate threads (AI generation)
 * and for streaming chat responses.
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
  const thoughtsRef = useRef<ThoughtEntry[]>(thoughts);
  useLayoutEffect(() => {
    thoughtsRef.current = thoughts;
  }, [thoughts]);

  /**
   * `savingForUserId` tracks WHICH user's slot we are currently writing to.
   * It is set synchronously to the new userId BEFORE we clear thoughts during
   * a user switch, preventing the save-on-change effect from writing the old
   * user's cleared state into the new user's key.
   */
  const savingForUserIdRef = useRef<string>(activeUserId);

  // ── Load thoughts for a given userId ────────────────────────────────────────

  const loadForUser = useCallback(async (userId: string) => {
    setLoading(true);
    // 1. Try migration from old global phrase key (no-op if already migrated).
    const migrated = await migrateFromLegacyPhraseStorage(userId);
    // 2. Load user-scoped thoughts from v2 storage.
    const stored = await loadThoughtsForUser(userId);

    // Merge: migrated items that are not already in stored.
    const storedIds = new Set(stored.map((t) => t.id));
    const newItems: PersistedThought[] = migrated.filter((m) => !storedIds.has(m.id));
    const all = [...stored, ...newItems];

    // If we got any migrated items, persist them immediately to the user's slot.
    if (newItems.length > 0) {
      saveThoughtsForUser(userId, all).catch(() => {});
    }

    setThoughts(all.map((t) => t as ThoughtEntry));
    setLoading(false);
  }, []);

  // ── Initial load + reload on user switch ────────────────────────────────────

  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevUserIdRef.current === activeUserId) {
      // First mount: prevUserIdRef not yet set — run load.
      if (prevUserIdRef.current !== null) return;
    }
    prevUserIdRef.current = activeUserId;
    // Point the save-effect at the new user BEFORE clearing state so it never
    // accidentally writes an empty array into the wrong user's key.
    savingForUserIdRef.current = activeUserId;
    // Clear thoughts so the UI immediately stops showing the old user's data.
    setThoughts([]);
    loadForUser(activeUserId);
  }, [activeUserId, loadForUser]);

  // ── Persist thoughts whenever they change ───────────────────────────────────

  useEffect(() => {
    if (loading) return;
    const userId = savingForUserIdRef.current;
    saveThoughtsForUser(
      userId,
      thoughts.map((t) => ({ ...t, ownerUserId: userId } as PersistedThought)),
    ).catch(() => {});
  }, [thoughts, loading]);

  // ── Mutation helpers ─────────────────────────────────────────────────────────

  const createThought = useCallback(
    async (firstMessage: string): Promise<string> => {
      const { id, title } = await api.createDebate(firstMessage);
      const entry: ThoughtEntry = {
        id,
        type: 'reflection',
        title: title || getShortTitle(firstMessage),
        updatedAt: new Date().toISOString(),
        ownerUserId: savingForUserIdRef.current,
      };
      setThoughts((prev) => [entry, ...prev]);
      return id;
    },
    [],
  );

  const createPhraseThought = useCallback(async (phraseText: string): Promise<string> => {
    const trimmed = phraseText.trim();
    const id = `phrase_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const userMsg: DebateMessage = { role: 'user', content: trimmed };
    const publishSlot: DebateMessage = {
      role: 'assistant',
      content: '',
      phrasePublishUI: { status: 'pending' },
    };
    const entry: ThoughtEntry = {
      id,
      type: 'phrase',
      title: getShortTitle(trimmed),
      updatedAt: new Date().toISOString(),
      messages: [userMsg, publishSlot],
      ownerUserId: savingForUserIdRef.current,
    };
    setThoughts((prev) => [entry, ...prev]);
    return id;
  }, []);

  const updateThought = useCallback((id: string, patch: Partial<ThoughtEntry>) => {
    setThoughts((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      ),
    );
  }, []);

  const removeThought = useCallback((id: string) => {
    setThoughts((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target?.type !== 'phrase') {
        api.deleteDebate(id).catch(() => {});
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  /**
   * Load the full thread for a thought.
   *
   * For phrases AND reflections that already have cached messages, the local
   * copy is returned immediately (no network call).  For reflections without a
   * cached message list, we fall back to the backend.
   *
   * The backend fallback is intentionally kept so that reflections created
   * in an earlier session (before v2 storage) can still be viewed.
   */
  const loadThread = useCallback(async (id: string): Promise<DebateThread | null> => {
    const local = thoughtsRef.current.find((t) => t.id === id);

    // If we have messages cached locally (phrases always do; reflections do
    // after their first AI response), return immediately.
    if (local && (local.messages?.length ?? 0) > 0) {
      return {
        id: local.id,
        title: local.title,
        messages: local.messages ?? [],
        createdAt: Date.parse(local.updatedAt) || Date.now(),
      };
    }

    // Phrases without a message cache should not happen, but handle gracefully.
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
      // Cache the fetched messages so future opens are instant.
      setThoughts((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, messages: thread.messages, title: thread.title } : t,
        ),
      );
    }
    return thread;
  }, []);

  const refresh = useCallback(
    () => loadForUser(savingForUserIdRef.current),
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
