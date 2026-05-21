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
import { fetchProfilesBatch, setPostHidden, isRealUserId, type BasicProfile } from '@evoconn/services/supabaseSocial';
import { registerFollowProfilePrimer } from '@evoconn/hooks/followProfilePrime';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { useBlockedUsers } from '@evoconn/hooks/BlockedUsersContext';
import { useAuth } from '../../mobile/lib/AuthContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function simUserToUser(u: SimUser): User {
  return { id: u.id, username: u.username, clanId: u.clanId, rank: u.rank };
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
  followingBackIds: Set<string>;
  followBack: (id: string) => void;
  unfollowBack: (id: string) => void;
  isFollowingBack: (id: string) => boolean;

  // ── Following ──
  following: FollowingEntry[];
  unfollowUser: (id: string) => void;

  // ── Mutual friends (following ∩ followers) ──
  friends: FollowingEntry[];

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
  const { activeUserId, users, posts: simPosts, followGraph, savedMap, hiddenMap } = sim;

  // Cache of Supabase profiles for real UUID users not in SIM_USERS_BY_ID.
  const [profileCache, setProfileCache] = useState<Record<string, BasicProfile>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

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

  // Collect all unknown UUIDs from followers + following, batch-fetch their profiles.
  useLayoutEffect(() => {
    const allUids = new Set<string>();
    Object.entries(followGraph)
      .filter(([, set]) => set.has(activeUserId))
      .forEach(([uid]) => {
        if (!users[uid] && !SIM_USERS_BY_ID[uid]) allUids.add(uid);
      });
    const myFollowing = followGraph[activeUserId] ?? new Set<string>();
    myFollowing.forEach(uid => {
      if (!users[uid] && !SIM_USERS_BY_ID[uid]) allUids.add(uid);
    });
    fetchMissingProfiles([...allUids]);
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
  const followers = useMemo<FollowerEntry[]>(() => {
    return Object.entries(followGraph)
      .filter(([, followingSet]) => followingSet.has(activeUserId))
      .filter(([uid]) => !isBlocked(uid))
      .map(([uid]) => {
        const u = users[uid];
        if (u) return { id: u.id, username: u.username, clanId: u.clanId, rank: u.rank };
        const cached = profileCache[uid];
        if (cached) return { id: cached.id, username: cached.username, clanId: cached.clanId, rank: cached.rank as FollowerEntry['rank'] };
        return { id: uid, username: `@${uid.slice(0, 8)}`, clanId: null, rank: 'aprendiz' as const };
      });
  }, [followGraph, activeUserId, users, profileCache, isBlocked]);

  // ── Following ──────────────────────────────────────────────────────────────
  const following = useMemo<FollowingEntry[]>(() => {
    const myFollowing = followGraph[activeUserId] ?? new Set<string>();
    return [...myFollowing]
      .filter(uid => !isBlocked(uid))
      .map(uid => {
        const u = users[uid];
        if (u) return { id: u.id, username: u.username, clanId: u.clanId, rank: u.rank };
        const cached = profileCache[uid];
        if (cached) return { id: cached.id, username: cached.username, clanId: cached.clanId, rank: cached.rank as FollowingEntry['rank'] };
        return { id: uid, username: `@${uid.slice(0, 8)}`, clanId: null, rank: 'aprendiz' as const };
      });
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
  const friends = useMemo<FollowingEntry[]>(() => {
    const followerIdSet = new Set(followers.map(f => f.id));
    return following.filter(u => followerIdSet.has(u.id) && !isBlocked(u.id));
  }, [followers, following, isBlocked]);

  // ── Saved posts ────────────────────────────────────────────────────────────
  const savedPostIds = useMemo<Set<string>>(
    () => savedMap[activeUserId] ?? new Set<string>(),
    [savedMap, activeUserId],
  );

  const savedPosts = useMemo<CommunityPost[]>(
    () =>
      [...savedPostIds]
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
      followingBackIds,
      followBack,
      unfollowBack,
      isFollowingBack,
      following,
      unfollowUser,
      friends,
      savedPosts,
      savedPostIds,
      savePost,
      unsavePost,
      isSaved,
    }),
    [
      posts, hiddenPostIds, deletePost, toggleHidePost, isHidden,
      followers, followingBackIds, followBack, unfollowBack, isFollowingBack,
      following, unfollowUser, friends,
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
