/**
 * Mantiene mockCurrentUser.clanId y profiles.clan_id alineados con el clan
 * revelado por clasificación (cuando el perfil aún no lo tiene en Supabase).
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '../../mobile/lib/AuthContext';
import { useEffectiveClanId } from '@evoconn/hooks/useEffectiveClanId';
import { setActiveSimUser, mockCurrentUser } from '@evoconn/data/mockUser';
import { SIM_USERS_BY_ID } from '@evoconn/data/simulation/simulatedNetwork';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import { supabase } from '../../mobile/lib/supabase';

export function EffectiveClanSync() {
  const { profile, refreshProfile } = useAuth();
  const effectiveClanId = useEffectiveClanId();
  const persistInFlightRef = useRef(false);

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
    if (persistInFlightRef.current) return;

    persistInFlightRef.current = true;
    void (async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ clan_id: effectiveClanId })
          .eq('id', profile.id);
        if (!error) await refreshProfile();
      } finally {
        persistInFlightRef.current = false;
      }
    })();
  }, [profile?.id, profile?.clan_id, effectiveClanId, refreshProfile]);

  return null;
}
