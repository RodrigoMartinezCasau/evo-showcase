/**
 * IDs de los 100 primeros perfiles reales (orden por created_at en Supabase).
 * Caché en memoria para no repetir la consulta en cada perfil abierto.
 */
import { supabase } from '../../mobile/lib/supabase';
import { isRealUserId } from '@evoconn/services/supabaseSocial';

export const FIRST_USERS_BADGE_LIMIT = 100;

const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedIds: Set<string> | null = null;
let cacheExpiresAt = 0;
let inflight: Promise<Set<string>> | null = null;

export async function fetchFirstHundredUserIds(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedIds && now < cacheExpiresAt) return cachedIds;
  if (inflight) return inflight;

  inflight = (async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(FIRST_USERS_BADGE_LIMIT);

    if (error) {
      console.warn('[firstUsersBadge] fetch failed:', error.message);
      return cachedIds ?? new Set<string>();
    }

    const ids = new Set((data ?? []).map((r) => String(r.id)));
    cachedIds = ids;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return ids;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export async function isFirstHundredUser(userId: string | null | undefined): Promise<boolean> {
  const id = userId?.trim();
  if (!id || !isRealUserId(id)) return false;
  const ids = await fetchFirstHundredUserIds();
  return ids.has(id);
}

/** Fuerza recarga tras nuevos registros (opcional). */
export function invalidateFirstUsersBadgeCache(): void {
  cachedIds = null;
  cacheExpiresAt = 0;
}
