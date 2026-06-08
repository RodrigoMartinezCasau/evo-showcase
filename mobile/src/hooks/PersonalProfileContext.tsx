/**
 * PersonalProfileContext — shared reactive state for the personal profile ecosystem.
 *
 * All data derives from SimulationContext — no local "init once" state.
 * Switching the active user in SimulationContext automatically updates every
 * consumer of this context.
 *
 * Covers:
 *  - Posts: delete / hide-from-public
 *  - Followers: follow-back / unfollow
 *  - Following: unfollow
 *  - Saved posts: save / unsave
 *  - Mutual friends (following ∩ followers)
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
import type { CommunityPost, Rank, User } from '@evoconn/types';
import type { FollowerEntry, FollowingEntry } from '@evoconn/data/mockPersonalProfile';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import {
  SIM_USERS_BY_ID,
  isPublishedSimPostType,
  type SimPost,
  type SimUser,
} from '@evoconn/data/simulation/simulatedNetwork';
import { fetchProfilesBatch, fetchFollowers, setPostHidden, isRealUserId, type BasicProfile } from '@evoconn/services/supabaseSocial';
import { fetchMutualFriends } from '@evoconn/services/supabaseMessaging';
import { registerFollowProfilePrimer } from '@evoconn/hooks/followProfilePrime';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { useBlockedUsers } from '@evoconn/hooks/BlockedUsersContext';
import { useAuth } from '../../mobile/lib/AuthContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Perfiles precargados al entrar al perfil (contadores + preview + 1ª página). */
const PROFILE_PRIME_BATCH = 24;

function simUserToUser(u: SimUser): User {
  return { id: u.id, username: u.username, clanId: u.clanId, rank: u.rank };
}

function toFollowListEntry(
  uid: string,
  users: Record<string, SimUser>,
  profileCache: Record<string, BasicProfile>,
): FollowerEntry {
  const cached = profileCache[uid];
  const u = users[uid];
  if (u) {
    return {
      id: u.id,
      username: u.username,
      clanId: u.clanId,
      rank: u.rank,
      avatarUri: cached?.avatarUri ?? null,
    };
  }
  if (cached) {
    return {
      id: cached.id,
      username: cached.username,
      clanId: cached.clanId,
      rank: cached.rank as FollowerEntry['rank'],
      avatarUri: cached.avatarUri ?? null,
    };
  }
  return {
    id: uid,
    username: `@${uid.slice(0, 8)}`,
    clanId: null,
    rank: 'aprendiz',
    avatarUri: null,
  };
}

function basicProfileToFollowingEntry(p: BasicProfile): FollowingEntry {
  return {
    id: p.id,
    username: p.username,
    clanId: p.clanId,
    rank: (p.rank ?? 'aprendiz') as FollowingEntry['rank'],
    avatarUri: p.avatarUri ?? null,
  };
}

function simPostToCommunityPost(
  p: SimPost,
  users: Record<string, SimUser>,
  profileCache: Record<string, BasicProfile>,
): CommunityPost {
  const author = users[p.authorId];
  let userAuthor: User;
  if (author) {
    userAuthor = simUserToUser(author);
  } else {
    const cached = profileCache[p.authorId];
    if (cached) {
      userAuthor = {
        id: cached.id,
        username: cached.username,
        clanId: cached.clanId,
        rank: cached.rank as Rank,
        avatarUri: cached.avatarUri ?? undefined,
      };
    } else {
      userAuthor = {
        id: p.authorId,
        username: p.authorUsername ?? '?',
        clanId: p.authorClanId ?? null,
        rank: (p.authorRank as Rank | undefined) ?? 'aprendiz',
      };
    }
  }
  return {
    id: p.id,
    type: p.type,
    author: userAuthor,
    title: p.title,
    body: p.body,
    quoteAuthor: p.quoteAuthor,
    audioTrackId: p.audioTrackId ?? null,
    audioVolume: p.audioVolume ?? null,
    imageUrl: p.imageUrl ?? null,
    imageWidth: p.imageWidth ?? null,
    imageHeight: p.imageHeight ?? null,
    imageCropFocusY: p.imageCropFocusY ?? null,
    imageCropFocusYFollowing: p.imageCropFocusYFollowing ?? null,
    imageShowParaTi: p.imageShowParaTi ?? null,
    imageShowSiguiendo: p.imageShowSiguiendo ?? null,
    voteStats: {
      up:   p.upvoterIds.length,
      down: p.downvoterIds.length,
      save: p.saverIds.length,
    },
    createdAt: p.createdAt,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PersonalProfileContextValue = {
  // ── Posts ──
  posts: CommunityPost[];
  hiddenPostIds: Set<string>;
  deletePost: (id: string) => void;
  toggleHidePost: (id: string) => void;
  isHidden: (id: string) => boolean;

  // ── Followers ──
  followers: FollowerEntry[];
  refreshFollowers: () => void;

  // ── Following ──
  following: FollowingEntry[];
  unfollowUser: (id: string) => void;

  followingBackIds: Set<string>;
  followBack: (id: string) => void;
  unfollowBack: (id: string) => void;
  isFollowingBack: (id: string) => boolean;

  // ── Mutual friends (following ∩ followers) ──
  friends: FollowingEntry[];
  friendsCount: number;
  refreshFriends: () => void;

  /** Pide a Supabase los perfiles que falten para estos IDs (página visible). */
  primeProfiles: (ids: string[]) => void;

  // ── Saved posts ──
  savedPosts: CommunityPost[];
  savedPostIds: Set<string>;
  savePost: (post: CommunityPost) => void;
  unsavePost: (id: string) => void;
  isSaved: (postId: string) => boolean;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const PersonalProfileCtx = createContext<PersonalProfileContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PersonalProfileProvider({ children }: { children: React.ReactNode }) {
  const sim = useSimulation();
  const taste = useRecommendationTaste();
  const { isBlocked } = useBlockedUsers();
  const { activeUserId, users, posts: simPosts, followGraph, savedMap, hiddenMap, activeFollowersCount } = sim;

  // Cache of Supabase profiles for real UUID users not in SIM_USERS_BY_ID.
  const [profileCache, setProfileCache] = useState<Record<string, BasicProfile>>({});
  const [supabaseFriends, setSupabaseFriends] = useState<FollowingEntry[]>([]);
  const [supabaseFollowerIds, setSupabaseFollowerIds] = useState<string[]>([]);
  const fetchingRef = useRef<Set<string>>(new Set());
  const friendsFetchGenRef = useRef(0);
  const followersFetchGenRef = useRef(0);

  const followingKey = useMemo(
    () => [...(followGraph[activeUserId] ?? [])].sort().join(','),
    [followGraph, activeUserId],
  );

  const graphFollowersKey = useMemo(
    () =>
      Object.entries(followGraph)
        .filter(([, followingSet]) => followingSet.has(activeUserId))
        .map(([uid]) => uid)
        .sort()
        .join(','),
    [followGraph, activeUserId],
  );

  const refreshFollowers = useCallback(() => {
    if (!isRealUserId(activeUserId)) {
      setSupabaseFollowerIds([]);
      return;
    }
    const gen = ++followersFetchGenRef.current;
    void fetchFollowers(activeUserId)
      .then((ids) => {
        if (followersFetchGenRef.current !== gen) return;
        setSupabaseFollowerIds(ids);
      })
      .catch(() => {
        if (followersFetchGenRef.current !== gen) return;
        setSupabaseFollowerIds([]);
      });
  }, [activeUserId]);

  useEffect(() => {
    refreshFollowers();
  }, [refreshFollowers, activeFollowersCount, graphFollowersKey]);

  const refreshFriends = useCallback(() => {
    if (!isRealUserId(activeUserId)) {
      setSupabaseFriends([]);
      return;
    }
    const gen = ++friendsFetchGenRef.current;
    void fetchMutualFriends(activeUserId)
      .then((profiles) => {
        if (friendsFetchGenRef.current !== gen) return;
        setSupabaseFriends(profiles.map(basicProfileToFollowingEntry));
        if (profiles.length === 0) return;
        setProfileCache((prev) => {
          const next = { ...prev };
          for (const p of profiles) next[p.id] = p;
          return next;
        });
      })
      .catch(() => {
        if (friendsFetchGenRef.current !== gen) return;
        setSupabaseFriends([]);
      });
  }, [activeUserId]);

  useEffect(() => {
    refreshFriends();
  }, [refreshFriends, followingKey, activeFollowersCount]);

  const fetchMissingProfiles = useCallback(
    (candidates: string[]) => {
      const toFetch = [...new Set(candidates)].filter(
        uid =>
          isRealUserId(uid) &&
          !users[uid] &&
          !SIM_USERS_BY_ID[uid] &&
          !profileCache[uid] &&
          !fetchingRef.current.has(uid),
      );
      if (toFetch.length === 0) return;
      toFetch.forEach(uid => fetchingRef.current.add(uid));
      fetchProfilesBatch(toFetch)
        .then(profiles => {
          setProfileCache(prev => {
            const next = { ...prev };
            profiles.forEach(p => {
              next[p.id] = p;
            });
            return next;
          });
        })
        .catch(() => { /* network / RLS — allow retry on next effect run */ })
        .finally(() => {
          toFetch.forEach(uid => fetchingRef.current.delete(uid));
        });
    },
    [users, profileCache],
  );

  // Precarga SOLO un primer lote de perfiles (suficiente para contadores y la
  // vista previa de "Amigos" + la primera página de cada lista). El resto se
  // pide página a página desde cada pantalla vía `primeProfiles`, para no
  // descargar de golpe los perfiles de TODA la red de follows en horas pico.
  useLayoutEffect(() => {
    const firstBatch: string[] = [];
    const pushMissing = (uid: string) => {
      if (!users[uid] && !SIM_USERS_BY_ID[uid]) firstBatch.push(uid);
    };
    Object.entries(followGraph)
      .filter(([, set]) => set.has(activeUserId))
      .slice(0, PROFILE_PRIME_BATCH)
      .forEach(([uid]) => pushMissing(uid));
    const myFollowing = [...(followGraph[activeUserId] ?? new Set<string>())].slice(
      0,
      PROFILE_PRIME_BATCH,
    );
    myFollowing.forEach(pushMissing);
    fetchMissingProfiles(firstBatch);
  }, [followGraph, activeUserId, users, fetchMissingProfiles]);

  // Authors of saved posts (often real users not in the 9-user sim) → fill `profileCache` for usernames.
  useLayoutEffect(() => {
    const ids: string[] = [];
    savedMap[activeUserId]?.forEach(postId => {
      const sp = simPosts.find(p => p.id === postId);
      if (sp && !users[sp.authorId] && !SIM_USERS_BY_ID[sp.authorId]) ids.push(sp.authorId);
    });
    fetchMissingProfiles(ids);
  }, [savedMap, activeUserId, simPosts, users, fetchMissingProfiles]);

  useEffect(() => {
    registerFollowProfilePrimer(fetchMissingProfiles);
    return () => registerFollowProfilePrimer(null);
  }, [fetchMissingProfiles]);

  // ── Posts ──────────────────────────────────────────────────────────────────
  const posts = useMemo<CommunityPost[]>(
    () =>
      simPosts
        .filter((p) => p.authorId === activeUserId && isPublishedSimPostType(p.type))
        .map((p) => simPostToCommunityPost(p, users, profileCache)),
    [simPosts, activeUserId, users, profileCache],
  );

  const hiddenPostIds = useMemo<Set<string>>(
    () => hiddenMap[activeUserId] ?? new Set<string>(),
    [hiddenMap, activeUserId],
  );

  const deletePost = useCallback(
    (id: string) => sim.deletePost(activeUserId, id),
    [sim, activeUserId],
  );

  const { session } = useAuth();
  const toggleHidePost = useCallback(
    (id: string) => {
      sim.toggleHidePost(activeUserId, id);
      // Sync hidden state to Supabase for real users
      if (session?.user && isRealUserId(activeUserId)) {
        const willBeHidden = !((sim.hiddenMap[activeUserId] ?? new Set()).has(id));
        setPostHidden(id, willBeHidden).catch(console.error);
      }
    },
    [sim, activeUserId, session],
  );

  const isHidden = useCallback(
    (id: string) => hiddenPostIds.has(id),
    [hiddenPostIds],
  );

  // ── Followers ──────────────────────────────────────────────────────────────
  const localFollowers = useMemo<FollowerEntry[]>(() => {
    return Object.entries(followGraph)
      .filter(([, followingSet]) => followingSet.has(activeUserId))
      .filter(([uid]) => !isBlocked(uid))
      .map(([uid]) => toFollowListEntry(uid, users, profileCache));
  }, [followGraph, activeUserId, users, profileCache, isBlocked]);

  const followers = useMemo<FollowerEntry[]>(() => {
    if (isRealUserId(activeUserId)) {
      return supabaseFollowerIds
        .filter((uid) => !isBlocked(uid))
        .map((uid) => toFollowListEntry(uid, users, profileCache));
    }
    return localFollowers;
  }, [activeUserId, supabaseFollowerIds, localFollowers, users, profileCache, isBlocked]);

  // ── Following ──────────────────────────────────────────────────────────────
  const following = useMemo<FollowingEntry[]>(() => {
    const myFollowing = followGraph[activeUserId] ?? new Set<string>();
    return [...myFollowing]
      .filter(uid => !isBlocked(uid))
      .map(uid => toFollowListEntry(uid, users, profileCache));
  }, [followGraph, activeUserId, users, profileCache, isBlocked]);

  // followingBackIds = users I already follow back (who are in my followers list)
  const followingBackIds = useMemo<Set<string>>(() => {
    const myFollowingSet = followGraph[activeUserId] ?? new Set<string>();
    return new Set(followers.filter(f => myFollowingSet.has(f.id)).map(f => f.id));
  }, [followers, followGraph, activeUserId]);

  const followBack = useCallback(
    (id: string) => sim.follow(activeUserId, id),
    [sim, activeUserId],
  );

  const unfollowBack = useCallback(
    (id: string) => sim.unfollow(activeUserId, id),
    [sim, activeUserId],
  );

  const isFollowingBack = useCallback(
    (id: string) => followingBackIds.has(id),
    [followingBackIds],
  );

  const unfollowUser = useCallback(
    (id: string) => sim.unfollow(activeUserId, id),
    [sim, activeUserId],
  );

  // ── Mutual friends ─────────────────────────────────────────────────────────
  const localFriends = useMemo<FollowingEntry[]>(() => {
    const followerIdSet = new Set(followers.map(f => f.id));
    return following.filter(u => followerIdSet.has(u.id) && !isBlocked(u.id));
  }, [followers, following, isBlocked]);

  const friends = useMemo<FollowingEntry[]>(() => {
    if (isRealUserId(activeUserId)) {
      return supabaseFriends.filter(u => !isBlocked(u.id));
    }
    return localFriends;
  }, [activeUserId, supabaseFriends, localFriends, isBlocked]);

  const friendsCount = friends.length;

  // ── Saved posts ────────────────────────────────────────────────────────────
  const savedPostIds = useMemo<Set<string>>(
    () => savedMap[activeUserId] ?? new Set<string>(),
    [savedMap, activeUserId],
  );

  const savedPosts = useMemo<CommunityPost[]>(
    () =>
      [...savedPostIds]
        .reverse()
        .map((postId) => simPosts.find((p) => p.id === postId))
        .filter((p): p is SimPost => p !== undefined && isPublishedSimPostType(p.type))
        .filter((p) => !isBlocked(p.authorId))
        .map((p) => simPostToCommunityPost(p, users, profileCache)),
    [savedPostIds, simPosts, users, profileCache, isBlocked],
  );

  const savePost = useCallback(
    (post: CommunityPost) => {
      if (savedPostIds.has(post.id)) return;
      sim.toggleSave(activeUserId, post.id);
      taste.recordSave(post);
    },
    [sim, activeUserId, taste, savedPostIds],
  );

  const unsavePost = useCallback(
    (id: string) => {
      // Only toggle if currently saved (to avoid toggling to saved)
      if (savedPostIds.has(id)) {
        sim.toggleSave(activeUserId, id);
        taste.recordUnsave(id);
      }
    },
    [sim, activeUserId, savedPostIds, taste],
  );

  const isSaved = useCallback(
    (postId: string) => savedPostIds.has(postId),
    [savedPostIds],
  );

  // ─── Memoized value ────────────────────────────────────────────────────────
  const value = useMemo<PersonalProfileContextValue>(
    () => ({
      posts,
      hiddenPostIds,
      deletePost,
      toggleHidePost,
      isHidden,
      followers,
      refreshFollowers,
      followingBackIds,
      followBack,
      unfollowBack,
      isFollowingBack,
      following,
      unfollowUser,
      friends,
      friendsCount,
      refreshFriends,
      primeProfiles: fetchMissingProfiles,
      savedPosts,
      savedPostIds,
      savePost,
      unsavePost,
      isSaved,
    }),
    [
      posts, hiddenPostIds, deletePost, toggleHidePost, isHidden,
      followers, refreshFollowers, followingBackIds, followBack, unfollowBack, isFollowingBack,
      following, unfollowUser, friends, friendsCount, refreshFriends, fetchMissingProfiles,
      savedPosts, savedPostIds, savePost, unsavePost, isSaved,
    ],
  );

  return (
    <PersonalProfileCtx.Provider value={value}>
      {children}
    </PersonalProfileCtx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePersonalProfile(): PersonalProfileContextValue {
  const ctx = useContext(PersonalProfileCtx);
  if (!ctx) {
    throw new Error('usePersonalProfile must be used inside <PersonalProfileProvider>');
  }
  return ctx;
}
