import { ALL_QUOTES, getQuotesByDomain } from '@evoconn/data/quotes';
import { DOMAINS, type DomainMeta } from '@evoconn/types/quotes';

export interface DomainStats extends DomainMeta {
  total:      number;
  unlocked:   number;
  percentage: number;
}

/**
 * Computes per-domain unlock statistics based on the user's unlocked phrase IDs.
 */
export function getDomainStats(unlockedPhraseIds: string[]): DomainStats[] {
  const unlockedSet = new Set(unlockedPhraseIds);

  return DOMAINS.map(domain => {
    const domainQuotes = getQuotesByDomain(domain.id);
    const total        = domainQuotes.length;
    const unlocked     = domainQuotes.filter(q => unlockedSet.has(q.id)).length;
    const percentage   = total > 0 ? Math.round((unlocked / total) * 100) : 0;

    return { ...domain, total, unlocked, percentage };
  });
}

/** Total number of quotes in the database. */
export const TOTAL_QUOTES_IN_DB = ALL_QUOTES.length;
