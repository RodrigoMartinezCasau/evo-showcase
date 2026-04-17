/**
 * mockOtherUsers.ts — OtherUserProfile entries for all 9 simulated users.
 * Used by ProfileScreen when viewing another user's profile.
 */
import type { CommunityPost, User, Rank } from '../types';
import {
  SIM_USERS,
  SIM_USERS_BY_ID,
  SIM_POSTS,
  SIM_FOLLOW_GRAPH,
} from './simulation/simulatedNetwork';

export type OtherUserProfile = {
  id: string;
  username: string;
  clanId: string | null;
  rank: Rank;
  followersCount: number;
  followingCount: number;
  insigniaPhrase: string;
  philosophyPercentages: { clanId: string; label: string; pct: number }[];
  totalReflections: number;
  totalQuotes: number;
  recentPosts: CommunityPost[];
};

function followersCount(userId: string): number {
  return Object.values(SIM_FOLLOW_GRAPH).filter(arr => arr.includes(userId)).length;
}

function simAuthorToUser(id: string): User {
  const u = SIM_USERS_BY_ID[id];
  return u
    ? { id: u.id, username: u.username, clanId: u.clanId, rank: u.rank }
    : { id, username: '?', clanId: null, rank: 'aprendiz' };
}

const MOCK_PROFILES: OtherUserProfile[] = SIM_USERS.map(u => ({
  id: u.id,
  username: u.username,
  clanId: u.clanId,
  rank: u.rank,
  followersCount: followersCount(u.id),
  followingCount: (SIM_FOLLOW_GRAPH[u.id] ?? []).length,
  insigniaPhrase: u.insigniaPhrase,
  philosophyPercentages: u.philosophyPercentages,
  totalReflections: u.totalReflections,
  totalQuotes: u.totalQuotes,
  recentPosts: SIM_POSTS
    .filter(p => p.authorId === u.id)
    .map(p => ({
      id: p.id,
      type: p.type,
      author: simAuthorToUser(p.authorId),
      title: p.title,
      body: p.body,
      quoteAuthor: p.quoteAuthor,
      voteStats: {
        up: p.upvoterIds.length,
        down: p.downvoterIds.length,
        save: p.saverIds.length,
      },
      createdAt: p.createdAt,
    })),
}));

export function getOtherUserProfile(userId: string): OtherUserProfile | undefined {
  return MOCK_PROFILES.find(p => p.id === userId);
}

export function getOtherUserProfileOrFallback(userId: string): OtherUserProfile {
  return getOtherUserProfile(userId) ?? MOCK_PROFILES[0];
}
