import type { User } from '../types';

const ACCENT_MAP: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u',
  ñ: 'n', ä: 'a', ë: 'e', ï: 'i', ö: 'o',
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áéíóúüñäëïö]/g, (ch) => ACCENT_MAP[ch] ?? ch)
    .replace(/^@/, '');
}

export type ScoredUser = User & { score: number };

export type SearchRankContext = {
  viewerId?: string | null;
  /** followerId → Set de cuentas que sigue */
  followGraph?: Record<string, Set<string>>;
};

/** Puntuación por coincidencia textual (0 = sin match). */
export function computeTextMatchScore(query: string, username: string): number {
  const q = normalize(query.trim());
  if (!q) return 0;
  const name = normalize(username);
  if (!name) return 0;

  if (name === q) return 100;
  if (name.startsWith(q)) return 82 - Math.min(12, name.length * 0.08);
  if (name.includes(q)) {
    const pos = name.indexOf(q);
    return 58 - Math.min(18, pos * 0.4);
  }
  return 0;
}

function buildMyFollowersSet(
  viewerId: string,
  followGraph: Record<string, Set<string>>,
): Set<string> {
  const followers = new Set<string>();
  for (const [followerId, following] of Object.entries(followGraph)) {
    if (followerId === viewerId) continue;
    if (following.has(viewerId)) followers.add(followerId);
  }
  return followers;
}

/** Cuentas seguidas por alguien a quien yo sigo (2º grado, según datos en grafo). */
function buildFriendOfFriendSet(
  viewerId: string,
  followGraph: Record<string, Set<string>>,
): Set<string> {
  const myFollowing = followGraph[viewerId] ?? new Set<string>();
  const foaf = new Set<string>();
  for (const friendId of myFollowing) {
    const theirFollowing = followGraph[friendId];
    if (!theirFollowing) continue;
    for (const id of theirFollowing) {
      if (id === viewerId || myFollowing.has(id)) continue;
      foaf.add(id);
    }
  }
  return foaf;
}

/** Boost por cercanía social (sigues / te siguen / amigo de amigo). */
export function computeSocialBoost(
  userId: string,
  ctx: SearchRankContext,
): number {
  const viewerId = ctx.viewerId;
  const graph = ctx.followGraph;
  if (!viewerId || !graph || userId === viewerId) return 0;

  const myFollowing = graph[viewerId] ?? new Set<string>();
  const myFollowers = buildMyFollowersSet(viewerId, graph);
  const foaf = buildFriendOfFriendSet(viewerId, graph);

  let boost = 0;
  const iFollow = myFollowing.has(userId);
  const followsMe = myFollowers.has(userId);

  if (iFollow) boost += 38;
  if (followsMe) boost += 22;
  if (iFollow && followsMe) boost += 12;
  if (!iFollow && foaf.has(userId)) boost += 20;

  return boost;
}

/** Boost por popularidad (seguidores); no se muestra en UI, solo desempata. */
export function computePopularityBoost(followersCount: number): number {
  return Math.min(28, Math.log10(Math.max(0, followersCount) + 1) * 7);
}

/**
 * Puntuación final: texto + red social + seguidores.
 * Cuando la búsqueda no coincide al 100 % con el username, pesan más
 * seguidores y conexiones (amigo / amigo de amigo).
 */
export function computeSearchUserScore(
  query: string,
  user: User,
  ctx: SearchRankContext = {},
): number {
  const text = computeTextMatchScore(query, user.username);
  if (text <= 0) return 0;
  const social = computeSocialBoost(user.id, ctx);
  const popularity = computePopularityBoost(user.followersCount ?? 0);
  return text + social + popularity;
}

/** Filtra por match textual y ordena por relevancia compuesta. */
export function rankSearchUserResults(
  query: string,
  users: readonly User[],
  ctx: SearchRankContext = {},
): ScoredUser[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const results: ScoredUser[] = [];
  for (const user of users) {
    const score = computeSearchUserScore(query, user, ctx);
    if (score <= 0) continue;
    results.push({ ...user, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Búsqueda local (simulación): mismo ranking que resultados de Supabase.
 */
export function searchUsers(
  query: string,
  users: readonly User[],
  ctx: SearchRankContext = {},
): ScoredUser[] {
  return rankSearchUserResults(query, users, ctx);
}
