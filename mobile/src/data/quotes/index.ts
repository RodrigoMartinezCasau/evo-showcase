import type { Quote } from '@evoconn/types/quotes';

import { filosofiaQuotes }  from './domains/filosofia';
import { existenciaQuotes } from './domains/existencia';
import { libertadQuotes }   from './domains/libertad';
import { sabiduriiaQuotes } from './domains/sabiduria';
import { amorQuotes }       from './domains/amor';
import { poderQuotes }      from './domains/poder';
import { politicaQuotes }   from './domains/politica';
import { disciplinaQuotes } from './domains/disciplina';
import { muerteQuotes }     from './domains/muerte';
import { dolorQuotes }      from './domains/dolor';
import { ambicionQuotes }   from './domains/ambicion';
import { identidadQuotes }  from './domains/identidad';
import { sociedadQuotes }   from './domains/sociedad';
import { exitoQuotes }      from './domains/exito';
import { fracasoQuotes }    from './domains/fracaso';

/** The complete phrase database. All phrases in the app come from this source. */
export const ALL_QUOTES: Quote[] = [
  ...filosofiaQuotes,
  ...existenciaQuotes,
  ...libertadQuotes,
  ...sabiduriiaQuotes,
  ...amorQuotes,
  ...poderQuotes,
  ...politicaQuotes,
  ...disciplinaQuotes,
  ...muerteQuotes,
  ...dolorQuotes,
  ...ambicionQuotes,
  ...identidadQuotes,
  ...sociedadQuotes,
  ...exitoQuotes,
  ...fracasoQuotes,
];

/** Quick lookup by id. */
export const QUOTES_BY_ID: Record<string, Quote> = Object.fromEntries(
  ALL_QUOTES.map(q => [q.id, q]),
);

/** Get all quotes for a specific domain. */
export function getQuotesByDomain(domainId: string): Quote[] {
  return ALL_QUOTES.filter(q => q.domain === domainId);
}

// ─── Phrase selection algorithm ───────────────────────────────────────────────

const STOPWORDS_ES = new Set([
  'de', 'la', 'el', 'en', 'un', 'una', 'y', 'que', 'es', 'por', 'para',
  'con', 'no', 'los', 'las', 'del', 'al', 'lo', 'como', 'más', 'pero',
  'sus', 'le', 'ya', 'o', 'fue', 'este', 'ha', 'si', 'sí', 'porque',
  'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'ser', 'tiene', 'me',
  'hasta', 'hay', 'donde', 'han', 'quien', 'desde', 'todo', 'nos', 'mi',
  'tu', 'se', 'su', 'te', 'a', 'e', 'i', 'u', 'ni', 'tan', 'tal',
  'creo', 'pienso', 'opino', 'parece', 'algo', 'así', 'yo', 'tú', 'él',
  'ella', 'ellos', 'ello', 'mucho', 'poco', 'nada', 'todo', 'cada',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS_ES.has(w));
}

/**
 * Score a quote against reflection text using keyword matching.
 * Higher score = better match.
 */
function scoreQuote(quote: Quote, reflectionTokens: string[], reflectionText: string): number {
  let score = 0;

  // Score from tags (weighted 3×)
  for (const tag of quote.tags) {
    const tagTokens = tokenize(tag);
    for (const tt of tagTokens) {
      if (reflectionTokens.includes(tt)) score += 3;
    }
    // Exact multi-word tag match in full text
    if (reflectionText.toLowerCase().includes(tag.toLowerCase())) score += 5;
  }

  // Score from themes (weighted 2×)
  for (const theme of quote.themes) {
    const themeTokens = tokenize(theme);
    for (const tt of themeTokens) {
      if (reflectionTokens.includes(tt)) score += 2;
    }
    if (reflectionText.toLowerCase().includes(theme.toLowerCase())) score += 3;
  }

  // Score from quote text itself (weighted 1×)
  const quoteTokens = tokenize(quote.text);
  for (const qt of quoteTokens) {
    if (reflectionTokens.includes(qt)) score += 1;
  }

  return score;
}

/**
 * Select the most thematically appropriate quote from the database
 * based on the content of the user's reflection text.
 *
 * If multiple quotes tie, one is chosen pseudo-randomly using the text
 * length as a seed so the result is consistent for the same input.
 */
export function selectBestQuote(reflectionText: string): Quote {
  if (!reflectionText || !reflectionText.trim()) {
    // Return a random quote from the full database
    return ALL_QUOTES[Math.floor(Math.random() * ALL_QUOTES.length)];
  }

  const tokens = tokenize(reflectionText);

  let best: Quote[] = [];
  let bestScore = -1;

  for (const quote of ALL_QUOTES) {
    const s = scoreQuote(quote, tokens, reflectionText);
    if (s > bestScore) {
      bestScore = s;
      best = [quote];
    } else if (s === bestScore) {
      best.push(quote);
    }
  }

  // Tie-break: use text length mod best.length as a stable pseudo-random index
  const idx = reflectionText.length % best.length;
  return best[idx];
}
