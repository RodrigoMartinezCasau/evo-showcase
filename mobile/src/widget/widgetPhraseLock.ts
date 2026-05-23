import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CommunityPost } from '@evoconn/types';
import {
  computeYesterdayTopPhrasePayload,
  localCalendarDayKey,
  startOfLocalCalendarDay,
  type TopPhraseWidgetPayload,
} from './topPhraseWidgetPayload';

const STORAGE_KEY = '@evo/widget_phrase_daily_lock_v1';

type WidgetPhraseDailyLock = {
  /** Día local para el que esta frase está fijada (YYYY-MM-DD). */
  displayDay: string;
  payload: TopPhraseWidgetPayload | null;
};

async function loadLock(): Promise<WidgetPhraseDailyLock | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WidgetPhraseDailyLock;
    if (!parsed?.displayDay) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveLock(lock: WidgetPhraseDailyLock): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lock));
  } catch {
    // best-effort
  }
}

/**
 * Frase del widget fijada para hoy: la más votada de **ayer**.
 * Una vez calculada, no cambia hasta medianoche local.
 */
export async function resolveTopPhraseWidgetPayload(
  posts: CommunityPost[],
  now: Date = new Date(),
): Promise<TopPhraseWidgetPayload | null> {
  const displayDay = localCalendarDayKey(now);
  const cached = await loadLock();
  if (cached?.displayDay === displayDay) {
    return cached.payload;
  }

  const payload = computeYesterdayTopPhrasePayload(posts, now);

  // No fijar un día vacío hasta que el feed incluya frases anteriores a hoy
  // (evita bloquear antes de que Supabase hidrate publicaciones de ayer).
  const todayStart = startOfLocalCalendarDay(now);
  const feedCoversPastPhrases = posts.some((p) => {
    if (p.type !== 'phrase') return false;
    const ts = Date.parse(p.createdAt);
    return Number.isFinite(ts) && ts < todayStart;
  });

  if (payload != null || feedCoversPastPhrases) {
    await saveLock({ displayDay, payload });
  }

  return payload;
}
