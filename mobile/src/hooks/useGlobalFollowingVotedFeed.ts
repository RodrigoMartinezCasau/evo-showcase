/**
 * Feed "Siguiendo" → Más votadas (24h / 30d): ranking GLOBAL de toda la app.
 * Caché separada por periodo para que 24h y 30d no compartan la misma lista.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CommunityPost } from '../types';
import {
  sortFollowingPosts,
  followingSortToTopVotedPeriod,
  isPostInTopVotedWindow,
  type FollowingSortOption,
  type TopVotedFeedPeriod,
} from '../constants/followingFeedSort';
import {
  fetchGloballyTopVotedPosts,
  fetchProfilesBatch,
  isRealUserId,
  type BasicProfile,
} from '../services/supabaseSocial';
import { isPublishedSimPostType, type SimPost } from '../data/simulation/simulatedNetwork';
import { simPostToCommunityPost } from './useFeedStore';
import { useSimulation } from './SimulationContext';

export type GlobalFollowingVotedFeed = {
  posts: CommunityPost[];
  loading: boolean;
};

async function buildAuthorProfileCacheFromSimPosts(
  simPosts: SimPost[],
): Promise<Record<string, BasicProfile>> {
  const ids = [
    ...new Set(
      simPosts
        .filter((p) => isPublishedSimPostType(p.type))
        .map((p) => p.authorId)
        .filter((id) => isRealUserId(id)),
    ),
  ];
  const cache: Record<string, BasicProfile> = {};
  if (ids.length > 0) {
    const profiles = await fetchProfilesBatch(ids);
    profiles.forEach((p) => {
      cache[p.id] = p;
    });
  }
  return cache;
}

function sortByVotesDesc(posts: CommunityPost[]): CommunityPost[] {
  return [...posts].sort((a, b) => {
    const diff = b.voteStats.up - a.voteStats.up;
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function filterPostsForPeriod(
  posts: CommunityPost[],
  period: TopVotedFeedPeriod,
): CommunityPost[] {
  return posts.filter((p) => isPostInTopVotedWindow(p.createdAt, period));
}

export function useGlobalFollowingVotedFeed(
  sort: FollowingSortOption,
  allPosts: CommunityPost[],
  blockedIds: ReadonlySet<string>,
): GlobalFollowingVotedFeed {
  const { activeUserId, ingestPostsByIds } = useSimulation();
  const period = followingSortToTopVotedPeriod(sort);
  const [cacheByPeriod, setCacheByPeriod] = useState<
    Partial<Record<TopVotedFeedPeriod, CommunityPost[]>>
  >({});
  const [loadingPeriod, setLoadingPeriod] = useState<TopVotedFeedPeriod | null>(
    null,
  );
  const fetchGenRef = useRef(0);
  const allPostsRef = useRef(allPosts);
  allPostsRef.current = allPosts;

  useEffect(() => {
    if (!period) {
      setLoadingPeriod(null);
      return;
    }

    const fetchGen = ++fetchGenRef.current;
    setLoadingPeriod(period);

    let cancelled = false;

    void (async () => {
      try {
        if (!isRealUserId(activeUserId)) {
          if (cancelled || fetchGen !== fetchGenRef.current) return;
          const simSorted = sortFollowingPosts(allPostsRef.current, sort);
          setCacheByPeriod((prev) => ({
            ...prev,
            [period]: filterPostsForPeriod(simSorted, period),
          }));
          return;
        }

        const simPosts = await fetchGloballyTopVotedPosts({ period });
        if (cancelled || fetchGen !== fetchGenRef.current) return;

        void ingestPostsByIds(simPosts.map((p) => p.id));
        const profileCache = await buildAuthorProfileCacheFromSimPosts(simPosts);
        if (cancelled || fetchGen !== fetchGenRef.current) return;

        const posts = simPosts
          .filter((p) => isPublishedSimPostType(p.type))
          .filter((p) => !blockedIds.has(p.authorId))
          .filter((p) => isPostInTopVotedWindow(p.createdAt, period))
          .map((p) => simPostToCommunityPost(p, profileCache));

        setCacheByPeriod((prev) => ({ ...prev, [period]: posts }));
      } finally {
        if (!cancelled && fetchGen === fetchGenRef.current) {
          setLoadingPeriod(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sort, period, activeUserId, blockedIds, ingestPostsByIds]);

  const posts = useMemo(() => {
    if (!period) return [];
    const cached = cacheByPeriod[period];
    if (!cached) return [];
    const liveById = new Map(allPosts.map((p) => [p.id, p]));
    return sortByVotesDesc(
      filterPostsForPeriod(
        cached.map((p) => liveById.get(p.id) ?? p),
        period,
      ),
    );
  }, [period, cacheByPeriod, allPosts]);

  const loading = period != null && loadingPeriod === period && !cacheByPeriod[period];

  return { posts, loading };
}
