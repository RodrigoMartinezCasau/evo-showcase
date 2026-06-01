import { ALL_CLAN_IDS, type ClanScoreId } from '@evoconn/services/clanClassifier';
import type { CommunityPost } from '@evoconn/types';
import { getClanCompetitionPeriod } from './clanCompetitionPeriod';

export type ClanRankInfo = { rank: number; points: number; daysLeft: number };

const REAL_CLANS = ALL_CLAN_IDS;

/**
 * Calcula puntos y ranking a partir de conteos YA agregados por clan.
 * Puntos = publicaciones del período del clan / número de miembros del clan.
 *
 * Esta es la vía fiable para la competición: tanto `clanPostCounts` como
 * `memberCounts` deben venir de la base de datos (globales), no del feed
 * cargado en el dispositivo, para que el ranking sea idéntico en todos.
 */
export function computeClanRankingsFromCounts(
  clanPostCounts: Record<string, number>,
  memberCounts: Record<string, number>,
  nowMs = Date.now(),
): Record<string, ClanRankInfo> {
  const period = getClanCompetitionPeriod(nowMs);
  const daysLeft = period.daysLeft;

  const clanPoints = REAL_CLANS.map((clan) => {
    const members = memberCounts[clan] ?? 0;
    const postCount = period.isCompetitionActive ? (clanPostCounts[clan] ?? 0) : 0;
    // Sin miembros no hay media posible: 0 puntos (evita el truco de dividir
    // entre 1, que inflaba clanes vacíos con publicaciones sueltas).
    const points = members > 0 ? postCount / members : 0;
    return { clanId: clan, points };
  }).sort(
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

/**
 * Variante a partir del feed local (compatibilidad). Útil como respaldo
 * inmediato mientras llega el conteo global; el ranking definitivo debe usar
 * `computeClanRankingsFromCounts` con datos de Supabase.
 * Puntos = publicaciones (reflexiones + frases) del mes / número de miembros.
 */
export function computeAllClanRankings(
  posts: CommunityPost[],
  memberCounts: Record<string, number>,
  nowMs = Date.now(),
): Record<string, ClanRankInfo> {
  const period = getClanCompetitionPeriod(nowMs);

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

  return computeClanRankingsFromCounts(clanPostCounts, memberCounts, nowMs);
}
