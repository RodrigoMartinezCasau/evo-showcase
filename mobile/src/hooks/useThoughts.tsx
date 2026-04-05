/**
 * ThoughtsProvider — manages the list of saved reflections/thoughts.
 *
 * Each "thought" corresponds to a backend debate thread.
 * The provider syncs with the backend on mount and exposes helpers
 * to add / remove / list thoughts that the sidebar "Pensamientos"
 * section and the ThoughtScreen consume.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ConversationItem } from '@evoconn/types';
import type { DebateMessage, DebateThread } from '@evoconn/types/debate';
import { getShortTitle } from '@evoconn/types/debate';
import * as api from '@evoconn/services/debateApi';

export type ThoughtEntry = ConversationItem & {
  /** Cached messages so we can show them instantly when reopening. */
  messages?: DebateMessage[];
};

type ThoughtsContextValue = {
  thoughts: ThoughtEntry[];
  /** Create a new thought (debate) on the backend. Returns the new ID. */
  createThought: (firstMessage: string) => Promise<string>;
  /** Record that a thought was updated (e.g. new message). */
  updateThought: (id: string, patch: Partial<ThoughtEntry>) => void;
  /** Delete a thought. */
  removeThought: (id: string) => void;
  /** Load full thread from backend (for reopening). */
  loadThread: (id: string) => Promise<DebateThread | null>;
  /** Whether initial load from backend is in progress. */
  loading: boolean;
  /** Refresh the list from backend. */
  refresh: () => Promise<void>;
};

const ThoughtsContext = createContext<ThoughtsContextValue | null>(null);

export function ThoughtsProvider({ children }: { children: React.ReactNode }) {
  const [thoughts, setThoughts] = useState<ThoughtEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const didFetch = useRef(false);

  const fetchFromBackend = useCallback(async () => {
    try {
      const list = await api.fetchDebates();
      const entries: ThoughtEntry[] = list.map((d) => ({
        id: d.id,
        type: 'reflection' as const,
        title: d.title || 'Nuevo debate',
        updatedAt: d.updated_at,
        isFavorite: d.is_favorite,
        folderId: d.folder_id,
      }));
      setThoughts(entries);
    } catch {
      // Backend unreachable — keep whatever we have locally.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    fetchFromBackend();
  }, [fetchFromBackend]);

  const createThought = useCallback(async (firstMessage: string): Promise<string> => {
    const { id, title } = await api.createDebate(firstMessage);
    const entry: ThoughtEntry = {
      id,
      type: 'reflection',
      title: title || getShortTitle(firstMessage),
      updatedAt: new Date().toISOString(),
    };
    setThoughts((prev) => [entry, ...prev]);
    return id;
  }, []);

  const updateThought = useCallback((id: string, patch: Partial<ThoughtEntry>) => {
    setThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)),
    );
  }, []);

  const removeThought = useCallback((id: string) => {
    api.deleteDebate(id).catch(() => {});
    setThoughts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadThread = useCallback(async (id: string): Promise<DebateThread | null> => {
    const thread = await api.getDebate(id);
    if (thread) {
      setThoughts((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, messages: thread.messages, title: thread.title } : t,
        ),
      );
    }
    return thread;
  }, []);

  const value = useMemo<ThoughtsContextValue>(
    () => ({
      thoughts,
      createThought,
      updateThought,
      removeThought,
      loadThread,
      loading,
      refresh: fetchFromBackend,
    }),
    [thoughts, createThought, updateThought, removeThought, loadThread, loading, fetchFromBackend],
  );

  return <ThoughtsContext.Provider value={value}>{children}</ThoughtsContext.Provider>;
}

export function useThoughts(): ThoughtsContextValue {
  const ctx = useContext(ThoughtsContext);
  if (!ctx) throw new Error('useThoughts must be used within ThoughtsProvider');
  return ctx;
}
