import type { Quote } from '@evoconn/types/quotes';
import { QUOTES_BY_ID } from '@evoconn/data/quotes';

/**
 * Returns the best matching stored phrase for a given reflection text.
 *
 * Matching is heuristic-based (tag/theme keyword overlap). This guarantees
 * only stored phrases are ever returned — the AI never invents a quote.
 *
 * @param reflectionText   - The user's reflection body.
 * @param unlockedPhraseIds - IDs the user has unlocked (only these are candidates).
 * @returns The best-matching Quote, or null if no candidates exist.
 */
export function getBestMatchingPhrase(
  reflectionText: string,
  unlockedPhraseIds: string[],
): Quote | null {
  if (unlockedPhraseIds.length === 0) return null;

  const candidates = unlockedPhraseIds
    .map(id => QUOTES_BY_ID[id])
    .filter(Boolean) as Quote[];

  if (candidates.length === 0) return null;

  // Normalize reflection into a set of significant words (length > 3).
  const reflectionWords = reflectionText
    .toLowerCase()
    .replace(/[^a-záéíóúüñ\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);

  if (reflectionWords.length === 0) {
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }

  const wordSet = new Set(reflectionWords);

  const score = (quote: Quote): number => {
    let s = 0;

    const matchWord = (word: string) => {
      const w = word.toLowerCase();
      if (wordSet.has(w)) return true;
      for (const rw of reflectionWords) {
        if (rw.includes(w) || w.includes(rw)) return true;
      }
      return false;
    };

    // Tags: +2 per matched tag word.
    for (const tag of quote.tags) {
      for (const tw of tag.split(/\s+/)) {
        if (tw.length > 2 && matchWord(tw)) s += 2;
      }
    }

    // Themes: +1.5 per matched theme word.
    for (const theme of quote.themes) {
      for (const tw of theme.split(/\s+/)) {
        if (tw.length > 3 && matchWord(tw)) s += 1.5;
      }
    }

    // Domain: +1 if domain word appears in reflection.
    for (const dw of quote.domain.split(/\s+/)) {
      if (dw.length > 3 && matchWord(dw)) s += 1;
    }

    return s;
  };

  let best: Quote = candidates[0]!;
  let bestScore   = score(best);

  for (let i = 1; i < candidates.length; i++) {
    const s = score(candidates[i]!);
    if (s > bestScore) {
      bestScore = s;
      best      = candidates[i]!;
    }
  }

  // If no meaningful overlap found, fall back to a random candidate.
  if (bestScore === 0) {
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }

  return best;
}
