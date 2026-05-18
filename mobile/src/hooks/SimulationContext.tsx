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
  isPublishedSimPostType,
  type SimUser,
  type SimPost,
  type SimComment,
  type FollowGraph,
} from '@evoconn/data/simulation/simulatedNetwork';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setActiveSimUser, mockCurrentUser } from '@evoconn/data/mockUser';
import { useAuth } from '../../mobile/lib/AuthContext';
import { supabase } from '../../mobile/lib/supabase';
import { primeFollowProfileIds } from '@evoconn/hooks/followProfilePrime';
import {
  isRealUserId,
  fetchAllPosts,
  fetchVotesForPosts,
  fetchMyVotes,
  fetchMySaves,
  fetchFollowing,
  fetchFollowers,
  fetchCommentsForPost,
  insertPost,
  removePost,
  upsertVote,
  deleteVote as dbDeleteVote,
  insertSave,
  deleteSave as dbDeleteSave,
  insertFollow,
  deleteFollow as dbDeleteFollow,
  insertComment,
  dbRowToSimPost,
} from '@evoconn/services/supabaseSocial';

// v2: bumped to wipe cached sim data and start fresh for public launch
// v3: bumped to wipe old posts/comments that lack authorUsername snapshot fields.
const SIM_POSTS_STORAGE_KEY    = '@physicscopilot/sim_posts_v3';
const SIM_VOTES_STORAGE_KEY    = '@physicscopilot/sim_votes_v2';
const SIM_FOLLOW_STORAGE_KEY   = '@physicscopilot/sim_follow_v2';
const SIM_COMMENTS_STORAGE_KEY = '@physicscopilot/sim_comments_v3';
const SIM_SAVED_STORAGE_KEY    = '@physicscopilot/sim_saved_v1';
const SIM_HIDDEN_STORAGE_KEY   = '@physicscopilot/sim_hidden_v1';

/** Shared fetch for real-user Supabase hydration + manual “Para ti” feed refresh. */
async function loadSupabaseHydrationPayload(hydrateFor: string): Promise<{
  sbPosts: SimPost[];
  myVotesMap: Record<string, 'up' | 'down'>;
  mySavedPostIds: string[];
  following: string[];
  followers: string[];
  commentsByPost: Record<string, SimComment[]>;
}> {
  const sbPosts = await fetchAllPosts();
  const postIds = sbPosts.map(p => p.id);
  const allVoteRows = await fetchVotesForPosts(postIds);
  for (const row of allVoteRows) {
    const post = sbPosts.find(p => p.id === row.post_id);
    if (!post) continue;
    if (row.vote === 'up') post.upvoterIds = [...post.upvoterIds, row.user_id];
    if (row.vote === 'down') post.downvoterIds = [...post.downvoterIds, row.user_id];
  }

  const myVotesMap = await fetchMyVotes(hydrateFor);
  const mySavedPostIds = await fetchMySaves(hydrateFor);
  for (const pid of mySavedPostIds) {
    const post = sbPosts.find(p => p.id === pid);
    if (post) post.saverIds = [...post.saverIds, hydrateFor];
  }

  const [following, followers] = await Promise.all([
    fetchFollowing(hydrateFor),
    fetchFollowers(hydrateFor),
  ]);

  const allComments = await Promise.all(postIds.map(id => fetchCommentsForPost(id)));
  const commentsByPost: Record<string, SimComment[]> = {};
  postIds.forEach((id, i) => {
    if (allComments[i].length > 0) commentsByPost[id] = allComments[i];
  });

  return { sbPosts, myVotesMap, mySavedPostIds, following, followers, commentsByPost };
}

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

  /** postId → persisted comments for that post. */
  commentsMap: Record<string, SimComment[]>;

  // ── Actions ──────────────────────────────────────────────────────────────
  follow: (fromId: string, toId: string) => void;
  unfollow: (fromId: string, toId: string) => void;
  toggleFollow: (fromId: string, toId: string) => void;
  castVote: (userId: string, postId: string, newVote: 'up' | 'down' | null) => void;
  toggleSave: (userId: string, postId: string) => void;
  deletePost: (authorId: string, postId: string) => void;
  toggleHidePost: (userId: string, postId: string) => void;
  publishPost: (post: SimPost) => void;
  addComment: (comment: SimComment) => Promise<void>;
  /** Lazily fetch fresh comments from Supabase for a specific post. */
  ensureCommentsForPost: (postId: string) => Promise<void>;
  /**
   * Re-fetch posts, votes, saves, follows, and comments from Supabase (real users only).
   * Sim users: resets the post list to `SIM_POSTS`. Returns the post array after refresh.
   */
  refreshSocialFromSupabase: () => Promise<SimPost[]>;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const SimCtx = createContext<SimulationContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { profile: authProfile, session, loading: authLoading } = useAuth();
  const [activeUserId, setActiveUserIdRaw] = useState('u1');
  const activeUserIdRef = useRef(activeUserId);
  activeUserIdRef.current = activeUserId;

  // When a real Supabase user is authenticated (UUID not in the 9-user sim),
  // make activeUserId equal to their UUID. This ensures ALL sim-backed features
  // (saves, follow graph, posts filter, notifications) use the correct key.
  //
  // Use session.user.id as fallback when profile is still loading or failed:
  // otherwise activeUserId stays 'u1' and fetchMyNotifications never runs for
  // the real account (empty notification list despite rows in Supabase).
  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      setActiveUserIdRaw('u1');
      return;
    }
    const id = authProfile?.id ?? session.user.id;
    if (id && !SIM_USERS_BY_ID[id]) {
      setActiveUserIdRaw(id);
    }
  }, [authProfile?.id, session?.user, authLoading]);

  // ── Posts ─────────────────────────────────────────────────────────────────
  const [posts, setPosts] = useState<SimPost[]>(() => SIM_POSTS.map(p => ({ ...p })));

  // Hydration guards — prevent saves from overwriting storage before loading completes.
  const postsHydrated  = useRef(false);
  const votesHydrated  = useRef(false);
  const followHydrated = useRef(false);
  const commentsHydrated = useRef(false);

  // ── Supabase hydration for real users ────────────────────────────────────
  // When the authenticated user's UUID is known, load ALL social data from
  // Supabase so the app is consistent across devices.
  // Re-runs on every real `activeUserId` change (account switch) with cancellation.
  useEffect(() => {
    if (!isRealUserId(activeUserId)) return;

    let cancelled = false;
    const hydrateFor = activeUserId;

    (async () => {
      console.log('[Social] Hydrating from Supabase for user', hydrateFor);

      const payload = await loadSupabaseHydrationPayload(hydrateFor);

      if (cancelled || activeUserIdRef.current !== hydrateFor) return;

      // ── Apply to state ──────────────────────────────────────────────────
      setPosts(() => payload.sbPosts);
      setVoteMapRaw(prev => ({
        ...prev,
        [hydrateFor]: payload.myVotesMap,
      }));
      setSavedMapArr(prev => {
        const updated = { ...prev };
        updated[hydrateFor] = payload.mySavedPostIds;
        return updated;
      });
      setFollowGraph(prev => {
        const updated = { ...prev };
        const prevMine = prev[hydrateFor] ?? [];
        updated[hydrateFor] = [...new Set([...payload.following, ...prevMine])];
        for (const followerId of payload.followers) {
          updated[followerId] = [
            ...new Set([...(updated[followerId] ?? []), hydrateFor]),
          ];
        }
        return updated;
      });
      setCommentsMap(prev => ({ ...prev, ...payload.commentsByPost }));

      postsHydrated.current  = true;
      votesHydrated.current  = true;
      followHydrated.current = true;
      commentsHydrated.current = true;
      savedHydrated.current  = true;
      console.log('[Social] Supabase hydration complete. Posts:', payload.sbPosts.length);
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  // ── Realtime subscription for new posts (real users only) ────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realtimeSubRef = useRef<any>(null);
  useEffect(() => {
    if (!isRealUserId(activeUserId)) return;
    // Subscribe after hydration settles (tiny delay avoids double-processing seed data).
    const timer = setTimeout(() => {
      const ch = supabase
        .channel('public:posts:realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'posts' },
          (payload: { new: Record<string, unknown> }) => {
            if (!isPublishedSimPostType(payload.new.type)) return;
            const newPost: SimPost = dbRowToSimPost(payload.new);
            setPosts((prev) => {
              if (prev.some((p) => p.id === newPost.id)) return prev;
              return [newPost, ...prev];
            });
          },
        )
        .subscribe();
      realtimeSubRef.current = ch;
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (realtimeSubRef.current) {
        supabase.removeChannel(realtimeSubRef.current);
        realtimeSubRef.current = null;
      }
    };
  }, [activeUserId]);

  // ── Realtime: follows involving the active user (keeps graph + counts fresh) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const followsRealtimeRef = useRef<any>(null);
  useEffect(() => {
    if (!isRealUserId(activeUserId)) return;
    const timer = setTimeout(() => {
      const ch = supabase
        .channel(`public:follows:${activeUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'follows',
            filter: `follower_id=eq.${activeUserId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const row = payload.new as { follower_id: string; following_id: string };
            setFollowGraph(prev => {
              const arr = prev[row.follower_id] ?? [];
              if (arr.includes(row.following_id)) return prev;
              return { ...prev, [row.follower_id]: [...arr, row.following_id] };
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'follows',
            filter: `follower_id=eq.${activeUserId}`,
          },
          (payload: { old: Record<string, unknown> }) => {
            const row = payload.old as { follower_id: string; following_id: string };
            setFollowGraph(prev => {
              const arr = prev[row.follower_id] ?? [];
              return { ...prev, [row.follower_id]: arr.filter(id => id !== row.following_id) };
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'follows',
            filter: `following_id=eq.${activeUserId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const row = payload.new as { follower_id: string; following_id: string };
            setFollowGraph(prev => {
              const fid = row.follower_id;
              const target = row.following_id;
              const arr = prev[fid] ?? [];
              if (arr.includes(target)) return prev;
              return { ...prev, [fid]: [...arr, target] };
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'follows',
            filter: `following_id=eq.${activeUserId}`,
          },
          (payload: { old: Record<string, unknown> }) => {
            const row = payload.old as { follower_id: string; following_id: string };
            setFollowGraph(prev => {
              const fid = row.follower_id;
              const target = row.following_id;
              const arr = prev[fid] ?? [];
              return { ...prev, [fid]: arr.filter(id => id !== target) };
            });
          },
        )
        .subscribe();
      followsRealtimeRef.current = ch;
    }, 1800);

    return () => {
      clearTimeout(timer);
      if (followsRealtimeRef.current) {
        supabase.removeChannel(followsRealtimeRef.current);
        followsRealtimeRef.current = null;
      }
    };
  }, [activeUserId]);

  // Load persisted posts on mount for sim users (AsyncStorage fallback)
  useEffect(() => {
    if (isRealUserId(activeUserId)) return; // Real users: use Supabase above.
    AsyncStorage.getItem(SIM_POSTS_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const raw_parsed = JSON.parse(raw) as SimPost[];
            if (Array.isArray(raw_parsed) && raw_parsed.length > 0) {
              const seenIds = new Set<string>();
              const saved = raw_parsed.filter((p) => {
                if (seenIds.has(p.id)) return false;
                seenIds.add(p.id);
                return isPublishedSimPostType(p.type);
              });
              if (saved.length !== raw_parsed.length) {
                AsyncStorage.setItem(SIM_POSTS_STORAGE_KEY, JSON.stringify(saved)).catch(console.error);
              }
              setPosts((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const newOnes = saved.filter((p) => !existingIds.has(p.id));
                return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
              });
            }
          } catch { /* ignore parse errors */ }
        }
        postsHydrated.current = true;
      })
      .catch(() => { postsHydrated.current = true; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Follow graph ──────────────────────────────────────────────────────────
  const [followGraph, setFollowGraph] = useState<Record<string, string[]>>(
    () => copyFollowGraph(SIM_FOLLOW_GRAPH),
  );

  useEffect(() => {
    AsyncStorage.getItem(SIM_FOLLOW_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Record<string, string[]>;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              setFollowGraph(parsed);
            }
          } catch { /* ignore */ }
        }
        followHydrated.current = true;
      })
      .catch(() => { followHydrated.current = true; });
  }, []);

  useEffect(() => {
    if (!followHydrated.current) return;
    AsyncStorage.setItem(SIM_FOLLOW_STORAGE_KEY, JSON.stringify(followGraph)).catch(console.error);
  }, [followGraph]);

  // ── Vote map ──────────────────────────────────────────────────────────────
  const [voteMapRaw, setVoteMapRaw] = useState<Record<string, Record<string, 'up' | 'down'>>>(
    () => buildInitialVoteMap(SIM_POSTS),
  );

  useEffect(() => {
    AsyncStorage.getItem(SIM_VOTES_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Record<string, Record<string, 'up' | 'down'>>;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              setVoteMapRaw(parsed);
              // Rebuild posts' upvoterIds/downvoterIds from the persisted vote map
              // so vote counts are correct even before any new votes are cast.
              setPosts(prev => prev.map(p => {
                const newUp: string[] = [];
                const newDown: string[] = [];
                for (const [uid, votes] of Object.entries(parsed)) {
                  if (votes[p.id] === 'up') newUp.push(uid);
                  else if (votes[p.id] === 'down') newDown.push(uid);
                }
                const changed =
                  newUp.sort().join() !== [...p.upvoterIds].sort().join() ||
                  newDown.sort().join() !== [...p.downvoterIds].sort().join();
                return changed ? { ...p, upvoterIds: newUp, downvoterIds: newDown } : p;
              }));
            }
          } catch { /* ignore */ }
        }
        votesHydrated.current = true;
      })
      .catch(() => { votesHydrated.current = true; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!votesHydrated.current) return;
    AsyncStorage.setItem(SIM_VOTES_STORAGE_KEY, JSON.stringify(voteMapRaw)).catch(console.error);
  }, [voteMapRaw]);

  // ── Comments ──────────────────────────────────────────────────────────────
  /** postId → SimComment[] */
  const [commentsMap, setCommentsMap] = useState<Record<string, SimComment[]>>({});

  useEffect(() => {
    AsyncStorage.getItem(SIM_COMMENTS_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Record<string, SimComment[]>;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              setCommentsMap(parsed);
            }
          } catch { /* ignore */ }
        }
        commentsHydrated.current = true;
      })
      .catch(() => { commentsHydrated.current = true; });
  }, []);

  useEffect(() => {
    if (!commentsHydrated.current) return;
    AsyncStorage.setItem(SIM_COMMENTS_STORAGE_KEY, JSON.stringify(commentsMap)).catch(console.error);
  }, [commentsMap]);

  // ── Saved map ─────────────────────────────────────────────────────────────
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
  const savedHydrated = useRef(false);

  // Load persisted saved map on mount.
  useEffect(() => {
    AsyncStorage.getItem(SIM_SAVED_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              setSavedMapArr((prev) => ({ ...prev, ...parsed }));
            }
          } catch { /* ignore */ }
        }
        savedHydrated.current = true;
      })
      .catch(() => { savedHydrated.current = true; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist saved map on every change after initial hydration.
  useEffect(() => {
    if (!savedHydrated.current) return;
    AsyncStorage.setItem(SIM_SAVED_STORAGE_KEY, JSON.stringify(savedMapArr)).catch(console.error);
  }, [savedMapArr]);
  const hiddenHydrated = useRef(false);
  const [hiddenMapArr, setHiddenMapArr] = useState<Record<string, string[]>>({});

  // Load persisted hidden map on mount.
  useEffect(() => {
    AsyncStorage.getItem(SIM_HIDDEN_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try { setHiddenMapArr(JSON.parse(raw)); } catch {}
        }
      })
      .finally(() => { hiddenHydrated.current = true; });
  }, []);

  // Persist hidden map on every change after initial hydration.
  useEffect(() => {
    if (!hiddenHydrated.current) return;
    AsyncStorage.setItem(SIM_HIDDEN_STORAGE_KEY, JSON.stringify(hiddenMapArr)).catch(console.error);
  }, [hiddenMapArr]);

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

  // For real authenticated users (UUID not in SIM), activeUser may be undefined.
  // Callers that need a SimUser should check for undefined before using.
  const activeUser = users[activeUserId];

  // Derived follower/following counts for the active user
  const activeFollowersCount = useMemo(
    () => Object.values(followGraph).filter(arr => arr.includes(activeUserId)).length,
    [followGraph, activeUserId],
  );
  const activeFollowingCount = useMemo(
    () => (followGraph[activeUserId] ?? []).length,
    [followGraph, activeUserId],
  );

  // ── Keep mockCurrentUser in sync ─────────────────────────────────────────
  // For simulated users: sync from SimulationContext.
  useEffect(() => {
    if (!activeUser) return;
    setActiveSimUser({
      id: activeUser.id,
      username: activeUser.username,
      clanId: activeUser.clanId,
      rank: activeUser.rank,
      followersCount: activeFollowersCount,
      followingCount: activeFollowingCount,
    });
  }, [activeUser, activeFollowersCount, activeFollowingCount]);

  // Real-user clan sync → EffectiveClanSync (ClassificationProvider tree).

  // ── setActiveUserId ───────────────────────────────────────────────────────
  const setActiveUserId = useCallback((id: string) => {
    setActiveUserIdRaw(id);
  }, []);

  // ── Follow actions ────────────────────────────────────────────────────────
  const follow = useCallback((fromId: string, toId: string) => {
    let added = false;
    setFollowGraph(prev => {
      const arr = prev[fromId] ?? [];
      if (arr.includes(toId)) return prev;
      added = true;
      return { ...prev, [fromId]: [...arr, toId] };
    });
    if (added) {
      insertFollow(fromId, toId);
      primeFollowProfileIds([toId]);
    }
  }, []);

  const unfollow = useCallback((fromId: string, toId: string) => {
    let removed = false;
    setFollowGraph(prev => {
      const arr = prev[fromId] ?? [];
      if (!arr.includes(toId)) return prev;
      removed = true;
      return { ...prev, [fromId]: arr.filter(id => id !== toId) };
    });
    if (removed) dbDeleteFollow(fromId, toId);
  }, []);

  const toggleFollow = useCallback((fromId: string, toId: string) => {
    let willFollow = false;
    setFollowGraph(prev => {
      const arr = prev[fromId] ?? [];
      const wasFollowing = arr.includes(toId);
      willFollow = !wasFollowing;
      return willFollow
        ? { ...prev, [fromId]: [...arr, toId] }
        : { ...prev, [fromId]: arr.filter(id => id !== toId) };
    });
    if (willFollow) {
      insertFollow(fromId, toId);
      primeFollowProfileIds([toId]);
    } else {
      dbDeleteFollow(fromId, toId);
    }
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

      // Write to Supabase (fire-and-forget).
      if (newVote === null) dbDeleteVote(userId, postId);
      else upsertVote(userId, postId, newVote);

      // Update voteMap
      setVoteMapRaw(prev => {
        const updated = { ...prev, [userId]: { ...(prev[userId] ?? {}) } };
        if (newVote === null) {
          delete updated[userId][postId];
        } else {
          updated[userId][postId] = newVote;
        }
        // Persist for sim users only.
        if (!isRealUserId(userId) && votesHydrated.current) {
          AsyncStorage.setItem(SIM_VOTES_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
        }
        return updated;
      });

      // Update post's voter ID arrays (and persist for sim users).
      setPosts(prev => {
        const updated = prev.map(p => {
          if (p.id !== postId) return p;
          let { upvoterIds, downvoterIds } = p;
          if (previousVote === 'up') upvoterIds = upvoterIds.filter(id => id !== userId);
          if (previousVote === 'down') downvoterIds = downvoterIds.filter(id => id !== userId);
          if (newVote === 'up') upvoterIds = [...upvoterIds, userId];
          if (newVote === 'down') downvoterIds = [...downvoterIds, userId];
          return { ...p, upvoterIds, downvoterIds };
        });
        if (!isRealUserId(userId) && postsHydrated.current) {
          AsyncStorage.setItem(SIM_POSTS_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
        }
        return updated;
      });
    },
    [], // intentionally empty — uses voteMapRef for fresh reads
  );

  // ── Save ──────────────────────────────────────────────────────────────────
  const toggleSave = useCallback((userId: string, postId: string) => {
    setSavedMapArr(prev => {
      const arr = prev[userId] ?? [];
      const alreadySaved = arr.includes(postId);
      // Write-through to Supabase.
      if (alreadySaved) dbDeleteSave(userId, postId);
      else insertSave(userId, postId);
      return {
        ...prev,
        [userId]: alreadySaved ? arr.filter(id => id !== postId) : [...arr, postId],
      };
    });
    // Also update saverIds on the post itself (so save count is always derivable).
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
    removePost(postId); // remove from Supabase (no-op for sim users)
    setPosts((prev) => {
      const updated = prev.filter((p) => !(p.id === postId && p.authorId === authorId));
      if (!isRealUserId(authorId)) {
        AsyncStorage.setItem(SIM_POSTS_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      }
      return updated;
    });
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

  // ── Comments ─────────────────────────────────────────────────────────────
  const addComment = useCallback(async (comment: SimComment) => {
    try {
      await insertComment(comment); // must finish before notification insert (FK on comment_id)
    } catch {
      return;
    }
    setCommentsMap(prev => ({
      ...prev,
      [comment.postId]: [...(prev[comment.postId] ?? []), comment],
    }));
  }, []);

  /** Fetch fresh comments from Supabase for a specific post (lazy-load on open). */
  const ensureCommentsForPost = useCallback(async (postId: string) => {
    if (!isRealUserId(activeUserId)) return; // sim users: already in local state
    const fresh = await fetchCommentsForPost(postId);
    if (fresh.length === 0) return;
    setCommentsMap(prev => {
      const existing = prev[postId] ?? [];
      // Merge: deduplicate by comment id, fresh takes precedence.
      const merged = [
        ...fresh,
        ...existing.filter(ec => !fresh.some(fc => fc.id === ec.id)),
      ];
      return { ...prev, [postId]: merged };
    });
  }, [activeUserId]);

  // ── Publish ───────────────────────────────────────────────────────────────
  const publishPost = useCallback((post: SimPost) => {
    if (!isPublishedSimPostType(post.type)) return;
    insertPost(post); // persist to Supabase (no-op for sim users)
    setPosts((prev) => {
      // Deduplicate: ignore if a post with the same id already exists.
      if (prev.some((p) => p.id === post.id)) return prev;
      const updated = [post, ...prev];
      if (!isRealUserId(post.authorId)) {
        AsyncStorage.setItem(SIM_POSTS_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      }
      return updated;
    });
  }, []);

  const refreshSocialFromSupabase = useCallback(async (): Promise<SimPost[]> => {
    if (!isRealUserId(activeUserId)) {
      const seed = SIM_POSTS.map(p => ({ ...p }));
      setPosts(() => seed);
      return seed;
    }
    const hydrateFor = activeUserId;
    console.log('[Social] Manual refresh from Supabase for user', hydrateFor);
    const payload = await loadSupabaseHydrationPayload(hydrateFor);
    if (activeUserIdRef.current !== hydrateFor) {
      return payload.sbPosts;
    }
    setPosts(() => payload.sbPosts);
    setVoteMapRaw(prev => ({
      ...prev,
      [hydrateFor]: payload.myVotesMap,
    }));
    setSavedMapArr(prev => {
      const updated = { ...prev };
      updated[hydrateFor] = payload.mySavedPostIds;
      return updated;
    });
    setFollowGraph(prev => {
      const updated = { ...prev };
      const prevMine = prev[hydrateFor] ?? [];
      updated[hydrateFor] = [...new Set([...payload.following, ...prevMine])];
      for (const followerId of payload.followers) {
        updated[followerId] = [
          ...new Set([...(updated[followerId] ?? []), hydrateFor]),
        ];
      }
      return updated;
    });
    setCommentsMap(prev => ({ ...prev, ...payload.commentsByPost }));
    postsHydrated.current  = true;
    votesHydrated.current  = true;
    followHydrated.current = true;
    commentsHydrated.current = true;
    savedHydrated.current  = true;
    return payload.sbPosts;
  }, [activeUserId]);

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
      commentsMap,
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
      addComment,
      ensureCommentsForPost,
      refreshSocialFromSupabase,
    }),
    [
      activeUserId, setActiveUserId, users, posts,
      followGraph_sets, savedMap, voteMapRaw, hiddenMap,
      commentsMap,
      activeUser, activeFollowersCount, activeFollowingCount,
      follow, unfollow, toggleFollow, castVote, toggleSave,
      deletePost, toggleHidePost, publishPost, addComment, ensureCommentsForPost,
      refreshSocialFromSupabase,
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
