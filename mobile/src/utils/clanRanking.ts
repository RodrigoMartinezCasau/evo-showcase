import { ALL_CLAN_IDS, type ClanScoreId } from '@evoconn/services/clanClassifier';
import type { CommunityPost } from '@evoconn/types';
import { getClanCompetitionPeriod } from './clanCompetitionPeriod';

export type ClanRankInfo = { rank: number; points: number; daysLeft: number };

const REAL_CLANS = ALL_CLAN_IDS;

/**
 * Calcula puntos y ranking para los 8 clanes.
 * Puntos = publicaciones (reflexiones + frases) del mes / número de miembros del clan.
 */
export function computeAllClanRankings(
  posts: CommunityPost[],
  memberCounts: Record<string, number>,
  nowMs = Date.now(),
): Record<string, ClanRankInfo> {
  const period = getClanCompetitionPeriod(nowMs);
  const daysLeft = period.daysLeft;

  const periodPosts = period.isCompetitionActive
    ? posts.filter((p) => new Date(p.createdAt).getTime() >= period.periodStartMs)
    : [];

  const clanPostCounts: Record<string, number> = {};
  for (const clan of REAL_CLANS) {
    clanPostCounts[clan] = 0;
  }

  for (const post of periodPosts) {
    const authorClanId = post.author.clanId;
    if (authorClanId && authorClanId in clanPostCounts) {
      clanPostCounts[authorClanId]++;
    }
  }

  const clanPoints = REAL_CLANS.map((clan) => ({
    clanId: clan,
    points: clanPostCounts[clan] / Math.max(memberCounts[clan] ?? 0, 1),
  })).sort(
    (a, b) =>
      b.points - a.points ||
      REAL_CLANS.indexOf(a.clanId as ClanScoreId) -
        REAL_CLANS.indexOf(b.clanId as ClanScoreId),
  );

  const result: Record<string, ClanRankInfo> = {};
  let currentRank = 1;
  for (let i = 0; i < clanPoints.length; i++) {
    if (i > 0 && clanPoints[i].points === clanPoints[i - 1].points) {
      result[clanPoints[i].clanId] = {
        rank: result[clanPoints[i - 1].clanId].rank,
        points: clanPoints[i].points,
        daysLeft,
      };
    } else {
      result[clanPoints[i].clanId] = {
        rank: currentRank,
        points: clanPoints[i].points,
        daysLeft,
      };
    }
    currentRank++;
  }

  return result;
}
