/**
 * Cache de la última hidratación social en AsyncStorage.
 *
 * Motivación: en cold-start con Supabase saturado, esperar a la hidratación
 * fresca puede tardar 5–20 s (504s + reintentos). Sin cache el usuario ve un
 * spinner todo ese rato. Con cache renderizamos al instante (<150 ms) los
 * posts del último arranque, lanzamos el fetch fresco en background, y
 * cuando llega lo reemplazamos. Resultado: la app abre INMEDIATAMENTE
 * incluso si el backend está pidiendo perdón.
 *
 * El cache se guarda por usuario (key `cache-hydration-1{userId}`) y caduca
 * a las 7 días. Si la app cambia de cuenta, se usa el cache de la nueva
 * cuenta (no se reutiliza el de otra identidad).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SimComment, SimPost } from '../data/simulation/simulatedNetwork';

export type CachedHydrationPayload = {
  sbPosts: SimPost[];
  myVotesMap: Record<string, 'up' | 'down'>;
  mySavedPostIds: string[];
  following: string[];
  followers: string[];
  /** Solo metadata mínima para mostrar count en cards. Los comentarios completos se cargan JIT. */
  commentsByPost?: Record<string, SimComment[]>;
};

type CacheEnvelope = {
  v: 1;
  savedAt: number;
  userId: string;
  payload: CachedHydrationPayload;
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const KEY_PREFIX = 'cache-hydration-1';

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

/** Lee la cache para un usuario. Devuelve null si no existe, caducó, o no parsea. */
export async function loadCachedHydration(
  userId: string,
): Promise<CachedHydrationPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const env = JSON.parse(raw) as CacheEnvelope;
    if (env.v !== 1) return null;
    if (env.userId !== userId) return null;
    if (Date.now() - env.savedAt > CACHE_TTL_MS) return null;
    return env.payload;
  } catch {
    return null;
  }
}

/** Persiste la cache. Fire-and-forget; no bloquea. */
export async function saveCachedHydration(
  userId: string,
  payload: CachedHydrationPayload,
): Promise<void> {
  try {
    const envelope: CacheEnvelope = {
      v: 1,
      savedAt: Date.now(),
      userId,
      payload,
    };
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(envelope));
  } catch {
    // Ignorar — cache es best-effort, la app sigue funcionando sin ella.
  }
}

/** Limpia la cache de un usuario (e.g. al cerrar sesión). */
export async function clearCachedHydration(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(userId));
  } catch {
    // noop
  }
}
