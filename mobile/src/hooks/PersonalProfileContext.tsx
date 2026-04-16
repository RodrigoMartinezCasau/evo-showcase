/**
 * PersonalProfileContext — shared reactive state for the personal profile ecosystem.
 *
 * Covers:
 *  - Posts: delete / hide-from-public
 *  - Followers: follow-back / unfollow-back
 *  - Following: unfollow
 *
 * Wrap the app (in _layout.tsx) with <PersonalProfileProvider> so that
 * PersonalPostsScreen, PersonalFollowersScreen, PersonalFollowingScreen
 * and the PersonalProfileScreen slider all share the same live data.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { CommunityPost } from '@evoconn/types';
import {
  getPersonalProfile,
  type FollowerEntry,
  type FollowingEntry,
} from '@evoconn/data/mockPersonalProfile';

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
  unsavePost: (id: string) => void;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const PersonalProfileCtx = createContext<PersonalProfileContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PersonalProfileProvider({ children }: { children: React.ReactNode }) {
  const profile = getPersonalProfile();

  const [posts, setPosts] = useState<CommunityPost[]>(profile.recentPosts);
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
  const [followers] = useState<FollowerEntry[]>(profile.followers);
  const [following, setFollowing] = useState<FollowingEntry[]>(profile.following);
  const [followingBackIds, setFollowingBackIds] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<CommunityPost[]>(profile.savedPosts);

  // ── Post actions ──────────────────────────────────────────────────────────

  const deletePost = useCallback((id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  }, []);

  const toggleHidePost = useCallback((id: string) => {
    setHiddenPostIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isHidden = useCallback(
    (id: string) => hiddenPostIds.has(id),
    [hiddenPostIds],
  );

  // ── Follower actions ──────────────────────────────────────────────────────

  const followBack = useCallback((id: string) => {
    setFollowingBackIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const unfollowBack = useCallback((id: string) => {
    setFollowingBackIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isFollowingBack = useCallback(
    (id: string) => followingBackIds.has(id),
    [followingBackIds],
  );

  // ── Following actions ─────────────────────────────────────────────────────

  const unfollowUser = useCallback((id: string) => {
    setFollowing(prev => prev.filter(u => u.id !== id));
  }, []);

  // ── Saved-posts actions ────────────────────────────────────────────────────

  const unsavePost = useCallback((id: string) => {
    setSavedPosts(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Computed mutual friends (following ∩ followers) ──────────────────────
  const friends = useMemo<FollowingEntry[]>(() => {
    const followerIdSet = new Set(followers.map(f => f.id));
    return following.filter(u => followerIdSet.has(u.id));
  }, [followers, following]);

  // ── Memoized value ────────────────────────────────────────────────────────

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
      unsavePost,
    }),
    [
      posts, hiddenPostIds, deletePost, toggleHidePost, isHidden,
      followers, followingBackIds, followBack, unfollowBack, isFollowingBack,
      following, unfollowUser, friends, savedPosts, unsavePost,
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
