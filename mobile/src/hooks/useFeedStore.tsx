import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { CommunityPost, User, VoteStats } from '../types';
import { mockFeedPosts as SEED } from '../data/mockCommunity';

function applyVoteTransition(
  stats: VoteStats,
  from: 'up' | 'down' | null,
  to: 'up' | 'down' | null,
): VoteStats {
  let { up, down, save } = stats;
  if (from === 'up') up = Math.max(0, up - 1);
  if (from === 'down') down = Math.max(0, down - 1);
  if (to === 'up') up += 1;
  if (to === 'down') down += 1;
  return { up, down, save };
}

type FeedContextValue = {
  posts: CommunityPost[];
  publishPost: (post: CommunityPost) => void;
  hasPublished: (sourceId: string) => boolean;
  getPostById: (id: string) => CommunityPost | undefined;
  updatePostVote: (postId: string, from: 'up' | 'down' | null, to: 'up' | 'down' | null) => void;
  updatePostSaveToggle: (postId: string, wasSaved: boolean, nowSaved: boolean) => void;
};

const FeedContext = createContext<FeedContextValue | null>(null);

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<CommunityPost[]>(SEED);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());

  const publishPost = useCallback((post: CommunityPost) => {
    setPosts((prev) => [post, ...prev]);
    if (post.id) {
      setPublishedIds((prev) => new Set(prev).add(post.id));
    }
  }, []);

  const hasPublished = useCallback(
    (sourceId: string) => publishedIds.has(sourceId),
    [publishedIds],
  );

  const getById = useCallback(
    (id: string) => posts.find((p) => p.id === id),
    [posts],
  );

  const updatePostVote = useCallback(
    (postId: string, from: 'up' | 'down' | null, to: 'up' | 'down' | null) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, voteStats: applyVoteTransition(p.voteStats, from, to) }
            : p,
        ),
      );
    },
    [],
  );

  const updatePostSaveToggle = useCallback((postId: string, wasSaved: boolean, nowSaved: boolean) => {
    if (wasSaved === nowSaved) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const save = p.voteStats.save + (nowSaved ? 1 : -1);
        return { ...p, voteStats: { ...p.voteStats, save: Math.max(0, save) } };
      }),
    );
  }, []);

  const value = useMemo(
    () => ({
      posts,
      publishPost,
      hasPublished,
      getPostById: getById,
      updatePostVote,
      updatePostSaveToggle,
    }),
    [posts, publishPost, hasPublished, getById, updatePostVote, updatePostSaveToggle],
  );

  return (
    <FeedContext.Provider value={value}>{children}</FeedContext.Provider>
  );
}

export function useFeedStore(): FeedContextValue {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error('useFeedStore must be used within FeedProvider');
  return ctx;
}

let _nextId = 100;

export function createReflectionPost(
  author: User,
  title: string,
  body: string,
): CommunityPost {
  return {
    id: `pub_${++_nextId}_${Date.now()}`,
    type: 'reflection',
    author,
    title,
    body,
    voteStats: { up: 0, down: 0, save: 0 },
    createdAt: new Date().toISOString(),
  };
}
