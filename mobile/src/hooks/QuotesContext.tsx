/**
 * QuotesContext — real per-user persisted unlocked phrases.
 *
 * Each simulated user starts with 0 unlocked phrases.
 * Every time the user creates a new phrase (PhraseCreationScreen),
 * `unlockNextPhrase()` is called, which picks and unlocks the next
 * available quote from ALL_QUOTES in sequence, cycling across all domains.
 *
 * The per-domain progress bars in PhrasesDomainsScreen are driven by
 * the specific quote IDs stored here, so they reflect only real activity.
 *
 * Data is persisted per-user in AsyncStorage and survives reloads and
 * profile switches.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDomainStats, type DomainStats } from '@evoconn/logic/quotes/getDomainStats';
import { ALL_QUOTES } from '@evoconn/data/quotes';
import { useSimulation } from '@evoconn/hooks/SimulationContext';

const STORAGE_KEY = '@physicscopilot/quotes_v1';

// ─── Types ────────────────────────────────────────────────────────────────────

/** { [userId]: unlockedQuoteId[] } */
type QuotesDB = Record<string, string[]>;

interface QuotesContextValue {
  /** Sorted list of unlocked quote IDs for the active user. */
  unlockedPhraseIds: string[];
  /** Count of unlocked quotes for the active user. */
  totalUnlocked: number;
  /** Per-domain statistics derived from the real unlocked IDs. */
  domainStats: DomainStats[];
  /** Unlock a specific quote by ID. No-op if already unlocked. */
  unlockPhrase: (id: string) => void;
  /** Check whether a specific quote is unlocked for the active user. */
  isUnlocked: (id: string) => boolean;
  /**
   * Unlock the next available quote from ALL_QUOTES for the active user.
   * If `preferDomain` is provided, tries to pick a quote from that domain first;
   * falls back to the next quote globally if no domain match is available.
   * No-op if all quotes are already unlocked.
   */
  unlockNextPhrase: (preferDomain?: string) => void;
}

// ─── Context defaults ─────────────────────────────────────────────────────────

const QuotesContext = createContext<QuotesContextValue>({
  unlockedPhraseIds: [],
  totalUnlocked:     0,
  domainStats:       [],
  unlockPhrase:      () => {},
  isUnlocked:        () => false,
  unlockNextPhrase:  () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function QuotesProvider({ children }: { children: React.ReactNode }) {
  const sim = useSimulation();

  // Full DB loaded from AsyncStorage (all users).
  const [db, setDb] = useState<QuotesDB>({});
  const [loaded, setLoaded] = useState(false);

  // Load once on mount.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try { setDb(JSON.parse(raw) as QuotesDB); } catch {}
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  // Active user's unlocked IDs (empty array until loaded or if never unlocked).
  const unlockedPhraseIds: string[] = useMemo(
    () => (loaded ? (db[sim.activeUserId] ?? []) : []),
    [db, sim.activeUserId, loaded],
  );

  // Persist updated ID list for a user and update local state atomically.
  const persistForUser = useCallback(
    (userId: string, ids: string[]) => {
      setDb((prev) => {
        const updated = { ...prev, [userId]: ids };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
        return updated;
      });
    },
    [],
  );

  const unlockPhrase = useCallback(
    (id: string) => {
      const current = db[sim.activeUserId] ?? [];
      if (current.includes(id)) return;
      persistForUser(sim.activeUserId, [...current, id]);
    },
    [db, sim.activeUserId, persistForUser],
  );

  const unlockNextPhrase = useCallback(
    (preferDomain?: string) => {
      const current = new Set(db[sim.activeUserId] ?? []);

      // First try the preferred domain, then fall back to all quotes in order.
      const next = preferDomain
        ? (ALL_QUOTES.find((q) => q.domain === preferDomain && !current.has(q.id))
            ?? ALL_QUOTES.find((q) => !current.has(q.id)))
        : ALL_QUOTES.find((q) => !current.has(q.id));

      if (!next) return; // all quotes already unlocked
      persistForUser(sim.activeUserId, [...Array.from(current), next.id]);
    },
    [db, sim.activeUserId, persistForUser],
  );

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
      unlockNextPhrase,
    }),
    [unlockedPhraseIds, domainStats, unlockPhrase, isUnlocked, unlockNextPhrase],
  );

  return <QuotesContext.Provider value={value}>{children}</QuotesContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuotes(): QuotesContextValue {
  return useContext(QuotesContext);
}
