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
 * profile switches. Real users (Supabase UUID) also sync to
 * `user_unlocked_phrases` for cross-device recovery.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDomainStats, type DomainStats } from '@evoconn/logic/quotes/getDomainStats';
import { ALL_QUOTES, selectBestQuote, selectQuoteCandidates } from '@evoconn/data/quotes';
import { selectQuoteWithAI } from '@evoconn/services/quoteSelectionApi';
import type { Quote } from '@evoconn/types/quotes';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useAuth } from '../../mobile/lib/AuthContext';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import {
  fetchUnlockedPhrases,
  mergeUnlockedPhraseIds,
  pushMissingUnlockedPhrases,
  pushUnlockedPhrase,
} from '@evoconn/services/quotesSync';

// v2: reset to zero — old sequential unlocks (unlockNextPhrase) are discarded.
// Only phrases selected and shown via selectAndUnlockQuote count from now on.
const STORAGE_KEY = '@physicscopilot/quotes_v2';

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
  /**
   * Select the best matching quote from the DB for the given reflection text,
   * unlock it for the active user (no-op if already unlocked), and return it.
   * This is the main entry point after a user sends a reflection.
   */
  selectAndUnlockQuote: (reflectionText: string) => Promise<Quote>;
}

// ─── Context defaults ─────────────────────────────────────────────────────────

const QuotesContext = createContext<QuotesContextValue>({
  unlockedPhraseIds:    [],
  totalUnlocked:        0,
  domainStats:          [],
  unlockPhrase:         () => {},
  isUnlocked:           () => false,
  unlockNextPhrase:     () => {},
  selectAndUnlockQuote: async (text: string) => selectBestQuote(text),
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function QuotesProvider({ children }: { children: React.ReactNode }) {
  const sim = useSimulation();
  const { profile: authProfile } = useAuth();
  const activeUserId = authProfile?.id ?? sim.activeUserId;

  // Full DB loaded from AsyncStorage (all users).
  const [db, setDb] = useState<QuotesDB>({});
  const [loaded, setLoaded] = useState(false);
  const dbRef = useRef<QuotesDB>(db);
  dbRef.current = db;

  const hydratedRemoteRef = useRef<Set<string>>(new Set());

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

  // Cross-device recovery: merge Supabase backup for real users.
  useEffect(() => {
    const uid = authProfile?.id;
    if (!uid || !isRealUserId(uid)) return;
    if (!loaded) return;
    if (hydratedRemoteRef.current.has(uid)) return;
    hydratedRemoteRef.current.add(uid);

    let cancelled = false;
    void (async () => {
      const remote = await fetchUnlockedPhrases(uid);
      if (cancelled) return;
      const local = dbRef.current[uid] ?? [];
      const merged = mergeUnlockedPhraseIds(local, remote);
      if (merged.length === local.length && merged.every((id, i) => id === local[i])) {
        if (remote.length > 0) {
          void pushMissingUnlockedPhrases(uid, local, remote);
        }
        return;
      }
      setDb((prev) => {
        const next = { ...prev, [uid]: merged };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(console.error);
        return next;
      });
      void pushMissingUnlockedPhrases(uid, merged, remote);
    })();
    return () => {
      cancelled = true;
    };
  }, [authProfile?.id, loaded]);

  // Active user's unlocked IDs (empty array until loaded or if never unlocked).
  const unlockedPhraseIds: string[] = useMemo(
    () => (loaded ? (db[activeUserId] ?? []) : []),
    [db, activeUserId, loaded],
  );

  // Persist updated ID list for a user and update local state atomically.
  const persistForUser = useCallback(
    (userId: string, ids: string[]) => {
      setDb((prev) => {
        const updated = { ...prev, [userId]: ids };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
        return updated;
      });
      if (isRealUserId(userId)) {
        const prevIds = dbRef.current[userId] ?? [];
        const added = ids.filter((id) => !prevIds.includes(id));
        for (const phraseId of added) {
          void pushUnlockedPhrase(userId, phraseId);
        }
      }
    },
    [],
  );

  const unlockPhrase = useCallback(
    (id: string) => {
      const current = dbRef.current[activeUserId] ?? [];
      if (current.includes(id)) return;
      persistForUser(activeUserId, [...current, id]);
    },
    [activeUserId, persistForUser],
  );

  const unlockNextPhrase = useCallback(
    (preferDomain?: string) => {
      const current = new Set(dbRef.current[activeUserId] ?? []);

      // First try the preferred domain, then fall back to all quotes in order.
      const next = preferDomain
        ? (ALL_QUOTES.find((q) => q.domain === preferDomain && !current.has(q.id))
            ?? ALL_QUOTES.find((q) => !current.has(q.id)))
        : ALL_QUOTES.find((q) => !current.has(q.id));

      if (!next) return; // all quotes already unlocked
      persistForUser(activeUserId, [...Array.from(current), next.id]);
    },
    [activeUserId, persistForUser],
  );

  const isUnlocked = useCallback(
    (id: string) => unlockedPhraseIds.includes(id),
    [unlockedPhraseIds],
  );

  const selectAndUnlockQuote = useCallback(
    async (reflectionText: string): Promise<Quote> => {
      const candidates = selectQuoteCandidates(reflectionText, 25);
      const aiSelectedId = await selectQuoteWithAI(reflectionText, candidates);
      const selected =
        (aiSelectedId ? candidates.find((quote) => quote.id === aiSelectedId) : null) ??
        candidates[0] ??
        selectBestQuote(reflectionText);
      const current = dbRef.current[activeUserId] ?? [];
      if (!current.includes(selected.id)) {
        persistForUser(activeUserId, [...current, selected.id]);
      }
      return selected;
    },
    [activeUserId, persistForUser],
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
      selectAndUnlockQuote,
    }),
    [unlockedPhraseIds, domainStats, unlockPhrase, isUnlocked, unlockNextPhrase, selectAndUnlockQuote],
  );

  return <QuotesContext.Provider value={value}>{children}</QuotesContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuotes(): QuotesContextValue {
  return useContext(QuotesContext);
}
