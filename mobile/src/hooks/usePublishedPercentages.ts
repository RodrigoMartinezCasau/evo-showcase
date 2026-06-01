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

type PublishedClassification = {
  percentages: ClanPct[];
  clanId: string | null;
};

/**
 * @param userId       id del usuario dueño del perfil (real de Supabase).
 * @param localPcts    porcentajes del store local (`getPercentages`).
 * @param localClanId  clan revelado en el store local (`getVisibleClanId`).
 */
export function usePublishedPercentages(
  userId: string | null | undefined,
  localPcts: ClanPct[],
  localClanId: string | null,
): PublishedClassification {
  const [remote, setRemote] = useState<PublishedClassification>({
    percentages: [],
    clanId: null,
  });

  // Solo necesitamos el respaldo remoto cuando el local no tiene porcentajes.
  const needsFallback = localPcts.length === 0;

  useEffect(() => {
    if (!needsFallback || !userId || !isRealUserId(userId)) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('clan_id, clan_percentages')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const pcts = Array.isArray((data as { clan_percentages?: unknown }).clan_percentages)
        ? ((data as { clan_percentages: unknown[] }).clan_percentages as ClanPct[])
        : [];
      setRemote({
        percentages: pcts,
        clanId: (data as { clan_id?: string | null }).clan_id ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [needsFallback, userId]);

  if (!needsFallback) {
    return { percentages: localPcts, clanId: localClanId };
  }
  return remote;
}
