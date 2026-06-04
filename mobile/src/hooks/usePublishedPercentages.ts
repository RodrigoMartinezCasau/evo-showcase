/**
 * usePublishedPercentages
 *
 * Devuelve los porcentajes filosóficos "efectivos" para el PERFIL PERSONAL.
 *
 * Problema que resuelve: el perfil personal lee la clasificación del store
 * LOCAL (`ClassificationContext`). Tras instalar un build nuevo el storage
 * empieza vacío, así que `getPercentages()` devuelve `[]` y el perfil muestra
 * "0%" aunque Supabase tenga la distribución real. El perfil AJENO no sufre
 * esto porque lee directo de `profiles.clan_percentages`.
 *
 * Este hook replica esa fuente fiable: si el local ya tiene datos, los usa; si
 * está vacío, hace fallback al `clan_percentages` publicado en Supabase.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../mobile/lib/supabase';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import type { ClanPct } from '@evoconn/hooks/ClassificationContext';
import type { Rank } from '@evoconn/types';
import { getProfileRankFromPercentages } from '@evoconn/utils/getRankFromPct';

type PublishedClassification = {
  percentages: ClanPct[];
  clanId: string | null;
  rank: Rank;
};

function isRank(v: unknown): v is Rank {
  return v === 'aprendiz' || v === 'maestro' || v === 'filosofo';
}

/**
 * @param userId       id del usuario dueño del perfil (real de Supabase).
 * @param localPcts    porcentajes del store local (`getPercentages`).
 * @param localClanId  clan revelado en el store local (`getVisibleClanId`).
 * @param localRank    rango mostrado en el store local (`getDisplayRank`).
 */
export function usePublishedPercentages(
  userId: string | null | undefined,
  localPcts: ClanPct[],
  localClanId: string | null,
  localRank: Rank = 'aprendiz',
): PublishedClassification {
  const [remote, setRemote] = useState<PublishedClassification>({
    percentages: [],
    clanId: null,
    rank: 'aprendiz',
  });

  // Solo necesitamos el respaldo remoto cuando el local no tiene porcentajes.
  const needsFallback = localPcts.length === 0;

  useEffect(() => {
    if (!needsFallback || !userId || !isRealUserId(userId)) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('clan_id, clan_percentages, rank')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const pcts = Array.isArray((data as { clan_percentages?: unknown }).clan_percentages)
        ? ((data as { clan_percentages: unknown[] }).clan_percentages as ClanPct[])
        : [];
      const rawRank = (data as { rank?: unknown }).rank;
      setRemote({
        percentages: pcts,
        clanId: (data as { clan_id?: string | null }).clan_id ?? null,
        rank: isRank(rawRank) ? rawRank : 'aprendiz',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [needsFallback, userId]);

  if (!needsFallback) {
    return {
      percentages: localPcts,
      clanId: localClanId,
      rank: getProfileRankFromPercentages(localClanId, localPcts, localRank),
    };
  }
  return {
    percentages: remote.percentages,
    clanId: remote.clanId,
    rank: getProfileRankFromPercentages(remote.clanId, remote.percentages, remote.rank),
  };
}
