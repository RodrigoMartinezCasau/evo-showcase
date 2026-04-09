import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { CommunityPost, User } from '../types';
import { mockFeedPosts as SEED } from '../data/mockCommunity';

type FeedContextValue = {
  posts: CommunityPost[];
  publishPost: (post: CommunityPost) => void;
  hasPublished: (sourceId: string) => boolean;
  getPostById: (id: string) => CommunityPost | undefined;
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

  const value = useMemo(
    () => ({ posts, publishPost, hasPublished, getPostById: getById }),
    [posts, publishPost, hasPublished, getById],
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
