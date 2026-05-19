/**
 * Ranking de comentarios por publicación.
 *
 * Objetivos:
 *  1. **Mejor primero**, no más reciente. El peso principal son los votos.
 *  2. **Personalizado por viewer**: si el usuario pertenece a uno de los 8 clanes
 *     filosóficos, los comentarios escritos por gente de su mismo clan reciben un
 *     pequeño boost (mismo factor 1.25 que `paratiFeedRanking`). Los "sin clan"
 *     no aplican boost a nadie — todos los comentarios se ordenan por mérito puro.
 *  3. Recencia residual: un comentario sin votos pero muy nuevo no se hunde del
 *     todo respecto a uno antiguo también sin votos.
 *
 * Pure function: misma entrada → misma salida. No accede a estado global ni red.
 */
import { authorHasPhilosophicClan } from '../feed/paratiFeedRanking';

/** Bonificación multiplicativa por compartir clan filosófico con el lector. */
const SAME_CLAN_MULTIPLIER = 1.25;
/** Empujón aditivo extra para superar empates exactos. */
const SAME_CLAN_ADDITIVE = 0.5;
/** Vida media del bono de recencia (~6 h). Después de esto el bono cae a la mitad. */
const RECENCY_HALF_LIFE_HOURS = 6;
/** Cota máxima del bono de recencia. */
const RECENCY_MAX_BONUS = 1.5;
/** Peso de los votos en el score (log domado). */
const UPVOTE_WEIGHT = 8;

export type RankableComment = {
  id: string;
  author: { id: string; clanId?: string | null };
  upCount: number;
  createdAt: string;
};

export type CommentRankingContext = {
  /** Clan del lector (perfil Supabase). `null` o sin clan filosófico → sin boost. */
  viewerClanId: string | null | undefined;
  /** Id del lector. Su propio comentario nunca se autopenaliza ni autoboostea. */
  viewerId?: string | null;
};

function recencyBonus(ageMs: number): number {
  if (!Number.isFinite(ageMs) || ageMs < 0) return 0;
  const hours = ageMs / 3_600_000;
  const decay = Math.pow(0.5, hours / RECENCY_HALF_LIFE_HOURS);
  return RECENCY_MAX_BONUS * decay;
}

/** Score interno. Exportado para tests / debug overlay. */
export function commentScore(
  c: RankableComment,
  ctx: CommentRankingContext,
  nowMs: number = Date.now(),
): number {
  const ups = Math.max(0, c.upCount ?? 0);
  const created = Date.parse(c.createdAt);
  const ageMs = Number.isFinite(created) ? nowMs - created : 0;

  const base = Math.log2(ups + 2) * UPVOTE_WEIGHT + recencyBonus(ageMs);

  const viewerHasClan = authorHasPhilosophicClan(ctx.viewerClanId);
  const authorClan = c.author.clanId;
  const isSelfComment = !!ctx.viewerId && ctx.viewerId === c.author.id;
  const sameClanAsViewer =
    viewerHasClan &&
    !isSelfComment &&
    authorHasPhilosophicClan(authorClan) &&
    String(authorClan).trim().toLowerCase() ===
      String(ctx.viewerClanId).trim().toLowerCase();

  if (!sameClanAsViewer) return base;
  return base * SAME_CLAN_MULTIPLIER + SAME_CLAN_ADDITIVE;
}

/**
 * Devuelve los comentarios ordenados de mejor a peor para este lector.
 * No muta el array de entrada. Empates: más reciente primero.
 */
export function rankCommentsForViewer<T extends RankableComment>(
  comments: readonly T[],
  ctx: CommentRankingContext,
  nowMs: number = Date.now(),
): T[] {
  if (comments.length <= 1) return comments.slice();
  const scored = comments.map((c) => ({
    c,
    s: commentScore(c, ctx, nowMs),
    t: Date.parse(c.createdAt) || 0,
  }));
  scored.sort((a, b) => {
    if (b.s !== a.s) return b.s - a.s;
    return b.t - a.t;
  });
  return scored.map((x) => x.c);
}
