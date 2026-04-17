/**
 * mockCommunity.ts
 *
 * Re-exports the 25 simulation posts as CommunityPost[] for legacy consumers.
 * FeedProvider now derives its posts directly from SimulationContext, so this
 * file is only used by screens that import mockFeedPosts at module level.
 */
import type { CommunityPost } from '../types';
import { SIM_POSTS, SIM_USERS_BY_ID } from './simulation/simulatedNetwork';

export const mockFeedPosts: CommunityPost[] = SIM_POSTS.map(p => {
  const author = SIM_USERS_BY_ID[p.authorId];
  return {
    id: p.id,
    type: p.type,
    author: author
      ? { id: author.id, username: author.username, clanId: author.clanId, rank: author.rank }
      : { id: p.authorId, username: '?', clanId: null, rank: 'aprendiz' as const },
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
});

export function getPostById(id: string): CommunityPost | undefined {
  return mockFeedPosts.find(p => p.id === id);
}
