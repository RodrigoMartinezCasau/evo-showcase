import type { CommunityPost } from '@evoconn/types';
import { CLAN_TO_COLOR } from '@evoconn/constants/clanColors';

const MS_DAY = 86_400_000;

/** JSON written to App Group UserDefaults for the iOS WidgetKit extension (contract for native code). */
export type TopPhraseWidgetPayload = {
  /**
   * Ganadora del concurso de las 24 h **anteriores** al inicio del día local,
   * fijada y visible todo el día (no cambia hasta medianoche).
   */
  kind: 'top_phrase_daily';
  postId: string;
  bodyPreview: string;
  upvotes: number;
  authorUsername: string;
  quoteAuthor?: string;
  clanColor: string;
  computedAt: string;
  /** Día local (YYYY-MM-DD) para el que esta frase permanece fija. */
  lockedForDay: string;
};

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

export function localCalendarDayKey(d: Date = new Date()): string {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const day = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Ventana del concurso diario del widget: las 24 h inmediatamente **anteriores**
 * al inicio del día local de hoy → [medianoche−24h, medianoche hoy).
 * Esa ganadora se muestra fija durante todo el día `displayDay`.
 */
export function getWidgetDailyPhraseWindow(now: Date = new Date()): {
  startMs: number;
  endMs: number;
  displayDay: string;
} {
  const todayStart = startOfLocalCalendarDay(now);
  return {
    startMs: todayStart - MS_DAY,
    endMs: todayStart,
    displayDay: localCalendarDayKey(now),
  };
}

export function communityPostToWidgetPayload(
  top: CommunityPost,
  lockedForDay: string,
  now: Date = new Date(),
): TopPhraseWidgetPayload {
  const clanColor =
    top.author.clanId && top.author.clanId in CLAN_TO_COLOR
      ? CLAN_TO_COLOR[top.author.clanId as keyof typeof CLAN_TO_COLOR]
      : '#c7ff02';
  return {
    kind: 'top_phrase_daily',
    postId: top.id,
    bodyPreview: truncate(top.body ?? '', BODY_MAX),
    upvotes: top.voteStats.up,
    authorUsername: top.author.username,
    quoteAuthor: top.quoteAuthor,
    clanColor,
    computedAt: now.toISOString(),
    lockedForDay,
  };
}

/**
 * Concurso local (fallback): frases publicadas en [startMs, endMs), más votadas primero.
 */
export function computeTopPhraseInWindowPayload(
  posts: CommunityPost[],
  startMs: number,
  endMs: number,
  lockedForDay: string,
  now: Date = new Date(),
): TopPhraseWidgetPayload | null {
  const candidates = posts.filter((p) => {
    if (p.type !== 'phrase') return false;
    const ts = parseCreatedAt(p.createdAt);
    return ts >= startMs && ts < endMs && p.voteStats.up >= 1;
  });
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const upA = a.voteStats.up;
    const upB = b.voteStats.up;
    if (upB !== upA) return upB - upA;
    return parseCreatedAt(b.createdAt) - parseCreatedAt(a.createdAt);
  });

  return communityPostToWidgetPayload(candidates[0]!, lockedForDay, now);
}
