/**
 * Persisted local book recommendations for the philosophy detail screen.
 * Survives app reloads (unlike in-memory shownBookIds).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BookRecord } from '@evoconn/data/books/bookDatabase';

const KEY_PREFIX = '@physicscopilot/philosophy_books_v1';

export type PersistedPhilosophyBooks = {
  books: BookRecord[];
  shownBookIds: string[];
  exhausted: boolean;
};

export async function loadPhilosophyBooks(
  userId: string,
): Promise<PersistedPhilosophyBooks | null> {
  try {
    const raw = await AsyncStorage.getItem(`${KEY_PREFIX}:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedPhilosophyBooks;
    if (!parsed || !Array.isArray(parsed.shownBookIds)) return null;
    return {
      books: Array.isArray(parsed.books) ? parsed.books : [],
      shownBookIds: parsed.shownBookIds,
      exhausted: Boolean(parsed.exhausted),
    };
  } catch {
    return null;
  }
}

export async function savePhilosophyBooks(
  userId: string,
  data: PersistedPhilosophyBooks,
): Promise<void> {
  try {
    await AsyncStorage.setItem(`${KEY_PREFIX}:${userId}`, JSON.stringify(data));
  } catch {
    // Best-effort — UI state is still authoritative for the session.
  }
}
