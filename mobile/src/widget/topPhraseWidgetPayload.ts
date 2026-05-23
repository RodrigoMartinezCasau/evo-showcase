import type { CommunityPost } from '@evoconn/types';
import { CLAN_TO_COLOR } from '@evoconn/constants/clanColors';

/** JSON written to App Group UserDefaults for the iOS WidgetKit extension (contract for native code). */
export type TopPhraseWidgetPayload = {
  /** `top_phrase_yesterday` = frase más votada del día anterior, fijada todo el día local. */
  kind: 'top_phrase_yesterday';
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
  /** Día local (YYYY-MM-DD) para el que esta frase permanece fija. */
  lockedForDay: string;
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

export function startOfLocalCalendarDay(d: Date): number {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}

/** Clave `YYYY-MM-DD` en calendario local del dispositivo. */
export function localCalendarDayKey(d: Date = new Date()): string {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const day = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Ventana [inicio ayer, inicio hoy) en ms UTC-equivalente local. */
export function getYesterdayWindow(now: Date = new Date()): {
  startMs: number;
  endMs: number;
  yesterdayKey: string;
  displayDayKey: string;
} {
  const todayStart = startOfLocalCalendarDay(now);
  const yesterdayDate = new Date(todayStart);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStart = yesterdayDate.getTime();
  return {
    startMs: yesterdayStart,
    endMs: todayStart,
    yesterdayKey: localCalendarDayKey(yesterdayDate),
    displayDayKey: localCalendarDayKey(now),
  };
}

/**
 * Frase más votada del **día anterior** (calendario local).
 * Ties: newer `createdAt` wins.
 */
export function computeYesterdayTopPhrasePayload(
  posts: CommunityPost[],
  now: Date = new Date(),
): TopPhraseWidgetPayload | null {
  const { startMs, endMs, displayDayKey } = getYesterdayWindow(now);
  const candidates = posts.filter((p) => {
    if (p.type !== 'phrase') return false;
    const ts = parseCreatedAt(p.createdAt);
    return ts >= startMs && ts < endMs;
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
    kind: 'top_phrase_yesterday',
    postId: top.id,
    bodyPreview: truncate(top.body ?? '', BODY_MAX),
    upvotes: top.voteStats.up,
    authorUsername: top.author.username,
    quoteAuthor: top.quoteAuthor,
    clanColor,
    computedAt: now.toISOString(),
    lockedForDay: displayDayKey,
  };
}

/** @deprecated Use resolveTopPhraseWidgetPayload for daily lock. */
export function computeTopPhraseWidgetPayload(
  posts: CommunityPost[],
  now: Date = new Date(),
): TopPhraseWidgetPayload | null {
  return computeYesterdayTopPhrasePayload(posts, now);
}
