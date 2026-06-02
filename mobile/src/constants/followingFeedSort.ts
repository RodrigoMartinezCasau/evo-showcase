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

/**
 * Texto de la pestaña inferior "Siguiendo" según el filtro activo.
 * Recientes (default) mantiene "SIGUIENDO"; las votadas usan etiqueta corta.
 */
export const FOLLOWING_SORT_TAB_LABELS: Record<FollowingSortOption, string> = {
  recientes: 'SIGUIENDO',
  votadas_24h: '24 HORAS',
  votadas_mes: '30 DÍAS',
};

const MS_DAY = 86_400_000;

export type TopVotedFeedPeriod = '24h' | '30d';

/** Ventana en ms para ranking global (24 h exactas vs 30 días). */
export function getTopVotedWindowMs(period: TopVotedFeedPeriod): number {
  return period === '24h' ? MS_DAY : 30 * MS_DAY;
}

export function followingSortToTopVotedPeriod(
  sort: FollowingSortOption,
): TopVotedFeedPeriod | null {
  if (sort === 'votadas_24h') return '24h';
  if (sort === 'votadas_mes') return '30d';
  return null;
}

export function isPostInTopVotedWindow(
  createdAt: string,
  period: TopVotedFeedPeriod,
  nowMs: number = Date.now(),
): boolean {
  const ts = Date.parse(createdAt);
  if (!Number.isFinite(ts)) return false;
  return ts >= nowMs - getTopVotedWindowMs(period);
}

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
