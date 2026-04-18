/**
 * phraseThreadsStorage — legacy compatibility shim.
 *
 * The real per-user storage now lives in `thoughtsStorage.ts`.
 * This file re-exports the types and functions that were previously imported
 * directly by other modules so nothing breaks.
 *
 * New code should import from `@evoconn/services/thoughtsStorage` directly.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConversationItem } from '@evoconn/types';
import type { DebateMessage } from '@evoconn/types/debate';

export type PersistedPhraseThought = ConversationItem & {
  type: 'phrase';
  messages?: DebateMessage[];
  phraseNotes?: string;
};

/**
 * @deprecated  Use `loadThoughtsForUser` from `thoughtsStorage` instead.
 * Kept so any external callers continue to compile.  Returns an empty array
 * because the global key has been migrated away.
 */
export async function loadPhraseThoughtsFromStorage(): Promise<PersistedPhraseThought[]> {
  try {
    const raw = await AsyncStorage.getItem('evoconn_phrase_threads_v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter(
      (x): x is PersistedPhraseThought =>
        !!x &&
        typeof x === 'object' &&
        (x as Record<string, unknown>).type === 'phrase' &&
        typeof (x as Record<string, unknown>).id === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * @deprecated  Use `saveThoughtsForUser` from `thoughtsStorage` instead.
 * This no-ops now that storage is user-scoped; included only for compile compat.
 */
export async function savePhraseThoughtsToStorage(
  _rows: PersistedPhraseThought[],
): Promise<void> {
  // Intentional no-op — see thoughtsStorage.ts for the real implementation.
}
