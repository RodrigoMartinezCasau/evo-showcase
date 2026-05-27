/**
 * useFeedStore — seeds posts from SimulationContext and routes all vote/save
 * mutations through it, ensuring a single source of truth.
 *
 * The `voteStats` on each CommunityPost is always computed from the voter-ID
 * arrays in SimulationContext, so it automatically reflects every action.
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
import type { CommunityPost, PhrasePost, Rank, User, VoteStats } from '../types';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { SIM_USERS_BY_ID, isPublishedSimPostType, type SimPost } from '@evoconn/data/simulation/simulatedNetwork';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useNotifications } from '@evoconn/hooks/NotificationsContext';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import {
  isRealUserId,
  fetchProfilesBatch,
  type BasicProfile,
} from '@evoconn/services/supabaseSocial';
import { useBlockedUsers } from '@evoconn/hooks/BlockedUsersContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Stale snapshot written when publish ran before AuthContext hydrated mockCurrentUser. */
const STALE_PUBLISH_USERNAME = '@RODRIGOMARTINEZ';

function isStaleAuthorUsername(username: string | undefined): boolean {
  const u = username?.trim();
  return !u || u.toUpperCase() === STALE_PUBLISH_USERNAME;
}

function resolveAuthor(
  p: SimPost,
  profileCache?: Record<string, BasicProfile>,
): User {
  const cached = profileCache?.[p.authorId];
  const simAuthor = SIM_USERS_BY_ID[p.authorId];

  if (simAuthor && !isRealUserId(p.authorId)) {
    return {
      id: simAuthor.id,
      username: cached?.username ?? simAuthor.username,
      clanId: cached?.clanId ?? simAuthor.clanId,
      rank: (cached?.rank as Rank | undefined) ?? simAuthor.rank,
      avatarUri: cached?.avatarUri ?? undefined,
    };
  }

  if (cached) {
    return {
      id: cached.id,
      username: cached.username,
      clanId: cached.clanId,
      rank: cached.rank as Rank,
      avatarUri: cached.avatarUri ?? undefined,
    };
  }

  if (simAuthor) {
    return {
      id: simAuthor.id,
      username: simAuthor.username,
      clanId: simAuthor.clanId,
      rank: simAuthor.rank,
    };
  }

  const liveUsername =
    p.authorId === mockCurrentUser.id && !isStaleAuthorUsername(mockCurrentUser.username)
      ? mockCurrentUser.username
      : undefined;

  const snapshotUsername = isStaleAuthorUsername(p.authorUsername)
    ? undefined
    : p.authorUsername;

  return {
    id: p.authorId,
    username: liveUsername ?? snapshotUsername ?? '?',
    clanId:
      p.authorId === mockCurrentUser.id
        ? (mockCurrentUser.clanId ?? p.authorClanId ?? null)
        : (p.authorClanId ?? null),
    rank: (p.authorRank as Rank | undefined) ?? 'aprendiz',
  };
}

export function simPostToCommunityPost(
  p: SimPost,
  profileCache?: Record<string, BasicProfile>,
): CommunityPost {
  const author = resolveAuthor(p, profileCache);
  const resolvedClanId =
    p.authorId === mockCurrentUser.id
      ? (mockCurrentUser.clanId ?? author.clanId ?? p.authorClanId ?? null)
      : (author.clanId ?? p.authorClanId ?? null);

  return {
    id: p.id,
    type: p.type,
    author: { ...author, clanId: resolvedClanId },
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

// ─── Context type ─────────────────────────────────────────────────────────────

type FeedContextValue = {
  posts: CommunityPost[];
  publishPost: (post: CommunityPost) => void;
  hasPublished: (sourceId: string) => boolean;
  getPostById: (id: string) => CommunityPost | undefined;
  updatePostVote: (postId: string, from: 'up' | 'down' | null, to: 'up' | 'down' | null) => void;
  /** No-op — save count is maintained by SimulationContext.toggleSave. */
  updatePostSaveToggle: (postId: string, wasSaved: boolean, nowSaved: boolean) => void;
  /** Returns the active user's current vote on a post from the live voteMap. */
  getMyVote: (postId: string) => 'up' | 'down' | null;
};

const FeedContext = createContext<FeedContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const sim = useSimulation();
  const { blockedIds } = useBlockedUsers();
  const { addNotification } = useNotifications();
  const taste = useRecommendationTaste();
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());

  // Live profiles for real authors (usernames + avatars; fixes stale author_username snapshots).
  const [authorProfileCache, setAuthorProfileCache] = useState<Record<string, BasicProfile>>({});
  const fetchedAuthorIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const missingIds = sim.posts
      .filter(p => isPublishedSimPostType(p.type))
      .map(p => p.authorId)
      .filter(id => isRealUserId(id) && !fetchedAuthorIds.current.has(id));
    const uniqueMissing = [...new Set(missingIds)];
    if (uniqueMissing.length === 0) return;
    uniqueMissing.forEach(id => fetchedAuthorIds.current.add(id));
    fetchProfilesBatch(uniqueMissing)
      .then(profiles => {
        setAuthorProfileCache(prev => {
          const next = { ...prev };
          profiles.forEach(prof => { next[prof.id] = prof; });
          return next;
        });
      })
      .catch(() => {
        uniqueMissing.forEach(id => fetchedAuthorIds.current.delete(id));
      });
  }, [sim.posts]);

  // All posts: derive CommunityPost[] from the live SimPost[] so vote/save
  // counts always reflect the current simulation state.
  const posts = useMemo<CommunityPost[]>(
    () =>
      sim.posts
        .filter(p => isPublishedSimPostType(p.type))
        .filter(p => !blockedIds.has(p.authorId))
        .map(p => simPostToCommunityPost(p, authorProfileCache)),
    [sim.posts, authorProfileCache, blockedIds],
  );

  const publishPost = useCallback(
    (post: CommunityPost) => {
      // Convert to SimPost shape and add to simulation.
      // Store author snapshot so the username survives app restarts without
      // needing a runtime lookup table that only knows the 9 sim users.
      const simPost: SimPost = {
        id: post.id,
        authorId: post.author.id,
        authorUsername: post.author.username,
        authorClanId: post.author.clanId,
        authorRank: post.author.rank,
        type: post.type,
        title: post.title,
        body: post.body,
        quoteAuthor: post.quoteAuthor,
        createdAt: post.createdAt,
        upvoterIds: [],
        downvoterIds: [],
        saverIds: [],
      };
      sim.publishPost(simPost);
      taste.recordPublish(post.type);
      setPublishedIds(prev => new Set(prev).add(post.id));
    },
    [sim, taste],
  );

  // Also check the live posts list so the result stays correct after remounts
  // (in-memory publishedIds is cleared when the component tree unmounts).
  const hasPublished = useCallback(
    (sourceId: string) => publishedIds.has(sourceId) || posts.some((p) => p.id === sourceId),
    [publishedIds, posts],
  );

  const getById = useCallback(
    (id: string) => posts.find(p => p.id === id),
    [posts],
  );

  // Routes vote through SimulationContext (the `from` param is ignored since
  // SimulationContext tracks prior votes in voteMap).
  const updatePostVote = useCallback(
    (postId: string, _from: 'up' | 'down' | null, to: 'up' | 'down' | null) => {
      const previousVote = sim.voteMap[sim.activeUserId]?.[postId] ?? null;
      const preVotePost = sim.posts.find((p) => p.id === postId);
      const tastePost: CommunityPost | undefined = preVotePost
        ? simPostToCommunityPost(preVotePost, authorProfileCache)
        : undefined;
      sim.castVote(sim.activeUserId, postId, to);
      if (tastePost) taste.recordVote(tastePost, previousVote, to);
      // Emit notification only when casting a NEW upvote (not removing or changing).
      if (to === 'up' && previousVote !== 'up') {
        const post = sim.posts.find((p) => p.id === postId);
        if (post) {
          const voter = sim.users[sim.activeUserId];
          addNotification({
            recipientUserId: post.authorId,
            type: 'upvote_post',
            fromUserId: sim.activeUserId,
            // For real users, sim.users won't have an entry — fall back to mockCurrentUser.
            fromUsername: voter?.username ?? mockCurrentUser.username,
            targetPostId: postId,
          });
        }
      }
    },
    [sim, addNotification, taste, authorProfileCache],
  );

  // Save count on posts is always up-to-date via SimulationContext.toggleSave
  // (called from PersonalProfileContext.savePost/unsavePost).
  // This function is kept for API compatibility but is a no-op.
  const updatePostSaveToggle = useCallback(
    (_postId: string, _wasSaved: boolean, _nowSaved: boolean) => {
      // no-op: SimulationContext.toggleSave already updates post.saverIds
    },
    [],
  );

  // Reads the active user's current vote on a post directly from the live
  // voteMap so all feed cards reflect vote state consistently.
  const getMyVote = useCallback(
    (postId: string): 'up' | 'down' | null =>
      sim.voteMap[sim.activeUserId]?.[postId] ?? null,
    [sim.voteMap, sim.activeUserId],
  );

  const value = useMemo<FeedContextValue>(
    () => ({
      posts,
      publishPost,
      hasPublished,
      getPostById: getById,
      updatePostVote,
      updatePostSaveToggle,
      getMyVote,
    }),
    [posts, publishPost, hasPublished, getById, updatePostVote, updatePostSaveToggle, getMyVote],
  );

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeedStore(): FeedContextValue {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error('useFeedStore must be used within FeedProvider');
  return ctx;
}

// ─── Post factory helpers (unchanged API) ─────────────────────────────────────

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

export function createPhrasePost(
  author: User,
  phraseInnerNormalized: string,
  quoteAuthor: string,
): PhrasePost {
  return {
    id: `pub_phrase_${++_nextId}_${Date.now()}`,
    type: 'phrase',
    author,
    body: phraseInnerNormalized,
    quoteAuthor: quoteAuthor.trim(),
    voteStats: { up: 0, down: 0, save: 0 },
    createdAt: new Date().toISOString(),
  };
}
