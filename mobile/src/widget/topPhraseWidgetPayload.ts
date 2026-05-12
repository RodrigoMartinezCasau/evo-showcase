import type { CommunityPost } from '@evoconn/types';
import { CLAN_TO_COLOR } from '@evoconn/constants/clanColors';

/** JSON written to App Group UserDefaults for the iOS WidgetKit extension (contract for native code). */
export type TopPhraseWidgetPayload = {
  /** `top_phrase_day` = most upvoted phrase since local midnight (same feed as the app). */
  kind: 'top_phrase_day';
  postId: string;
  /** Truncated for small widget; full phrase can be longer in medium/large later */
  bodyPreview: string;
  upvotes: number;
  authorUsername: string;
  quoteAuthor?: string;
  /** Hex color of the author's clan (e.g. "#529da2"). Defaults to lime (#c7ff02) for no-clan. */
  clanColor: string;
  /** When this snapshot was computed (ISO 8601) */
  computedAt: string;
};

/** Max characters stored for the widget body (UserDefaults size). */
const BODY_MAX = 3500;

function truncate(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function parseCreatedAt(createdAt: string): number {
  const t = Date.parse(createdAt);
  return Number.isFinite(t) ? t : 0;
}

function startOfLocalCalendarDay(d: Date): number {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}

/**
 * Picks the single phrase (`type === 'phrase'`) with most upvotes **today** (local calendar day).
 * Uses the same `posts` array as the in-app feed (`useFeedStore` → `SimulationContext`, including Supabase-backed posts).
 * Ties: newer `createdAt` wins.
 */
export function computeTopPhraseWidgetPayload(
  posts: CommunityPost[],
  now: Date = new Date(),
): TopPhraseWidgetPayload | null {
  const cutoff = startOfLocalCalendarDay(now);
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
  const clanColor =
    top.author.clanId && top.author.clanId in CLAN_TO_COLOR
      ? CLAN_TO_COLOR[top.author.clanId as keyof typeof CLAN_TO_COLOR]
      : '#c7ff02';
  return {
    kind: 'top_phrase_day',
    postId: top.id,
    bodyPreview: truncate(top.body ?? '', BODY_MAX),
    upvotes: top.voteStats.up,
    authorUsername: top.author.username,
    quoteAuthor: top.quoteAuthor,
    clanColor,
    computedAt: now.toISOString(),
  };
}
