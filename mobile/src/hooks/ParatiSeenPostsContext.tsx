/**
 * ParatiSeenPostsContext
 * ──────────────────────
 * Remembers which community posts the user has already opened in the vertical
 * "Para ti" viewer. The feed is re-sorted so unseen posts float to the top; seen
 * posts stay available at the bottom so the feed never goes empty.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSimulation } from '@evoconn/hooks/SimulationContext';

const STORAGE_PREFIX = '@evo/parati_seen_posts_v1/';
/** Max distinct post ids kept — oldest evicted first (allows older posts to resurface). */
const MAX_SEEN_IDS = 800;

type StoredV1 = { v: 1; ids: string[] };

type State = { order: string[]; revision: number };

type Action =
  | { type: 'hydrate'; ids: string[] }
  | { type: 'mark'; postId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate': {
      const ids = action.ids.filter((x) => typeof x === 'string' && x.length > 0).slice(-MAX_SEEN_IDS);
      const same =
        ids.length === state.order.length && ids.every((id, i) => id === state.order[i]);
      if (same) return state;
      return { order: ids, revision: state.revision + 1 };
    }
    case 'mark': {
      const postId = action.postId;
      if (!postId) return state;
      const prev = state.order;
      const idx = prev.indexOf(postId);
      if (idx >= 0 && idx === prev.length - 1) return state;
      let next: string[];
      if (idx >= 0) {
        next = [...prev.slice(0, idx), ...prev.slice(idx + 1), postId];
      } else {
        next = [...prev, postId];
        while (next.length > MAX_SEEN_IDS) next.shift();
      }
      return { order: next, revision: state.revision + 1 };
    }
    default:
      return state;
  }
}

type ParatiSeenPostsContextValue = {
  revision: number;
  seenIds: Set<string>;
  markParatiPostSeen: (postId: string) => void;
};

const ParatiSeenPostsContext = createContext<ParatiSeenPostsContextValue | null>(null);

function loadIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw) as StoredV1;
    if (p?.v === 1 && Array.isArray(p.ids)) {
      return p.ids.filter((x) => typeof x === 'string' && x.length > 0);
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function ParatiSeenPostsProvider({ children }: { children: React.ReactNode }) {
  const { activeUserId } = useSimulation();
  const [state, dispatch] = useReducer(reducer, { order: [], revision: 0 });
  const [storageReady, setStorageReady] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `${STORAGE_PREFIX}${activeUserId}`;

  useEffect(() => {
    let cancelled = false;
    setStorageReady(false);
    dispatch({ type: 'hydrate', ids: [] });
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (cancelled) return;
        dispatch({ type: 'hydrate', ids: loadIds(raw) });
        setStorageReady(true);
      })
      .catch(() => {
        if (!cancelled) setStorageReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const schedulePersist = useCallback(
    (ids: string[]) => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        const payload: StoredV1 = { v: 1, ids: ids.slice(-MAX_SEEN_IDS) };
        AsyncStorage.setItem(storageKey, JSON.stringify(payload)).catch(() => {});
      }, 400);
    },
    [storageKey],
  );

  useEffect(() => {
    if (!storageReady) return;
    schedulePersist(state.order);
  }, [storageReady, state.order, schedulePersist]);

  const markParatiPostSeen = useCallback((postId: string) => {
    dispatch({ type: 'mark', postId });
  }, []);

  const seenIds = useMemo(() => new Set(state.order), [state.order]);

  const value = useMemo<ParatiSeenPostsContextValue>(
    () => ({
      revision: state.revision,
      seenIds,
      markParatiPostSeen,
    }),
    [state.revision, seenIds, markParatiPostSeen],
  );

  return (
    <ParatiSeenPostsContext.Provider value={value}>{children}</ParatiSeenPostsContext.Provider>
  );
}

export function useParatiSeenPosts(): ParatiSeenPostsContextValue {
  const ctx = useContext(ParatiSeenPostsContext);
  if (!ctx) {
    throw new Error('useParatiSeenPosts must be used within <ParatiSeenPostsProvider>');
  }
  return ctx;
}