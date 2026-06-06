import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CommunityPost } from '@evoconn/types';
import {
  fetchTopVotedPhraseInWindow,
  fetchProfilesBatch,
  isRealUserId,
  type BasicProfile,
} from '@evoconn/services/supabaseSocial';
import { simPostToCommunityPost } from '@evoconn/hooks/useFeedStore';
import {
  computeTopPhraseInWindowPayload,
  communityPostToWidgetPayload,
  getWidgetDailyPhraseWindow,
  type TopPhraseWidgetPayload,
} from './topPhraseWidgetPayload';

const STORAGE_KEY = '@evo/widget_phrase_daily_lock_v1';

type WidgetPhraseDailyLock = {
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
 * Frase del widget: ganadora del concurso de las **24 h anteriores** al inicio
 * del día local. Se calcula una vez y permanece **fija todo el día** (hasta
 * medianoche). Ranking global Supabase; fallback al feed local.
 */
export async function resolveTopPhraseWidgetPayload(
  localPosts: CommunityPost[],
  now: Date = new Date(),
): Promise<TopPhraseWidgetPayload | null> {
  const { startMs, endMs, displayDay } = getWidgetDailyPhraseWindow(now);

  const cached = await loadLock();
  if (cached?.displayDay === displayDay) {
    return cached.payload;
  }

  let payload: TopPhraseWidgetPayload | null = null;

  try {
    const topSim = await fetchTopVotedPhraseInWindow(startMs, endMs);
    if (topSim) {
      const profileCache: Record<string, BasicProfile> = {};
      if (isRealUserId(topSim.authorId)) {
        const profiles = await fetchProfilesBatch([topSim.authorId]);
        for (const p of profiles) profileCache[p.id] = p;
      }
      const post = simPostToCommunityPost(topSim, profileCache);
      payload = communityPostToWidgetPayload(post, displayDay, now);
    }
  } catch {
    // caer al feed local
  }

  if (!payload) {
    payload = computeTopPhraseInWindowPayload(
      localPosts,
      startMs,
      endMs,
      displayDay,
      now,
    );
  }

  // No fijar un día vacío hasta que el feed cubra frases de la ventana del concurso.
  const feedCoversWindow = localPosts.some((p) => {
    if (p.type !== 'phrase') return false;
    const ts = Date.parse(p.createdAt);
    return Number.isFinite(ts) && ts >= startMs && ts < endMs;
  });

  if (payload != null || feedCoversWindow) {
    await saveLock({ displayDay, payload });
  }

  return payload;
}
