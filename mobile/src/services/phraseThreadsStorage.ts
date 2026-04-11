import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConversationItem } from '@evoconn/types';
import type { DebateMessage } from '@evoconn/types/debate';

const STORAGE_KEY = 'evoconn_phrase_threads_v1';

export type PersistedPhraseThought = ConversationItem & {
  type: 'phrase';
  messages?: DebateMessage[];
  phraseNotes?: string;
};

function isPhraseRow(x: unknown): x is PersistedPhraseThought {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return o.type === 'phrase' && typeof o.id === 'string' && typeof o.title === 'string';
}

export async function loadPhraseThoughtsFromStorage(): Promise<PersistedPhraseThought[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPhraseRow);
  } catch {
    return [];
  }
}

export async function savePhraseThoughtsToStorage(rows: PersistedPhraseThought[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore
  }
}
