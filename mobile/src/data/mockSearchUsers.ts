/**
 * mockSearchUsers.ts — exactly the 9 simulated users for the Search screen.
 */
import type { User } from '../types';
import { SIM_USERS, SIM_FOLLOW_GRAPH } from './simulation/simulatedNetwork';

function followersCount(userId: string): number {
  return Object.values(SIM_FOLLOW_GRAPH).filter(arr => arr.includes(userId)).length;
}

export const mockSearchableUsers: readonly User[] = SIM_USERS.map(u => ({
  id: u.id,
  username: u.username,
  clanId: u.clanId,
  rank: u.rank,
  followersCount: followersCount(u.id),
  followingCount: (SIM_FOLLOW_GRAPH[u.id] ?? []).length,
}));
