/**
 * Local deterministic book recommendation engine.
 *
 * Rules enforced:
 *  1. Returns exactly 2 books (or fewer if the pool is exhausted).
 *  2. The 2 books are always from DIFFERENT authors.
 *  3. Books already in `shownBookIds` are excluded.
 *  4. Difficulty is matched to the user's rank.
 *  5. Philosophy relevance is scored from `philosophyPercentages`.
 */
import { BOOK_DATABASE, type BookRecord, type BookDifficulty } from '@evoconn/data/books/bookDatabase';
import type { Rank } from '@evoconn/types';

// Clan percentage entry (mirrors PhilosophyContext['clan_percentages'])
export type ClanPct = { clanId: string; label?: string; pct: number };

export type BookRecommendationResult =
  | { status: 'ok'; books: BookRecord[] }
  | { status: 'exhausted' };

// ── Rank → allowed difficulty levels ──────────────────────────────────────────
//
// aprendiz  → beginner only
// maestro   → beginner + intermediate
// filosofo  → all (beginner / intermediate / advanced)
//
const RANK_ALLOWED: Record<Rank, BookDifficulty[]> = {
  aprendiz:  ['beginner'],
  maestro:   ['beginner', 'intermediate'],
  filosofo:  ['beginner', 'intermediate', 'advanced'],
};

// ── Score a book against the user's philosophical percentages ─────────────────
function philosophyScore(book: BookRecord, clanPcts: ClanPct[]): number {
  let score = 0;
  for (const entry of clanPcts) {
    const idx = book.philosophies.indexOf(entry.clanId);
    if (idx === -1) continue;
    // Primary philosophy match (idx 0) is worth more than secondary (idx 1+)
    const positionWeight = idx === 0 ? 1.0 : 0.5;
    score += entry.pct * positionWeight;
  }
  return score;
}

/**
 * Pick 2 books for the user, respecting all constraints.
 *
 * @param rank               The user's rank ('aprendiz' | 'maestro' | 'filosofo').
 * @param clanPcts           Array of { clanId, pct } representing the user's philosophy distribution.
 * @param shownBookIds       Ids of books that have already been recommended (history).
 * @returns                  { status: 'ok', books } with exactly 1 or 2 books,
 *                           or { status: 'exhausted' } if no valid candidates remain.
 */
export function getBookRecommendations(
  rank: Rank,
  clanPcts: ClanPct[],
  shownBookIds: string[],
): BookRecommendationResult {
  const shownSet = new Set(shownBookIds);
  const allowedDifficulties = new Set<BookDifficulty>(RANK_ALLOWED[rank] ?? RANK_ALLOWED.aprendiz);

  // 1. Filter: correct difficulty + not already shown
  const candidates = BOOK_DATABASE.filter(
    (b) => allowedDifficulties.has(b.difficulty) && !shownSet.has(b.id),
  );

  if (candidates.length === 0) {
    return { status: 'exhausted' };
  }

  // 2. Score and sort by philosophy relevance
  const scored = candidates
    .map((b) => ({ book: b, score: philosophyScore(b, clanPcts) }))
    .sort((a, b) => b.score - a.score);

  // 3. Pick the top-scoring book as the first pick
  const first = scored[0].book;

  // 4. Find the best second book from a DIFFERENT author
  const second = scored.find((s) => s.book.author !== first.author)?.book ?? null;

  const result: BookRecord[] = second ? [first, second] : [first];

  return { status: 'ok', books: result };
}
