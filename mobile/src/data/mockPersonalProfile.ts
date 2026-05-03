/**
 * mockPersonalProfile.ts
 *
 * `getPersonalProfile()` constructs the PersonalProfile for the CURRENT active
 * simulated user by reading from:
 *  1. `getCurrentUser()` — the active sim user (mutable ref, always current)
 *  2. `simulatedNetwork.ts` — seed data (posts, follow graph)
 *
 * The static/seed data is returned here.
 * Interactive mutations (follow, unfollow, save, delete) are handled by
 * PersonalProfileContext, which derives from SimulationContext.
 */
import type { CommunityPost, User } from '../types';
import {
  SIM_USERS,
  SIM_USERS_BY_ID,
  SIM_POSTS,
  SIM_FOLLOW_GRAPH,
  type SimPost,
  type SimUser,
} from './simulation/simulatedNetwork';
import { getCurrentUser } from './mockUser';

// ─── Public types ─────────────────────────────────────────────────────────────

export type FriendEntry = {
  id: string;
  username: string;
  clanId: string | null;
};

export type FollowerEntry = {
  id: string;
  username: string;
  clanId: string | null;
  rank?: string;
};

export type FollowingEntry = {
  id: string;
  username: string;
  clanId: string | null;
  rank?: string;
};

export type PersonalProfile = {
  id: string;
  username: string;
  clanId: string | null;
  rank: 'aprendiz' | 'maestro' | 'filosofo';
  followersCount: number;
  followingCount: number;
  insigniaPhrase: string;
  philosophyPercentages: { clanId: string; label: string; pct: number }[];
  totalReflections: number;
  totalQuotes: number;
  recentPosts: CommunityPost[];
  friends: FriendEntry[];
  savedPosts: CommunityPost[];
  followers: FollowerEntry[];
  following: FollowingEntry[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function simUserToAuthor(u: SimUser): User {
  return {
    id: u.id,
    username: u.username,
    clanId: u.clanId,
    rank: u.rank,
  };
}

function simPostToCommunityPost(p: SimPost, authorUser: SimUser): CommunityPost {
  return {
    id: p.id,
    type: p.type,
    author: simUserToAuthor(authorUser),
    title: p.title,
    body: p.body,
    quoteAuthor: p.quoteAuthor,
    voteStats: {
      up: p.upvoterIds.length,
      down: p.downvoterIds.length,
      save: p.saverIds.length,
    },
    createdAt: p.createdAt,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns the PersonalProfile for the currently active simulated user.
 * Called at render time — always fresh because `getCurrentUser()` reads the
 * mutable in-place reference updated by SimulationContext.
 */
export function getPersonalProfile(): PersonalProfile {
  const currentUser = getCurrentUser();
  const simUser = SIM_USERS_BY_ID[currentUser.id];

  // Real Supabase user — not in the 9-user simulation. Build a PersonalProfile
  // directly from the mutable currentUser object (kept in sync by AuthContext
  // via setActiveSimUser) so the screen shows the correct identity.
  if (!simUser) {
    return {
      id: currentUser.id,
      username: currentUser.username,
      clanId: currentUser.clanId,
      rank: currentUser.rank,
      followersCount: currentUser.followersCount,
      followingCount: currentUser.followingCount,
      insigniaPhrase: '',
      philosophyPercentages: [],
      totalReflections: 0,
      totalQuotes: 0,
      recentPosts: [],
      friends: [],
      savedPosts: [],
      followers: [],
      following: [],
    };
  }

  const myPosts: CommunityPost[] = SIM_POSTS
    .filter(p => p.authorId === simUser.id)
    .map(p => simPostToCommunityPost(p, simUser));

  const myFollowerIds = Object.entries(SIM_FOLLOW_GRAPH)
    .filter(([, following]) => following.includes(simUser.id))
    .map(([uid]) => uid);

  const myFollowers: FollowerEntry[] = myFollowerIds
    .map(uid => SIM_USERS_BY_ID[uid])
    .filter(Boolean)
    .map(u => ({ id: u.id, username: u.username, clanId: u.clanId, rank: u.rank }));

  const myFollowingIds = SIM_FOLLOW_GRAPH[simUser.id] ?? [];
  const myFollowing: FollowingEntry[] = myFollowingIds
    .map(uid => SIM_USERS_BY_ID[uid])
    .filter(Boolean)
    .map(u => ({ id: u.id, username: u.username, clanId: u.clanId, rank: u.rank }));

  const myFollowingIdSet = new Set(myFollowingIds);
  const friends: FriendEntry[] = myFollowers
    .filter(f => myFollowingIdSet.has(f.id))
    .map(f => ({ id: f.id, username: f.username, clanId: f.clanId }));

  const mySaved: CommunityPost[] = SIM_POSTS
    .filter(p => p.saverIds.includes(simUser.id))
    .map(p => {
      const author = SIM_USERS_BY_ID[p.authorId] ?? SIM_USERS[0];
      return simPostToCommunityPost(p, author);
    });

  return {
    id: simUser.id,
    username: simUser.username,
    clanId: simUser.clanId,
    rank: simUser.rank,
    followersCount: myFollowers.length,
    followingCount: myFollowing.length,
    insigniaPhrase: simUser.insigniaPhrase,
    philosophyPercentages: simUser.philosophyPercentages,
    totalReflections: simUser.totalReflections,
    totalQuotes: simUser.totalQuotes,
    recentPosts: myPosts,
    friends,
    savedPosts: mySaved,
    followers: myFollowers,
    following: myFollowing,
  };
}
