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
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CommunityPost, User } from '@evoconn/types';
import type { FollowerEntry, FollowingEntry } from '@evoconn/data/mockPersonalProfile';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import {
  SIM_USERS_BY_ID,
  type SimPost,
  type SimUser,
} from '@evoconn/data/simulation/simulatedNetwork';
import { fetchProfilesBatch, setPostHidden, isRealUserId, type BasicProfile } from '@evoconn/services/supabaseSocial';
import { useAuth } from '../../mobile/lib/AuthContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function simUserToUser(u: SimUser): User {
  return { id: u.id, username: u.username, clanId: u.clanId, rank: u.rank };
}

function simPostToCommunityPost(p: SimPost, users: Record<string, SimUser>): CommunityPost {
  const author = users[p.authorId];
  return {
    id: p.id,
    type: p.type,
    author: author ? simUserToUser(author) : { id: p.authorId, username: '?', clanId: null, rank: 'aprendiz' },
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
  const { activeUserId, users, posts: simPosts, followGraph, savedMap, hiddenMap } = sim;

  // Cache of Supabase profiles for real UUID users not in SIM_USERS_BY_ID.
  const [profileCache, setProfileCache] = useState<Record<string, BasicProfile>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  // Collect all unknown UUIDs from followers + following, batch-fetch their profiles.
  useEffect(() => {
    const allUids = new Set<string>();
    // Followers: UIDs that follow activeUserId.
    Object.entries(followGraph)
      .filter(([, set]) => set.has(activeUserId))
      .forEach(([uid]) => { if (!users[uid] && !SIM_USERS_BY_ID[uid]) allUids.add(uid); });
    // Following: UIDs that activeUserId follows.
    const myFollowing = followGraph[activeUserId] ?? new Set<string>();
    myFollowing.forEach(uid => { if (!users[uid] && !SIM_USERS_BY_ID[uid]) allUids.add(uid); });

    const toFetch = [...allUids].filter(uid => !profileCache[uid] && !fetchingRef.current.has(uid));
    if (toFetch.length === 0) return;
    toFetch.forEach(uid => fetchingRef.current.add(uid));
    fetchProfilesBatch(toFetch).then(profiles => {
      setProfileCache(prev => {
        const next = { ...prev };
        profiles.forEach(p => { next[p.id] = p; });
        return next;
      });
      toFetch.forEach(uid => fetchingRef.current.delete(uid));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followGraph, activeUserId, users]);

  // ── Posts ──────────────────────────────────────────────────────────────────
  const posts = useMemo<CommunityPost[]>(
    () => simPosts
      .filter(p => p.authorId === activeUserId)
      .map(p => simPostToCommunityPost(p, users)),
    [simPosts, activeUserId, users],
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
      .map(([uid]) => {
        const u = users[uid];
        if (u) return { id: u.id, username: u.username, clanId: u.clanId, rank: u.rank };
        const cached = profileCache[uid];
        if (cached) return { id: cached.id, username: cached.username, clanId: cached.clanId, rank: cached.rank as FollowerEntry['rank'] };
        return { id: uid, username: `@${uid.slice(0, 8)}`, clanId: null, rank: 'aprendiz' as const };
      });
  }, [followGraph, activeUserId, users, profileCache]);

  // ── Following ──────────────────────────────────────────────────────────────
  const following = useMemo<FollowingEntry[]>(() => {
    const myFollowing = followGraph[activeUserId] ?? new Set<string>();
    return [...myFollowing]
      .map(uid => {
        const u = users[uid];
        if (u) return { id: u.id, username: u.username, clanId: u.clanId, rank: u.rank };
        const cached = profileCache[uid];
        if (cached) return { id: cached.id, username: cached.username, clanId: cached.clanId, rank: cached.rank as FollowingEntry['rank'] };
        return { id: uid, username: `@${uid.slice(0, 8)}`, clanId: null, rank: 'aprendiz' as const };
      });
  }, [followGraph, activeUserId, users, profileCache]);

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
    return following.filter(u => followerIdSet.has(u.id));
  }, [followers, following]);

  // ── Saved posts ────────────────────────────────────────────────────────────
  const savedPostIds = useMemo<Set<string>>(
    () => savedMap[activeUserId] ?? new Set<string>(),
    [savedMap, activeUserId],
  );

  const savedPosts = useMemo<CommunityPost[]>(
    () => [...savedPostIds]
      .map(postId => simPosts.find(p => p.id === postId))
      .filter((p): p is SimPost => p !== undefined)
      .map(p => simPostToCommunityPost(p, users)),
    [savedPostIds, simPosts, users],
  );

  const savePost = useCallback(
    (post: CommunityPost) => sim.toggleSave(activeUserId, post.id),
    [sim, activeUserId],
  );

  const unsavePost = useCallback(
    (id: string) => {
      // Only toggle if currently saved (to avoid toggling to saved)
      if (savedPostIds.has(id)) sim.toggleSave(activeUserId, id);
    },
    [sim, activeUserId, savedPostIds],
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
