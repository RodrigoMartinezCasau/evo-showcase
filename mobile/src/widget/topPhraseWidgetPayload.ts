import type { CommunityPost } from '@evoconn/types';

/** JSON written to App Group UserDefaults for the iOS WidgetKit extension (contract for native code). */
export type TopPhraseWidgetPayload = {
  kind: 'top_phrase_24h';
  postId: string;
  /** Truncated for small widget; full phrase can be longer in medium/large later */
  bodyPreview: string;
  upvotes: number;
  authorUsername: string;
  quoteAuthor?: string;
  /** When this snapshot was computed (ISO 8601) */
  computedAt: string;
};

const MS_24H = 24 * 60 * 60 * 1000;
const PREVIEW_MAX = 160;

function truncate(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function parseCreatedAt(createdAt: string): number {
  const t = Date.parse(createdAt);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Picks the single phrase (`type === 'phrase'`) with most upvotes in the rolling last 24h window.
 * Ties: newer `createdAt` wins.
 */
export function computeTopPhraseWidgetPayload(
  posts: CommunityPost[],
  now: Date = new Date(),
): TopPhraseWidgetPayload | null {
  const cutoff = now.getTime() - MS_24H;
  const candidates = posts.filter((p) => {
    if (p.type !== 'phrase') return false;
    return parseCreatedAt(p.createdAt) >= cutoff;
  });
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const upA = a.voteStats.up;
    const upB = b.voteStats.up;
    if (upB !== upA) return upB - upA;
    return parseCreatedAt(b.createdAt) - parseCreatedAt(a.createdAt);
  });

  const top = candidates[0]!;
  return {
    kind: 'top_phrase_24h',
    postId: top.id,
    bodyPreview: truncate(top.body ?? '', PREVIEW_MAX),
    upvotes: top.voteStats.up,
    authorUsername: top.author.username,
    quoteAuthor: top.quoteAuthor,
    computedAt: now.toISOString(),
  };
}
