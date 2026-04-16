import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { getDomainStats, type DomainStats } from '@evoconn/logic/quotes/getDomainStats';

// ─── Initial mock unlocked phrases ────────────────────────────────────────────
// 30 phrases distributed across domains to match mockUserStats.unlockedPhrases.
const INITIAL_UNLOCKED_IDS: string[] = [
  // filosofia (5)
  'filosofia-1', 'filosofia-2', 'filosofia-3', 'filosofia-4', 'filosofia-5',
  // existencia (4)
  'existencia-1', 'existencia-2', 'existencia-3', 'existencia-4',
  // libertad (4)
  'libertad-1', 'libertad-2', 'libertad-3', 'libertad-4',
  // sabiduria (4)
  'sabiduria-1', 'sabiduria-2', 'sabiduria-3', 'sabiduria-4',
  // amor (4)
  'amor-1', 'amor-2', 'amor-3', 'amor-4',
  // politica (3)
  'politica-1', 'politica-2', 'politica-3',
  // poder (2)
  'poder-1', 'poder-2',
  // disciplina, muerte, dolor, ambicion (1 each)
  'disciplina-1',
  'muerte-1',
  'dolor-1',
  'ambicion-1',
];

// ─── Context types ─────────────────────────────────────────────────────────────

interface QuotesContextValue {
  /** IDs of phrases the user has unlocked. */
  unlockedPhraseIds: string[];
  /** Total count of unlocked phrases. */
  totalUnlocked: number;
  /** Per-domain unlock statistics. */
  domainStats: DomainStats[];
  /** Unlock a phrase by id. No-op if already unlocked. */
  unlockPhrase: (id: string) => void;
  /** Check if a specific phrase is unlocked. */
  isUnlocked: (id: string) => boolean;
}

const QuotesContext = createContext<QuotesContextValue>({
  unlockedPhraseIds: INITIAL_UNLOCKED_IDS,
  totalUnlocked:     INITIAL_UNLOCKED_IDS.length,
  domainStats:       [],
  unlockPhrase:      () => {},
  isUnlocked:        () => false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function QuotesProvider({ children }: { children: React.ReactNode }) {
  const [unlockedPhraseIds, setUnlockedPhraseIds] = useState<string[]>(INITIAL_UNLOCKED_IDS);

  const unlockPhrase = useCallback((id: string) => {
    setUnlockedPhraseIds(prev =>
      prev.includes(id) ? prev : [...prev, id],
    );
  }, []);

  const isUnlocked = useCallback(
    (id: string) => unlockedPhraseIds.includes(id),
    [unlockedPhraseIds],
  );

  const domainStats = useMemo(
    () => getDomainStats(unlockedPhraseIds),
    [unlockedPhraseIds],
  );

  const value = useMemo<QuotesContextValue>(
    () => ({
      unlockedPhraseIds,
      totalUnlocked: unlockedPhraseIds.length,
      domainStats,
      unlockPhrase,
      isUnlocked,
    }),
    [unlockedPhraseIds, domainStats, unlockPhrase, isUnlocked],
  );

  return (
    <QuotesContext.Provider value={value}>
      {children}
    </QuotesContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuotes(): QuotesContextValue {
  return useContext(QuotesContext);
}
