import type { CommunityPost } from '@evoconn/types';

export type FollowingSortOption = 'recientes' | 'votadas_mes' | 'votadas_24h';

/** Display order in the Siguiendo dropdown (default sort is `recientes`). */
export const FOLLOWING_SORT_MENU_ORDER: FollowingSortOption[] = [
  'votadas_mes',
  'votadas_24h',
  'recientes',
];

export const FOLLOWING_SORT_LABELS: Record<FollowingSortOption, string> = {
  votadas_mes: 'Más votadas del último mes',
  votadas_24h: 'Más votadas de las últimas 24 horas',
  recientes: 'Más recientes',
};

const MS_DAY = 86_400_000;

export function isFollowingSortOption(v: string): v is FollowingSortOption {
  return v === 'recientes' || v === 'votadas_mes' || v === 'votadas_24h';
}

export function parseFollowingSortParam(raw: unknown): FollowingSortOption {
  return typeof raw === 'string' && isFollowingSortOption(raw) ? raw : 'recientes';
}

export function sortFollowingPosts(
  posts: CommunityPost[],
  sort: FollowingSortOption,
): CommunityPost[] {
  const now = Date.now();
  switch (sort) {
    case 'recientes':
      return [...posts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case 'votadas_24h': {
      const cutoff = now - MS_DAY;
      return posts
        .filter(
          (p) =>
            new Date(p.createdAt).getTime() >= cutoff &&
            p.voteStats.up >= 1,
        )
        .sort((a, b) => b.voteStats.up - a.voteStats.up);
    }
    case 'votadas_mes': {
      const cutoff = now - 30 * MS_DAY;
      return posts
        .filter(
          (p) =>
            new Date(p.createdAt).getTime() >= cutoff &&
            p.voteStats.up >= 1,
        )
        .sort((a, b) => b.voteStats.up - a.voteStats.up);
    }
  }
}
