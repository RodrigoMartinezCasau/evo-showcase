/**
 * Mantiene `mockCurrentUser.clanId` y `profiles.clan_id` alineados con el clan
 * revelado por clasificación (cuando el perfil aún no lo tiene en Supabase).
 *
 * Optimizaciones de rendimiento:
 *   - El sync a `mockCurrentUser` mutamos sin disparar re-renders.
 *   - La persistencia a Supabase NO llama `refreshProfile()`: refetch dispara
 *     `setFetching(true)` durante varios segundos y eso causaba la UI bloqueada
 *     y pulsos de StarFieldBackground. Persistimos por debajo y dejamos que
 *     la próxima carga natural de perfil (login, AppState resume, etc.) traiga
 *     el `clan_id` actualizado.
 *   - Cacheamos el último (profileId, clanId) persistido para no reintentar
 *     escrituras en re-renders posteriores.
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '../../mobile/lib/AuthContext';
import { useEffectiveClanId } from '@evoconn/hooks/useEffectiveClanId';
import { setActiveSimUser, mockCurrentUser } from '@evoconn/data/mockUser';
import { SIM_USERS_BY_ID } from '@evoconn/data/simulation/simulatedNetwork';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import { supabase } from '../../mobile/lib/supabase';

export function EffectiveClanSync() {
  const { profile } = useAuth();
  const effectiveClanId = useEffectiveClanId();
  const lastPersistedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profile?.id || SIM_USERS_BY_ID[profile.id]) return;

    setActiveSimUser({
      id: profile.id,
      username: mockCurrentUser.username,
      clanId: effectiveClanId,
      rank: profile.rank ?? mockCurrentUser.rank,
      followersCount: mockCurrentUser.followersCount,
      followingCount: mockCurrentUser.followingCount,
      avatarUri: profile.avatar_url ?? mockCurrentUser.avatarUri,
    });
  }, [
    profile?.id,
    profile?.rank,
    profile?.avatar_url,
    effectiveClanId,
  ]);

  useEffect(() => {
    if (!profile?.id || !isRealUserId(profile.id)) return;
    if (!effectiveClanId || profile.clan_id === effectiveClanId) return;

    // Skip if we've already persisted this exact (user, clan) pair in this
    // session — avoids redundant writes when local state lags behind DB.
    const key = `${profile.id}|${effectiveClanId}`;
    if (lastPersistedRef.current === key) return;
    lastPersistedRef.current = key;

    // Fire-and-forget. Intentionally NOT calling refreshProfile() afterwards:
    // it would trigger setFetching(true) and stutter the UI. The DB is now
    // authoritative; local state will catch up on next natural profile load.
    void supabase
      .from('profiles')
      .update({ clan_id: effectiveClanId })
      .eq('id', profile.id);
  }, [profile?.id, profile?.clan_id, effectiveClanId]);

  return null;
}
