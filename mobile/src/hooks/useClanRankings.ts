import { useEffect, useMemo, useState } from 'react';
import { ALL_CLAN_IDS } from '@evoconn/services/clanClassifier';
import type { ClanId } from '@evoconn/constants/clanColors';
import { getClanProfile } from '@evoconn/data/mockClanProfiles';
import {
  fetchClanMemberCountsByClan,
  fetchClanPostCountsByClan,
} from '@evoconn/services/classificationSync';
import {
  computeAllClanRankings,
  computeClanRankingsFromCounts,
  mergeClanMemberCountsWithSim,
} from '@evoconn/utils/clanRanking';
import { getClanCompetitionPeriod } from '@evoconn/utils/clanCompetitionPeriod';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';

export type RankedClanEntry = {
  id: ClanId;
  name: string;
  rank: number;
  points: number;
};

/**
 * Ranking global de clanes (competición mensual: posts del período / miembros).
 * Usa conteos server-side de Supabase; el feed local solo como respaldo inicial.
 */
export function useClanRankings() {
  const { posts } = useFeedStore();
  const [dbMemberCounts, setDbMemberCounts] = useState<Record<string, number>>({});
  const [dbPostCounts, setDbPostCounts] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const periodStartIso = new Date(getClanCompetitionPeriod().periodStartMs).toISOString();
        const [memberCounts, postCounts] = await Promise.all([
          fetchClanMemberCountsByClan(),
          fetchClanPostCountsByClan(periodStartIso),
        ]);
        if (cancelled) return;
        setDbMemberCounts(memberCounts);
        setDbPostCounts(postCounts);
      } catch (err) {
        console.warn('[useClanRankings] fetch failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const memberCounts = useMemo(
    () => mergeClanMemberCountsWithSim(dbMemberCounts),
    [dbMemberCounts],
  );

  const allRankings = useMemo(
    () =>
      dbPostCounts
        ? computeClanRankingsFromCounts(dbPostCounts, memberCounts)
        : computeAllClanRankings(posts, memberCounts),
    [dbPostCounts, posts, memberCounts],
  );

  const rankedClans = useMemo<RankedClanEntry[]>(() => {
    return ALL_CLAN_IDS.map((id) => ({
      id: id as ClanId,
      name: getClanProfile(id)?.name ?? id,
      rank: allRankings[id]?.rank ?? ALL_CLAN_IDS.length,
      points: allRankings[id]?.points ?? 0,
    })).sort(
      (a, b) =>
        a.rank - b.rank ||
        ALL_CLAN_IDS.indexOf(a.id) - ALL_CLAN_IDS.indexOf(b.id),
    );
  }, [allRankings]);

  const competitionPeriod = useMemo(() => getClanCompetitionPeriod(), []);

  return {
    rankedClans,
    loading,
    competitionActive: competitionPeriod.isCompetitionActive,
    daysLeft: competitionPeriod.daysLeft,
  };
}
