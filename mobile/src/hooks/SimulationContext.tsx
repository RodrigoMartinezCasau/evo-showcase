/**
 * SimulationContext — master reactive store for the 9-user simulation.
 *
 * All other contexts (PersonalProfileContext, useFollowState, useFeedStore,
 * DebugStatsContext, DebugClanContext) derive their data from here.
 *
 * Switching activeUserId is equivalent to "logging in as" a different simulated user.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  SIM_USERS,
  SIM_USERS_BY_ID,
  SIM_POSTS,
  SIM_FOLLOW_GRAPH,
  type SimUser,
  type SimPost,
  type FollowGraph,
} from '@evoconn/data/simulation/simulatedNetwork';
import { setActiveSimUser } from '@evoconn/data/mockUser';

// ─── State initialisers ───────────────────────────────────────────────────────

/** userId → Set of postIds the user has saved. Initialised from SIM_POSTS.saverIds. */
function buildInitialSavedMap(posts: SimPost[]): Record<string, Set<string>> {
  const map: Record<string, Set<string>> = {};
  for (const post of posts) {
    for (const uid of post.saverIds) {
      if (!map[uid]) map[uid] = new Set();
      map[uid].add(post.id);
    }
  }
  return map;
}

/** userId → { postId → 'up' | 'down' }. Initialised from SIM_POSTS.upvoterIds/downvoterIds. */
function buildInitialVoteMap(
  posts: SimPost[],
): Record<string, Record<string, 'up' | 'down'>> {
  const map: Record<string, Record<string, 'up' | 'down'>> = {};
  for (const post of posts) {
    for (const uid of post.upvoterIds) {
      if (!map[uid]) map[uid] = {};
      map[uid][post.id] = 'up';
    }
    for (const uid of post.downvoterIds) {
      if (!map[uid]) map[uid] = {};
      map[uid][post.id] = 'down';
    }
  }
  return map;
}

/** Deep-copy the follow graph so mutations don't affect the seed. */
function copyFollowGraph(graph: FollowGraph): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(graph).map(([k, v]) => [k, [...v]]),
  );
}

// ─── Context type ─────────────────────────────────────────────────────────────

export type SimulationContextValue = {
  /** Currently active ("logged-in") simulated user ID. */
  activeUserId: string;
  setActiveUserId: (id: string) => void;

  /** All 9 sim users, keyed by id. */
  users: Record<string, SimUser>;

  /** All posts in the network (mutable — includes new posts from this session). */
  posts: SimPost[];

  /** followerId → Set of followed userIds. */
  followGraph: Record<string, Set<string>>;

  /** userId → Set of saved postIds. */
  savedMap: Record<string, Set<string>>;

  /** userId → { postId → 'up' | 'down' }. */
  voteMap: Record<string, Record<string, 'up' | 'down'>>;

  /** userId → Set of postIds hidden from public. */
  hiddenMap: Record<string, Set<string>>;

  // ── Derived helpers for the active user ─────────────────────────────────
  activeUser: SimUser;
  /** Number of users following the active user. */
  activeFollowersCount: number;
  /** Number of users the active user follows. */
  activeFollowingCount: number;

  // ── Actions ──────────────────────────────────────────────────────────────
  follow: (fromId: string, toId: string) => void;
  unfollow: (fromId: string, toId: string) => void;
  toggleFollow: (fromId: string, toId: string) => void;
  castVote: (userId: string, postId: string, newVote: 'up' | 'down' | null) => void;
  toggleSave: (userId: string, postId: string) => void;
  deletePost: (authorId: string, postId: string) => void;
  toggleHidePost: (userId: string, postId: string) => void;
  publishPost: (post: SimPost) => void;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const SimCtx = createContext<SimulationContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [activeUserId, setActiveUserIdRaw] = useState('u1');
  const [posts, setPosts] = useState<SimPost[]>(() => SIM_POSTS.map(p => ({ ...p })));
  const [followGraph, setFollowGraph] = useState<Record<string, string[]>>(
    () => copyFollowGraph(SIM_FOLLOW_GRAPH),
  );
  // Convert to Set<string> internally for O(1) lookups, stored as arrays in state
  const [savedMapArr, setSavedMapArr] = useState<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    for (const post of SIM_POSTS) {
      for (const uid of post.saverIds) {
        if (!m[uid]) m[uid] = [];
        m[uid].push(post.id);
      }
    }
    return m;
  });
  const [voteMapRaw, setVoteMapRaw] = useState<Record<string, Record<string, 'up' | 'down'>>>(
    () => buildInitialVoteMap(SIM_POSTS),
  );
  const [hiddenMapArr, setHiddenMapArr] = useState<Record<string, string[]>>({});

  // Convert array-based maps to Set-based maps (memoised) for O(1) lookups by consumers
  const followGraph_sets = useMemo<Record<string, Set<string>>>(
    () => Object.fromEntries(Object.entries(followGraph).map(([k, v]) => [k, new Set(v)])),
    [followGraph],
  );
  const savedMap = useMemo<Record<string, Set<string>>>(
    () => Object.fromEntries(Object.entries(savedMapArr).map(([k, v]) => [k, new Set(v)])),
    [savedMapArr],
  );
  const hiddenMap = useMemo<Record<string, Set<string>>>(
    () => Object.fromEntries(Object.entries(hiddenMapArr).map(([k, v]) => [k, new Set(v)])),
    [hiddenMapArr],
  );

  const users = useMemo<Record<string, SimUser>>(
    () => SIM_USERS_BY_ID,
    [],
  );

  const activeUser = users[activeUserId] ?? SIM_USERS[0];

  // Derived follower/following counts for the active user
  const activeFollowersCount = useMemo(
    () => Object.values(followGraph).filter(arr => arr.includes(activeUserId)).length,
    [followGraph, activeUserId],
  );
  const activeFollowingCount = useMemo(
    () => (followGraph[activeUserId] ?? []).length,
    [followGraph, activeUserId],
  );

  // ── Keep mockCurrentUser in sync ──────────────────────────────────────────
  useEffect(() => {
    setActiveSimUser({
      id: activeUser.id,
      username: activeUser.username,
      clanId: activeUser.clanId,
      rank: activeUser.rank,
      followersCount: activeFollowersCount,
      followingCount: activeFollowingCount,
    });
  }, [activeUser, activeFollowersCount, activeFollowingCount]);

  // ── setActiveUserId ───────────────────────────────────────────────────────
  const setActiveUserId = useCallback((id: string) => {
    if (users[id]) setActiveUserIdRaw(id);
  }, [users]);

  // ── Follow actions ────────────────────────────────────────────────────────
  const follow = useCallback((fromId: string, toId: string) => {
    setFollowGraph(prev => {
      const arr = prev[fromId] ?? [];
      if (arr.includes(toId)) return prev;
      return { ...prev, [fromId]: [...arr, toId] };
    });
  }, []);

  const unfollow = useCallback((fromId: string, toId: string) => {
    setFollowGraph(prev => {
      const arr = prev[fromId] ?? [];
      if (!arr.includes(toId)) return prev;
      return { ...prev, [fromId]: arr.filter(id => id !== toId) };
    });
  }, []);

  const toggleFollow = useCallback((fromId: string, toId: string) => {
    setFollowGraph(prev => {
      const arr = prev[fromId] ?? [];
      if (arr.includes(toId)) {
        return { ...prev, [fromId]: arr.filter(id => id !== toId) };
      }
      return { ...prev, [fromId]: [...arr, toId] };
    });
  }, []);

  // ── Vote ──────────────────────────────────────────────────────────────────
  // We need previousVote to correctly adjust upvoterIds/downvoterIds on the post.
  // voteMapRef gives us a stable ref to the current voteMap without stale closure issues.
  const voteMapRef = useRef(voteMapRaw);
  useEffect(() => { voteMapRef.current = voteMapRaw; }, [voteMapRaw]);

  const castVote = useCallback(
    (userId: string, postId: string, newVote: 'up' | 'down' | null) => {
      const previousVote = voteMapRef.current[userId]?.[postId] ?? null;
      if (previousVote === newVote) return;

      // Update voteMap
      setVoteMapRaw(prev => {
        const updated = { ...prev, [userId]: { ...(prev[userId] ?? {}) } };
        if (newVote === null) {
          delete updated[userId][postId];
        } else {
          updated[userId][postId] = newVote;
        }
        return updated;
      });

      // Update post's voter ID arrays
      setPosts(prev =>
        prev.map(p => {
          if (p.id !== postId) return p;
          let { upvoterIds, downvoterIds } = p;
          if (previousVote === 'up') upvoterIds = upvoterIds.filter(id => id !== userId);
          if (previousVote === 'down') downvoterIds = downvoterIds.filter(id => id !== userId);
          if (newVote === 'up') upvoterIds = [...upvoterIds, userId];
          if (newVote === 'down') downvoterIds = [...downvoterIds, userId];
          return { ...p, upvoterIds, downvoterIds };
        }),
      );
    },
    [], // intentionally empty — uses voteMapRef for fresh reads
  );

  // ── Save ──────────────────────────────────────────────────────────────────
  const toggleSave = useCallback((userId: string, postId: string) => {
    setSavedMapArr(prev => {
      const arr = prev[userId] ?? [];
      const alreadySaved = arr.includes(postId);
      return {
        ...prev,
        [userId]: alreadySaved ? arr.filter(id => id !== postId) : [...arr, postId],
      };
    });
    // Also update saverIds on the post itself (so save count is always derivable)
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p;
        const alreadySaved = p.saverIds.includes(userId);
        return {
          ...p,
          saverIds: alreadySaved
            ? p.saverIds.filter(id => id !== userId)
            : [...p.saverIds, userId],
        };
      }),
    );
  }, []);

  // ── Delete / Hide post ────────────────────────────────────────────────────
  const deletePost = useCallback((authorId: string, postId: string) => {
    setPosts(prev => prev.filter(p => !(p.id === postId && p.authorId === authorId)));
  }, []);

  const toggleHidePost = useCallback((userId: string, postId: string) => {
    setHiddenMapArr(prev => {
      const arr = prev[userId] ?? [];
      return {
        ...prev,
        [userId]: arr.includes(postId)
          ? arr.filter(id => id !== postId)
          : [...arr, postId],
      };
    });
  }, []);

  // ── Publish ───────────────────────────────────────────────────────────────
  const publishPost = useCallback((post: SimPost) => {
    setPosts(prev => [post, ...prev]);
  }, []);

  // ─── Context value ─────────────────────────────────────────────────────────
  const value = useMemo<SimulationContextValue>(
    () => ({
      activeUserId,
      setActiveUserId,
      users,
      posts,
      followGraph: followGraph_sets,
      savedMap,
      voteMap: voteMapRaw,
      hiddenMap,
      activeUser,
      activeFollowersCount,
      activeFollowingCount,
      follow,
      unfollow,
      toggleFollow,
      castVote,
      toggleSave,
      deletePost,
      toggleHidePost,
      publishPost,
    }),
    [
      activeUserId, setActiveUserId, users, posts,
      followGraph_sets, savedMap, voteMapRaw, hiddenMap,
      activeUser, activeFollowersCount, activeFollowingCount,
      follow, unfollow, toggleFollow, castVote, toggleSave,
      deletePost, toggleHidePost, publishPost,
    ],
  );

  return <SimCtx.Provider value={value}>{children}</SimCtx.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimCtx);
  if (!ctx) throw new Error('useSimulation must be used inside <SimulationProvider>');
  return ctx;
}
