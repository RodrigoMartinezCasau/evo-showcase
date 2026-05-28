/**
 * quotesSync.ts — backup de frases desbloqueadas en Supabase.
 *
 * Patrón idéntico a thoughtsSync: local = fuente de trabajo; Supabase =
 * copia universal para reinstalar / cambiar de móvil.
 */
import { supabase } from '../../mobile/lib/supabase';
import { isRealUserId } from './supabaseSocial';

const TABLE = 'user_unlocked_phrases';

type UnlockedPhraseRow = {
  user_id: string;
  phrase_id: string;
  unlocked_at: string;
};

/** Unión no destructiva: nunca pierde IDs de ningún lado. */
export function mergeUnlockedPhraseIds(local: string[], remote: string[]): string[] {
  return Array.from(new Set([...local, ...remote]));
}

export async function fetchUnlockedPhrases(userId: string): Promise<string[]> {
  if (!isRealUserId(userId)) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('phrase_id')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: true });
    if (error) {
      console.warn('[QuotesSync] fetchUnlockedPhrases failed', error.message);
      return [];
    }
    return (data ?? [])
      .map((row) => String((row as UnlockedPhraseRow).phrase_id ?? '').trim())
      .filter(Boolean);
  } catch (err) {
    console.warn('[QuotesSync] fetchUnlockedPhrases threw', err);
    return [];
  }
}

/** Upsert de un ID recién desbloqueado. Best-effort. */
export async function pushUnlockedPhrase(userId: string, phraseId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const id = phraseId.trim();
  if (!id) return;
  try {
    const { error } = await supabase.from(TABLE).upsert(
      { user_id: userId, phrase_id: id, unlocked_at: new Date().toISOString() },
      { onConflict: 'user_id,phrase_id' },
    );
    if (error) console.warn('[QuotesSync] pushUnlockedPhrase failed', error.message);
  } catch (err) {
    console.warn('[QuotesSync] pushUnlockedPhrase threw', err);
  }
}

/** Sube IDs locales que aún no están en remoto (p. ej. tras merge). */
export async function pushMissingUnlockedPhrases(
  userId: string,
  localIds: string[],
  remoteIds: string[],
): Promise<void> {
  if (!isRealUserId(userId)) return;
  const remoteSet = new Set(remoteIds);
  const missing = localIds.filter((id) => !remoteSet.has(id));
  if (missing.length === 0) return;
  try {
    const rows = missing.map((phrase_id) => ({
      user_id: userId,
      phrase_id,
      unlocked_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, {
      onConflict: 'user_id,phrase_id',
    });
    if (error) console.warn('[QuotesSync] pushMissingUnlockedPhrases failed', error.message);
  } catch (err) {
    console.warn('[QuotesSync] pushMissingUnlockedPhrases threw', err);
  }
}
