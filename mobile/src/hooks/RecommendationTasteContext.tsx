/**
 * RecommendationTasteContext
 * ─────────────────────────
 * Local taste model (AsyncStorage per simulated active user) used to personalize
 * the "Para ti" feed: votes, saves, comments, follows, profile visits, dwell
 * time, and publish patterns update affinities for authors, clans, and content types.
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CommunityPost } from '@evoconn/types';
import { useSimulation } from '@evoconn/hooks/SimulationContext';

const STORAGE_PREFIX = '@evo/recommendation_taste_v1/';
const MAX_MAP_KEYS = 100;
const TRIM_THRESHOLD = 120;

type TasteStateV1 = {
  v: 1;
  authors: Record<string, number>;
  clans: Record<string, number>;
  /** Short-term post engagement (mostly for future use / trimming). */
  posts: Record<string, number>;
  consumePhrase: number;
  consumeReflection: number;
  publishPhrase: number;
  publishReflection: number;
};

const EMPTY_STATE = (): TasteStateV1 => ({
  v: 1,
  authors: {},
  clans: {},
  posts: {},
  consumePhrase: 0,
  consumeReflection: 0,
  publishPhrase: 0,
  publishReflection: 0,
});

function clanStorageKey(clanId: string | null | undefined): string | null {
  if (clanId == null) return null;
  const s = String(clanId).trim();
  return s === '' ? null : s;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function trimMap(m: Record<string, number>, max: number): Record<string, number> {
  const keys = Object.keys(m);
  if (keys.length <= max) return m;
  keys.sort((a, b) => Math.abs(m[b] ?? 0) - Math.abs(m[a] ?? 0));
  const next: Record<string, number> = {};
  for (let i = 0; i < max; i++) {
    const k = keys[i]!;
    next[k] = m[k] ?? 0;
  }
  return next;
}

function addToMap(
  m: Record<string, number>,
  key: string,
  delta: number,
): Record<string, number> {
  const next = { ...m, [key]: (m[key] ?? 0) + delta };
  return Object.keys(next).length > TRIM_THRESHOLD ? trimMap(next, MAX_MAP_KEYS) : next;
}

function applyPostSignals(
  s: TasteStateV1,
  post: CommunityPost,
  opts: { author: number; clan: number; post: number; type: number },
): TasteStateV1 {
  let authors = s.authors;
  let clans = s.clans;
  let posts = s.posts;
  let consumePhrase = s.consumePhrase;
  let consumeReflection = s.consumeReflection;

  if (opts.author !== 0) {
    authors = addToMap(authors, post.author.id, opts.author);
  }
  const ck = clanStorageKey(post.author.clanId);
  if (ck && opts.clan !== 0) {
    clans = addToMap(clans, ck, opts.clan);
  }
  if (opts.post !== 0) {
    posts = addToMap(posts, post.id, opts.post);
  }
  if (opts.type !== 0) {
    if (post.type === 'phrase') consumePhrase = Math.max(0, consumePhrase + opts.type);
    else consumeReflection = Math.max(0, consumeReflection + opts.type);
  }

  return {
    ...s,
    authors,
    clans,
    posts,
    consumePhrase,
    consumeReflection,
  };
}

export function computeTasteBoost(post: CommunityPost, s: TasteStateV1): number {
  let m = 1;
  const authorW = s.authors[post.author.id] ?? 0;
  m += clamp(authorW * 0.034, -0.42, 0.58);
  const ck = clanStorageKey(post.author.clanId);
  if (ck) {
    const clanW = s.clans[ck] ?? 0;
    m += clamp(clanW * 0.027, -0.32, 0.48);
  }

  const totalC = s.consumePhrase + s.consumeReflection + 1;
  const phraseRatio = s.consumePhrase / totalC;
  const reflRatio = s.consumeReflection / totalC;
  if (post.type === 'phrase') {
    m += 0.24 * (phraseRatio - 0.5) * 2;
  } else {
    m += 0.24 * (reflRatio - 0.5) * 2;
  }

  const totalP = s.publishPhrase + s.publishReflection + 1;
  const pubPhraseRatio = s.publishPhrase / totalP;
  const pubReflRatio = s.publishReflection / totalP;
  if (post.type === 'phrase') {
    m += 0.14 * (pubPhraseRatio - 0.5) * 2;
  } else {
    m += 0.14 * (pubReflRatio - 0.5) * 2;
  }

  return clamp(m, 0.62, 1.65);
}

type RecommendationTasteContextValue = {
  /** Bumps when taste changes — use to memoize feed ordering. */
  revision: number;
  getBoost: (post: CommunityPost) => number;
  recordVote: (
    post: CommunityPost,
    previous: 'up' | 'down' | null,
    next: 'up' | 'down' | null,
  ) => void;
  recordSave: (post: CommunityPost) => void;
  recordUnsave: (postId: string) => void;
  recordComment: (post: CommunityPost) => void;
  recordFollow: (userId: string) => void;
  recordUnfollow: (userId: string) => void;
  recordProfileVisit: (userId: string) => void;
  recordDwell: (post: CommunityPost, visibleMs: number) => void;
  recordPublish: (type: 'phrase' | 'reflection') => void;
};

const RecommendationTasteContext = createContext<RecommendationTasteContextValue | null>(null);

export function RecommendationTasteProvider({ children }: { children: React.ReactNode }) {
  const { activeUserId, users: simUsers, posts: simPosts } = useSimulation();
  const [state, setState] = useState<TasteStateV1>(EMPTY_STATE);
  const [revision, setRevision] = useState(0);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const storageKey = `${STORAGE_PREFIX}${activeUserId}`;

  useEffect(() => {
    let cancelled = false;
    setState(EMPTY_STATE());
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw) as TasteStateV1;
          if (parsed?.v === 1) {
            setState({
              v: 1,
              authors: parsed.authors ?? {},
              clans: parsed.clans ?? {},
              posts: parsed.posts ?? {},
              consumePhrase: Math.max(0, parsed.consumePhrase ?? 0),
              consumeReflection: Math.max(0, parsed.consumeReflection ?? 0),
              publishPhrase: Math.max(0, parsed.publishPhrase ?? 0),
              publishReflection: Math.max(0, parsed.publishReflection ?? 0),
            });
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const schedulePersist = useCallback(
    (next: TasteStateV1) => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
      }, 450);
    },
    [storageKey],
  );

  const bump = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const update = useCallback(
    (updater: (s: TasteStateV1) => TasteStateV1) => {
      setState((prev) => {
        const next = updater(prev);
        schedulePersist(next);
        return next;
      });
      bump();
    },
    [bump, schedulePersist],
  );

  const resolvePost = useCallback(
    (postId: string): CommunityPost | undefined => {
      const p = simPosts.find((x) => x.id === postId);
      if (!p) return undefined;
      const author = simUsers[p.authorId];
      return {
        id: p.id,
        type: p.type,
        author: author
          ? { id: author.id, username: author.username, clanId: author.clanId, rank: author.rank }
          : {
              id: p.authorId,
              username: p.authorUsername ?? '?',
              clanId: p.authorClanId ?? null,
              rank: p.authorRank ?? 'aprendiz',
            },
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
    },
    [simPosts, simUsers],
  );

  const getBoost = useCallback(
    (post: CommunityPost) => computeTasteBoost(post, stateRef.current),
    [],
  );

  const recordVote = useCallback(
    (post: CommunityPost, previous: 'up' | 'down' | null, next: 'up' | 'down' | null) => {
      update((s) => {
        if (next === 'up' && previous !== 'up') {
          return applyPostSignals(s, post, { author: 4, clan: 2.5, post: 1.5, type: 2.5 });
        }
        if (next === 'down' && previous !== 'down') {
          return applyPostSignals(s, post, { author: -5, clan: -2.5, post: -1, type: -1.5 });
        }
        if (next === null && previous === 'up') {
          return applyPostSignals(s, post, { author: -1.2, clan: -0.6, post: -0.4, type: -0.6 });
        }
        if (next === null && previous === 'down') {
          return applyPostSignals(s, post, { author: 1, clan: 0.5, post: 0.3, type: 0.4 });
        }
        return s;
      });
    },
    [update],
  );

  const recordSave = useCallback(
    (post: CommunityPost) => {
      update((s) => applyPostSignals(s, post, { author: 5, clan: 3, post: 2, type: 3 }));
    },
    [update],
  );

  const recordUnsave = useCallback(
    (postId: string) => {
      const post = resolvePost(postId);
      if (!post) return;
      update((s) => applyPostSignals(s, post, { author: -2, clan: -1.2, post: -0.8, type: -1.2 }));
    },
    [resolvePost, update],
  );

  const recordComment = useCallback(
    (post: CommunityPost) => {
      update((s) => applyPostSignals(s, post, { author: 6, clan: 3.5, post: 2.5, type: 4 }));
    },
    [update],
  );

  const recordFollow = useCallback(
    (userId: string) => {
      const u = simUsers[userId];
      update((s) => {
        let authors = addToMap(s.authors, userId, 12);
        let clans = s.clans;
        const ck = u ? clanStorageKey(u.clanId) : null;
        if (ck) clans = addToMap(clans, ck, 4);
        authors = Object.keys(authors).length > TRIM_THRESHOLD ? trimMap(authors, MAX_MAP_KEYS) : authors;
        clans = Object.keys(clans).length > TRIM_THRESHOLD ? trimMap(clans, MAX_MAP_KEYS) : clans;
        return { ...s, authors, clans };
      });
    },
    [simUsers, update],
  );

  const recordUnfollow = useCallback(
    (userId: string) => {
      const u = simUsers[userId];
      update((s) => {
        let authors = addToMap(s.authors, userId, -6);
        let clans = s.clans;
        const ck = u ? clanStorageKey(u.clanId) : null;
        if (ck) clans = addToMap(clans, ck, -2);
        authors = Object.keys(authors).length > TRIM_THRESHOLD ? trimMap(authors, MAX_MAP_KEYS) : authors;
        clans = Object.keys(clans).length > TRIM_THRESHOLD ? trimMap(clans, MAX_MAP_KEYS) : clans;
        return { ...s, authors, clans };
      });
    },
    [simUsers, update],
  );

  const recordProfileVisit = useCallback(
    (userId: string) => {
      const u = simUsers[userId];
      update((s) => {
        let authors = addToMap(s.authors, userId, 3.5);
        let clans = s.clans;
        const ck = u ? clanStorageKey(u.clanId) : null;
        if (ck) clans = addToMap(clans, ck, 1.5);
        authors = Object.keys(authors).length > TRIM_THRESHOLD ? trimMap(authors, MAX_MAP_KEYS) : authors;
        clans = Object.keys(clans).length > TRIM_THRESHOLD ? trimMap(clans, MAX_MAP_KEYS) : clans;
        return { ...s, authors, clans };
      });
    },
    [simUsers, update],
  );

  const recordDwell = useCallback(
    (post: CommunityPost, visibleMs: number) => {
      if (visibleMs < 450) return;
      const sec = clamp(visibleMs / 1000, 0, 55);
      const typeW = sec * 0.14;
      const authorW = sec * 0.11;
      const clanW = sec * 0.08;
      const postW = sec * 0.04;
      update((s) => applyPostSignals(s, post, { author: authorW, clan: clanW, post: postW, type: typeW }));
    },
    [update],
  );

  const recordPublish = useCallback(
    (type: 'phrase' | 'reflection') => {
      update((s) => {
        if (type === 'phrase') {
          return { ...s, publishPhrase: s.publishPhrase + 1 };
        }
        return { ...s, publishReflection: s.publishReflection + 1 };
      });
    },
    [update],
  );

  const value = useMemo<RecommendationTasteContextValue>(
    () => ({
      revision,
      getBoost,
      recordVote,
      recordSave,
      recordUnsave,
      recordComment,
      recordFollow,
      recordUnfollow,
      recordProfileVisit,
      recordDwell,
      recordPublish,
    }),
    [
      revision,
      getBoost,
      recordVote,
      recordSave,
      recordUnsave,
      recordComment,
      recordFollow,
      recordUnfollow,
      recordProfileVisit,
      recordDwell,
      recordPublish,
    ],
  );

  return (
    <RecommendationTasteContext.Provider value={value}>{children}</RecommendationTasteContext.Provider>
  );
}

export function useRecommendationTaste(): RecommendationTasteContextValue {
  const ctx = useContext(RecommendationTasteContext);
  if (!ctx) {
    throw new Error('useRecommendationTaste must be used within <RecommendationTasteProvider>');
  }
  return ctx;
}
