/**
 * supabaseSocial.ts — Supabase persistence for all social features.
 *
 * Every function is fire-and-forget safe: on network error it logs and
 * returns a safe default so the optimistic UI is never blocked.
 *
 * DB ↔ SimPost/SimComment mappings live here so SimulationContext stays
 * focused on React state management.
 */
import { supabase } from '../../mobile/lib/supabase';
import {
  isPublishedSimPostType,
  type SimPost,
  type SimComment,
} from '../data/simulation/simulatedNetwork';
import type { Rank } from '../types';
import {
  getTopVotedWindowMs,
  type TopVotedFeedPeriod,
} from '../constants/followingFeedSort';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DbVoteRow  = { user_id: string; post_id: string; vote: 'up' | 'down' };
export type DbSaveRow  = { user_id: string; post_id: string };
export type DbFollowRow = { follower_id: string; following_id: string };

export type DbNotificationInsert = {
  recipient_id: string;
  type: string;
  from_user_id: string;
  from_username: string;
  post_id?: string;
  comment_id?: string;
  text_preview?: string;
};

export type DbNotification = DbNotificationInsert & {
  id: string;
  read: boolean;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if id looks like a real Supabase UUID (not a sim id like 'u1'). */
export function isRealUserId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ─── Posts ────────────────────────────────────────────────────────────────────

/** Default cap del feed global. Antes 500; bajado a 200 para que el cold
 * start no descargue ~1 MB de JSON por usuario en horas pico (mide ~60% menos
 * tráfico y procesamiento JS). Los posts del usuario activo se traen aparte
 * vía `fetchPostsByAuthor`, así que su perfil sigue mostrándolos todos. */
const DEFAULT_GLOBAL_FEED_LIMIT = 200;

export async function fetchAllPosts(limit: number = DEFAULT_GLOBAL_FEED_LIMIT): Promise<SimPost[]> {
  // Read from the live view so the clan we display on each card matches
  // the author's CURRENT clan, not the one frozen at publish time.
  // Falls back to the legacy `posts` table if the view doesn't exist yet
  // (e.g. SQL migration hasn't been applied) — same shape, just minus
  // the live_* columns.
  const primary = await supabase
    .from('posts_with_author_clan')
    .select('*')
    .in('type', ['reflection', 'phrase'])
    .order('created_at', { ascending: false })
    .limit(limit);

  let rows: Record<string, unknown>[] = [];
  if (primary.error) {
    console.warn('[Social] view posts_with_author_clan unavailable, falling back to posts table:', primary.error.message);
    const fallback = await supabase
      .from('posts')
      .select('*')
      .in('type', ['reflection', 'phrase'])
      .order('created_at', { ascending: false })
      .limit(limit);
    if (fallback.error) {
      console.error('[Social] fetchAllPosts:', fallback.error.message);
      return [];
    }
    rows = (fallback.data ?? []) as Record<string, unknown>[];
  } else {
    rows = (primary.data ?? []) as Record<string, unknown>[];
  }

  return rows
    .filter(
      (row) => row['is_hidden'] !== true && isPublishedSimPostType(row['type']),
    )
    .map(dbRowToSimPost);
}

type TopVotedPostIdRow = { post_id: string; upvote_count: number };

function orderSimPostsByIds(posts: SimPost[], orderedIds: string[]): SimPost[] {
  const byId = new Map(posts.map((p) => [p.id, p]));
  const ordered: SimPost[] = [];
  for (const id of orderedIds) {
    const post = byId.get(id);
    if (post) ordered.push(post);
  }
  return ordered;
}

async function hydrateSimPostVotes(posts: SimPost[]): Promise<void> {
  if (posts.length === 0) return;
  const voteRows = await fetchVotesForPosts(posts.map((p) => p.id));
  for (const row of voteRows) {
    const post = posts.find((p) => p.id === row.post_id);
    if (!post) continue;
    if (row.vote === 'up') post.upvoterIds = [...post.upvoterIds, row.user_id];
    if (row.vote === 'down') post.downvoterIds = [...post.downvoterIds, row.user_id];
  }
}

async function hydrateSimPostSaves(posts: SimPost[]): Promise<void> {
  if (posts.length === 0) return;
  const saveRows = await fetchSavesForPosts(posts.map((p) => p.id));
  for (const row of saveRows) {
    const post = posts.find((p) => p.id === row.post_id);
    if (!post) continue;
    if (!post.saverIds.includes(row.user_id)) {
      post.saverIds = [...post.saverIds, row.user_id];
    }
  }
}

/** Votos + guardados reales desde Supabase (up/down/save counts en tarjetas). */
async function hydrateSimPostEngagement(posts: SimPost[]): Promise<void> {
  await Promise.all([hydrateSimPostVotes(posts), hydrateSimPostSaves(posts)]);
}

/** Escaneo completo del periodo (fallback si la RPC no está desplegada). */
async function fetchGloballyTopVotedPostsScanFallback(options: {
  period: TopVotedFeedPeriod;
  resultLimit: number;
}): Promise<SimPost[]> {
  const { period, resultLimit } = options;
  const cutoff = new Date(Date.now() - getTopVotedWindowMs(period)).toISOString();
  const PAGE = 500;
  const rows: Record<string, unknown>[] = [];
  let from = 0;

  for (;;) {
    const primary = await supabase
      .from('posts_with_author_clan')
      .select('*')
      .in('type', ['reflection', 'phrase'])
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);

    let batch: Record<string, unknown>[] = [];
    if (primary.error) {
      const fallback = await supabase
        .from('posts')
        .select('*')
        .in('type', ['reflection', 'phrase'])
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1);
      if (fallback.error) break;
      batch = (fallback.data ?? []) as Record<string, unknown>[];
    } else {
      batch = (primary.data ?? []) as Record<string, unknown>[];
    }

    const filtered = batch.filter(
      (row) => row['is_hidden'] !== true && isPublishedSimPostType(row['type']),
    );
    rows.push(...filtered);
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  const posts = rows.map(dbRowToSimPost);
  await hydrateSimPostEngagement(posts);

  return posts
    .filter((p) => p.upvoterIds.length >= 1)
    .sort((a, b) => {
      const upDiff = b.upvoterIds.length - a.upvoterIds.length;
      if (upDiff !== 0) return upDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, resultLimit);
}

/**
 * Ranking global de posts más votados en un periodo (toda la app, no solo seguidos).
 * Usa RPC `get_top_voted_post_ids` (ver supabase_top_voted_posts.sql).
 */
export async function fetchGloballyTopVotedPosts(options: {
  period: TopVotedFeedPeriod;
  resultLimit?: number;
}): Promise<SimPost[]> {
  const { period, resultLimit = 80 } = options;
  const cutoff = new Date(Date.now() - getTopVotedWindowMs(period)).toISOString();

  const { data, error } = await supabase.rpc('get_top_voted_post_ids', {
    p_since: cutoff,
    p_result_limit: resultLimit,
  });

  if (error) {
    console.warn(
      '[Social] get_top_voted_post_ids RPC unavailable, using client scan fallback:',
      error.message,
    );
    return fetchGloballyTopVotedPostsScanFallback({ period, resultLimit });
  }

  const ranked = (data ?? []) as TopVotedPostIdRow[];
  if (ranked.length === 0) return [];

  const orderedIds = ranked.map((row) => row.post_id);
  const posts = await fetchPostsByIds(orderedIds);
  await hydrateSimPostEngagement(posts);
  const ordered = orderSimPostsByIds(posts, orderedIds);
  const windowMs = getTopVotedWindowMs(period);
  const minCreatedAt = Date.now() - windowMs;
  return ordered.filter(
    (p) => new Date(p.createdAt).getTime() >= minCreatedAt,
  );
}

/**
 * Ranking global en una ventana fija [sinceMs, untilMs) por `created_at`.
 * Usado por el widget (concurso de las 24 h anteriores al inicio del día).
 */
export async function fetchGloballyTopVotedPostsInWindow(options: {
  sinceMs: number;
  untilMs: number;
  resultLimit?: number;
}): Promise<SimPost[]> {
  const { sinceMs, untilMs, resultLimit = 80 } = options;
  const since = new Date(sinceMs).toISOString();

  const { data, error } = await supabase.rpc('get_top_voted_post_ids', {
    p_since: since,
    p_result_limit: resultLimit,
  });

  if (error) {
    console.warn(
      '[Social] get_top_voted_post_ids (window) unavailable:',
      error.message,
    );
    return [];
  }

  const ranked = (data ?? []) as TopVotedPostIdRow[];
  if (ranked.length === 0) return [];

  const orderedIds = ranked.map((row) => row.post_id);
  const posts = await fetchPostsByIds(orderedIds);
  await hydrateSimPostEngagement(posts);
  const ordered = orderSimPostsByIds(posts, orderedIds);
  return ordered.filter((p) => {
    const ts = new Date(p.createdAt).getTime();
    return ts >= sinceMs && ts < untilMs;
  });
}

/** Primera `phrase` del ranking global en la ventana [startMs, endMs). */
export async function fetchTopVotedPhraseInWindow(
  startMs: number,
  endMs: number,
): Promise<SimPost | null> {
  const posts = await fetchGloballyTopVotedPostsInWindow({
    sinceMs: startMs,
    untilMs: endMs,
    resultLimit: 80,
  });
  return posts.find((p) => p.type === 'phrase') ?? null;
}

/**
 * Frase más votada en las últimas 24 h rodantes (live, p. ej. Siguiendo → 24 HORAS).
 */
export async function fetchTopVotedPhrase24h(): Promise<SimPost | null> {
  const posts = await fetchGloballyTopVotedPosts({ period: '24h', resultLimit: 80 });
  return posts.find((p) => p.type === 'phrase') ?? null;
}

/**
 * Trae TODOS los posts de un autor concreto, sin el techo global de 500.
 *
 * Garantiza que el usuario SIEMPRE vea sus propios posts en su perfil aunque
 * caigan fuera del top global por created_at. Antes el perfil personal
 * derivaba los posts del feed global (limit 200 → ahora 500), por lo que
 * publicaciones antiguas del usuario "desaparecían" cuando la red superaba
 * ese límite — no había borrado, solo paginación insuficiente.
 */
export async function fetchPostsByAuthor(authorId: string): Promise<SimPost[]> {
  if (!isRealUserId(authorId)) return [];

  const fromView = await supabase
    .from('posts_with_author_clan')
    .select('*')
    .eq('author_id', authorId)
    .in('type', ['reflection', 'phrase'])
    .order('created_at', { ascending: false });

  let rows: Record<string, unknown>[];
  if (fromView.error) {
    console.warn(
      '[Social] view posts_with_author_clan unavailable for author fetch, falling back to posts table:',
      fromView.error.message,
    );
    const fallback = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', authorId)
      .in('type', ['reflection', 'phrase'])
      .order('created_at', { ascending: false });
    if (fallback.error) {
      console.error('[Social] fetchPostsByAuthor:', fallback.error.message);
      return [];
    }
    rows = (fallback.data ?? []) as Record<string, unknown>[];
  } else {
    rows = (fromView.data ?? []) as Record<string, unknown>[];
  }

  return rows
    .filter((row) => isPublishedSimPostType(row['type']))
    .map(dbRowToSimPost);
}

/**
 * Trae TODOS los posts de un conjunto de autores (sin el techo global de 200).
 *
 * Se usa para el feed de "Siguiendo": garantiza que las publicaciones ANTIGUAS
 * de la gente a la que sigues sigan apareciendo aunque caigan fuera del top
 * global por created_at. Antes el feed de "Siguiendo" se derivaba del feed
 * global (limit 200), por lo que los posts antiguos de seguidos "desaparecían"
 * cuando la red superaba ese límite — no había borrado, solo paginación
 * insuficiente.
 *
 * Hace una sola query por lote (`.in('author_id', ...)`) para no disparar N
 * peticiones; trocea en lotes para no pasarse del límite de longitud de URL.
 */
export async function fetchPostsByAuthors(authorIds: string[]): Promise<SimPost[]> {
  const realIds = [...new Set(authorIds.filter(isRealUserId))];
  if (realIds.length === 0) return [];

  const CHUNK = 80;
  const chunks: string[][] = [];
  for (let i = 0; i < realIds.length; i += CHUNK) {
    chunks.push(realIds.slice(i, i + CHUNK));
  }

  const byId = new Map<string, SimPost>();
  for (const ids of chunks) {
    const fromView = await supabase
      .from('posts_with_author_clan')
      .select('*')
      .in('author_id', ids)
      .in('type', ['reflection', 'phrase'])
      .order('created_at', { ascending: false });

    let rows: Record<string, unknown>[];
    if (fromView.error) {
      const fallback = await supabase
        .from('posts')
        .select('*')
        .in('author_id', ids)
        .in('type', ['reflection', 'phrase'])
        .order('created_at', { ascending: false });
      if (fallback.error) {
        console.error('[Social] fetchPostsByAuthors:', fallback.error.message);
        continue;
      }
      rows = (fallback.data ?? []) as Record<string, unknown>[];
    } else {
      rows = (fromView.data ?? []) as Record<string, unknown>[];
    }

    for (const row of rows) {
      if (row['is_hidden'] === true) continue;
      if (!isPublishedSimPostType(row['type'])) continue;
      const post = dbRowToSimPost(row);
      byId.set(post.id, post);
    }
  }

  return Array.from(byId.values());
}

/** Posts concretos por ID (p. ej. guardados que no están en el feed global). */
export async function fetchPostsByIds(postIds: string[]): Promise<SimPost[]> {
  if (postIds.length === 0) return [];
  const unique = [...new Set(postIds.filter(Boolean))];

  const fromView = await supabase
    .from('posts_with_author_clan')
    .select('*')
    .in('id', unique)
    .in('type', ['reflection', 'phrase']);

  let rows: Record<string, unknown>[];
  if (fromView.error) {
    console.warn(
      '[Social] fetchPostsByIds view fallback:',
      fromView.error.message,
    );
    const fallback = await supabase
      .from('posts')
      .select('*')
      .in('id', unique)
      .in('type', ['reflection', 'phrase']);
    if (fallback.error) {
      console.error('[Social] fetchPostsByIds:', fallback.error.message);
      return [];
    }
    rows = (fallback.data ?? []) as Record<string, unknown>[];
  } else {
    rows = (fromView.data ?? []) as Record<string, unknown>[];
  }

  return rows
    .filter((row) => isPublishedSimPostType(row['type']))
    .map(dbRowToSimPost);
}

/** IDs de posts ocultos del autor (para hidratar hiddenMap en otro dispositivo). */
export async function fetchHiddenPostIdsByAuthor(authorId: string): Promise<string[]> {
  if (!isRealUserId(authorId)) return [];
  const { data, error } = await supabase
    .from('posts')
    .select('id')
    .eq('author_id', authorId)
    .eq('is_hidden', true);
  if (error) {
    console.warn('[Social] fetchHiddenPostIdsByAuthor:', error.message);
    return [];
  }
  return (data ?? []).map((row) => String(row.id));
}

export async function insertPost(post: SimPost): Promise<void> {
  if (!isRealUserId(post.authorId)) return;
  const { error } = await supabase.from('posts').upsert(simPostToDbRow(post), { onConflict: 'id' });
  if (error) {
    // A schema error (42703 = column does not exist) means the DB migration
    // hasn't been applied — the post will exist in memory only and disappear
    // on restart. This must be treated as a hard error, not a silent warning.
    const isSchemaError = error.code === '42703' || error.message.includes('does not exist');
    if (isSchemaError) {
      console.error('[Social] insertPost SCHEMA ERROR — post NOT saved to DB. Apply the pending SQL migration.', error.message);
    } else {
      console.error('[Social] insertPost:', error.message);
    }
  }
}

export async function removePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) console.error('[Social] removePost:', error.message);
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function fetchCommentsForPost(postId: string): Promise<SimComment[]> {
  // Read from the live view so commenter colours match their CURRENT
  // clan in profiles, not the one they had when they wrote the comment.
  // Falls back to the legacy `comments` table if the view doesn't exist.
  const primary = await supabase
    .from('comments_with_author_clan')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  let rows: Record<string, unknown>[] = [];
  if (primary.error) {
    console.warn('[Social] view comments_with_author_clan unavailable, falling back to comments table:', primary.error.message);
    const fallback = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (fallback.error) {
      console.error('[Social] fetchComments:', fallback.error.message);
      return [];
    }
    rows = (fallback.data ?? []) as Record<string, unknown>[];
  } else {
    rows = (primary.data ?? []) as Record<string, unknown>[];
  }
  return applyCommentVoteCounts(rows.map(dbRowToSimComment));
}

/**
 * Bulk fetch comments for many posts in a SINGLE request.
 *
 * Antes hidratábamos haciendo `Promise.all(postIds.map(fetchCommentsForPost))`,
 * lo que generaba ~80 XHR en paralelo en el primer arranque de la app. En
 * Samsung gama media (A21/A36/A55) eso colapsaba el JS thread cuando
 * todas las respuestas llegaban juntas y Fabric montaba 80 celdas en un
 * frame — provocando `IllegalStateException: addViewAt`.
 *
 * Esta versión hace UNA sola consulta usando `.in('post_id', postIds)` y
 * agrupa los resultados por post en JS, eliminando la tormenta de XHR.
 */
export async function fetchCommentsForPosts(
  postIds: string[],
): Promise<Record<string, SimComment[]>> {
  if (postIds.length === 0) return {};

  const fromView = await supabase
    .from('comments_with_author_clan')
    .select('*')
    .in('post_id', postIds)
    .order('created_at', { ascending: true });

  let rows: Record<string, unknown>[];
  if (fromView.error) {
    console.warn(
      '[Social] view comments_with_author_clan unavailable, falling back to comments table:',
      fromView.error.message,
    );
    const fallback = await supabase
      .from('comments')
      .select('*')
      .in('post_id', postIds)
      .order('created_at', { ascending: true });
    if (fallback.error) {
      console.error('[Social] fetchCommentsForPosts:', fallback.error.message);
      return {};
    }
    rows = (fallback.data ?? []) as Record<string, unknown>[];
  } else {
    rows = (fromView.data ?? []) as Record<string, unknown>[];
  }

  const allComments = rows.map(dbRowToSimComment);
  const withCounts = await applyCommentVoteCounts(allComments);

  const byPost: Record<string, SimComment[]> = {};
  for (const comment of withCounts) {
    const arr = byPost[comment.postId];
    if (arr) arr.push(comment);
    else byPost[comment.postId] = [comment];
  }
  return byPost;
}

export async function insertComment(comment: SimComment): Promise<void> {
  if (!isRealUserId(comment.authorId)) return;
  const { error } = await supabase.from('comments').upsert(simCommentToDbRow(comment), { onConflict: 'id' });
  if (error) {
    console.error('[Social] insertComment:', error.message);
    throw new Error(error.message);
  }
}

// ─── Comment votes ──────────────────────────────────────────────────────────

/** Cuenta de votos por comentario (agregado de todos los usuarios). */
export async function fetchCommentVoteCounts(
  commentIds: string[],
): Promise<Record<string, number>> {
  if (commentIds.length === 0) return {};
  const { data, error } = await supabase
    .from('comment_votes')
    .select('comment_id')
    .in('comment_id', commentIds);
  if (error) {
    // La tabla puede no existir aún (migración sin aplicar): degradar a 0.
    console.warn('[Social] fetchCommentVoteCounts:', error.message);
    return {};
  }
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { comment_id: string }).comment_id;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** Lista de comment_ids que el usuario ha votado (para reconstruir "mi voto"). */
export async function fetchMyCommentVotes(userId: string): Promise<string[]> {
  if (!isRealUserId(userId)) return [];
  const { data, error } = await supabase
    .from('comment_votes')
    .select('comment_id')
    .eq('user_id', userId);
  if (error) {
    console.warn('[Social] fetchMyCommentVotes:', error.message);
    return [];
  }
  return (data ?? []).map((r) => (r as { comment_id: string }).comment_id);
}

export async function upsertCommentVote(userId: string, commentId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase
    .from('comment_votes')
    .upsert({ user_id: userId, comment_id: commentId }, { onConflict: 'user_id,comment_id' });
  if (error) console.error('[Social] upsertCommentVote:', error.message);
}

export async function deleteCommentVote(userId: string, commentId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase
    .from('comment_votes')
    .delete()
    .eq('user_id', userId)
    .eq('comment_id', commentId);
  if (error) console.error('[Social] deleteCommentVote:', error.message);
}

/** Aplica las cuentas de votos (de comment_votes) al `upCount` de cada comentario. */
async function applyCommentVoteCounts(comments: SimComment[]): Promise<SimComment[]> {
  if (comments.length === 0) return comments;
  const counts = await fetchCommentVoteCounts(comments.map((c) => c.id));
  return comments.map((c) => ({ ...c, upCount: counts[c.id] ?? 0 }));
}

// ─── Post views (visualizaciones) ────────────────────────────────────────────

/** Recuento de visualizaciones únicas por post (agregado de todos los usuarios). */
export async function fetchPostViewCounts(
  postIds: string[],
): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'get_post_view_counts',
    { p_post_ids: postIds },
  );
  if (!rpcError && Array.isArray(rpcData)) {
    const counts: Record<string, number> = {};
    for (const row of rpcData as { post_id: string; view_count: number }[]) {
      counts[row.post_id] = Number(row.view_count) || 0;
    }
    return counts;
  }
  if (rpcError && __DEV__) {
    console.warn('[Social] get_post_view_counts RPC unavailable, paginating post_views:', rpcError.message);
  }

  // Fallback: paginar filas (mismo problema que votes — límite 1000 filas).
  const POST_CHUNK = 40;
  const PAGE = 1000;
  const counts: Record<string, number> = {};

  for (let i = 0; i < postIds.length; i += POST_CHUNK) {
    const chunk = postIds.slice(i, i + POST_CHUNK);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from('post_views')
        .select('post_id')
        .in('post_id', chunk)
        .range(from, from + PAGE - 1);
      if (error) {
        console.warn('[Social] fetchPostViewCounts:', error.message);
        return counts;
      }
      const rows = data ?? [];
      for (const row of rows) {
        const id = (row as { post_id: string }).post_id;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      if (rows.length < PAGE) break;
      from += PAGE;
    }
  }
  return counts;
}

/** Registra (idempotente) que `userId` ha visto `postId`. Solo usuarios reales. */
export async function recordPostView(userId: string, postId: string): Promise<void> {
  if (!isRealUserId(userId) || !postId) return;
  const { error } = await supabase
    .from('post_views')
    .upsert({ user_id: userId, post_id: postId }, { onConflict: 'user_id,post_id' });
  // Silencioso: una vista perdida no debe romper la navegación.
  if (error) console.warn('[Social] recordPostView:', error.message);
}

// ─── Votes ────────────────────────────────────────────────────────────────────

/** Fetches all votes for a list of post IDs (to reconstruct upvoterIds/downvoterIds). */
export async function fetchVotesForPosts(postIds: string[]): Promise<DbVoteRow[]> {
  if (postIds.length === 0) return [];

  // IMPORTANTE: una sola query `.in(...)` choca con el límite por defecto de
  // Supabase (1000 filas). Con la red ya grande, el total de votos del feed
  // supera 1000 y los que caen fuera del corte se perdían → publicaciones (a
  // menudo las propias del perfil) mostraban 0 votos aunque sí tuvieran. Para
  // evitarlo: (1) troceamos los postIds y (2) paginamos cada lote con range()
  // hasta agotar las filas.
  const POST_CHUNK = 150;
  const PAGE = 1000;
  const all: DbVoteRow[] = [];

  for (let i = 0; i < postIds.length; i += POST_CHUNK) {
    const chunk = postIds.slice(i, i + POST_CHUNK);
    let from = 0;
    // Bucle de paginación: pedimos páginas de 1000 hasta recibir menos de 1000.
    for (;;) {
      const { data, error } = await supabase
        .from('votes')
        .select('user_id, post_id, vote')
        .in('post_id', chunk)
        .range(from, from + PAGE - 1);
      if (error) {
        console.error('[Social] fetchVotes:', error.message);
        break;
      }
      const rows = (data ?? []) as DbVoteRow[];
      all.push(...rows);
      if (rows.length < PAGE) break;
      from += PAGE;
    }
  }

  return all;
}

/** Fetches my votes only (for restoring my voteMap). */
export async function fetchMyVotes(userId: string): Promise<Record<string, 'up' | 'down'>> {
  if (!isRealUserId(userId)) return {};
  const { data, error } = await supabase
    .from('votes')
    .select('post_id, vote')
    .eq('user_id', userId);
  if (error) { console.error('[Social] fetchMyVotes:', error.message); return {}; }
  const map: Record<string, 'up' | 'down'> = {};
  for (const row of data ?? []) map[row.post_id] = row.vote;
  return map;
}

export async function upsertVote(userId: string, postId: string, vote: 'up' | 'down'): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase
    .from('votes')
    .upsert({ user_id: userId, post_id: postId, vote }, { onConflict: 'user_id,post_id' });
  if (error) console.error('[Social] upsertVote:', error.message);
}

export async function deleteVote(userId: string, postId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.from('votes').delete()
    .eq('user_id', userId).eq('post_id', postId);
  if (error) console.error('[Social] deleteVote:', error.message);
}

// ─── Saves ────────────────────────────────────────────────────────────────────

export async function fetchMySaves(userId: string): Promise<string[]> {
  if (!isRealUserId(userId)) return [];
  const { data, error } = await supabase
    .from('saves')
    .select('post_id')
    .eq('user_id', userId);
  if (error) { console.error('[Social] fetchMySaves:', error.message); return []; }
  return (data ?? []).map(r => r.post_id);
}

/** Fetches all saves for a list of post IDs (to reconstruct saverIds / save counts). */
export async function fetchSavesForPosts(postIds: string[]): Promise<DbSaveRow[]> {
  if (postIds.length === 0) return [];

  const POST_CHUNK = 150;
  const PAGE = 1000;
  const all: DbSaveRow[] = [];

  for (let i = 0; i < postIds.length; i += POST_CHUNK) {
    const chunk = postIds.slice(i, i + POST_CHUNK);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from('saves')
        .select('user_id, post_id')
        .in('post_id', chunk)
        .range(from, from + PAGE - 1);
      if (error) {
        console.error('[Social] fetchSavesForPosts:', error.message);
        break;
      }
      const rows = (data ?? []) as DbSaveRow[];
      all.push(...rows);
      if (rows.length < PAGE) break;
      from += PAGE;
    }
  }

  return all;
}

// ─── Engagement counts (agregado) ─────────────────────────────────────────────

export type EngagementCounts = { up: number; down: number; save: number };

/**
 * Conteos agregados (votos arriba/abajo y guardados) de una lista de posts,
 * vía RPC `get_post_engagement_counts` (COUNT en Postgres). Sustituye a
 * descargar miles de filas individuales de `votes`/`saves` solo para contar.
 *
 * Devuelve `null` si el RPC no está desplegado o falla → el llamador cae a
 * traer las filas individuales (`fetchVotesForPosts` / `fetchSavesForPosts`),
 * preservando el comportamiento anterior sin romper nada.
 */
export async function fetchEngagementCounts(
  postIds: string[],
): Promise<Record<string, EngagementCounts> | null> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase.rpc('get_post_engagement_counts', {
    p_post_ids: postIds,
  });
  if (error) {
    console.warn(
      '[Social] get_post_engagement_counts RPC no disponible, usando filas individuales:',
      error.message,
    );
    return null;
  }
  const out: Record<string, EngagementCounts> = {};
  for (const row of (data ?? []) as {
    post_id: string;
    up_count: number;
    down_count: number;
    save_count: number;
  }[]) {
    out[String(row.post_id)] = {
      up: Number(row.up_count) || 0,
      down: Number(row.down_count) || 0,
      save: Number(row.save_count) || 0,
    };
  }
  return out;
}

export async function insertSave(userId: string, postId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.from('saves').upsert({ user_id: userId, post_id: postId }, { onConflict: 'user_id,post_id' });
  if (error) console.error('[Social] insertSave:', error.message);
}

export async function deleteSave(userId: string, postId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.from('saves').delete()
    .eq('user_id', userId).eq('post_id', postId);
  if (error) console.error('[Social] deleteSave:', error.message);
}

// ─── Reposts (republicar) ───────────────────────────────────────────────────────

export type DbRepostRow = { user_id: string; post_id: string; created_at: string };

/** Post IDs republicados por `userId` (los míos). */
export async function fetchMyReposts(userId: string): Promise<string[]> {
  if (!isRealUserId(userId)) return [];
  const { data, error } = await supabase
    .from('reposts')
    .select('post_id')
    .eq('user_id', userId);
  if (error) { console.error('[Social] fetchMyReposts:', error.message); return []; }
  return (data ?? []).map(r => r.post_id);
}

/**
 * Republicaciones hechas por un conjunto de usuarios (los que sigue el lector).
 * Devuelve user_id + post_id + created_at para poder elegir al PRIMER republicador
 * (dedup) y mostrar la etiqueta "Republicado por @usuario".
 */
export async function fetchRepostsByUsers(userIds: string[]): Promise<DbRepostRow[]> {
  const ids = userIds.filter(isRealUserId);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('reposts')
    .select('user_id, post_id, created_at')
    .in('user_id', ids);
  if (error) { console.error('[Social] fetchRepostsByUsers:', error.message); return []; }
  return (data ?? []) as DbRepostRow[];
}

export async function insertRepost(userId: string, postId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.from('reposts').upsert(
    { user_id: userId, post_id: postId },
    { onConflict: 'user_id,post_id' },
  );
  if (error) console.error('[Social] insertRepost:', error.message);
}

export async function deleteRepost(userId: string, postId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.from('reposts').delete()
    .eq('user_id', userId).eq('post_id', postId);
  if (error) console.error('[Social] deleteRepost:', error.message);
}

// ─── Follows ──────────────────────────────────────────────────────────────────

const FOLLOWS_PAGE_SIZE = 1000;

async function fetchFollowColumnIds(
  column: 'follower_id' | 'following_id',
  filterColumn: 'follower_id' | 'following_id',
  filterValue: string,
): Promise<string[]> {
  const valueColumn = column;
  const out: string[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('follows')
      .select(valueColumn)
      .eq(filterColumn, filterValue)
      .order(valueColumn, { ascending: true })
      .range(from, from + FOLLOWS_PAGE_SIZE - 1);

    if (error) {
      console.error('[Social] fetchFollowColumnIds:', error.message);
      break;
    }

    const page = (data ?? []).map((row) => String(row[valueColumn]));
    out.push(...page);
    if (page.length < FOLLOWS_PAGE_SIZE) break;
    from += FOLLOWS_PAGE_SIZE;
  }

  return out;
}

/** Returns the list of user IDs that `userId` follows. */
export async function fetchFollowing(userId: string): Promise<string[]> {
  if (!isRealUserId(userId)) return [];
  return fetchFollowColumnIds('following_id', 'follower_id', userId);
}

/** Returns the list of user IDs that follow `userId`. */
export async function fetchFollowers(userId: string): Promise<string[]> {
  if (!isRealUserId(userId)) return [];
  return fetchFollowColumnIds('follower_id', 'following_id', userId);
}

export async function insertFollow(followerId: string, followingId: string): Promise<void> {
  if (!isRealUserId(followerId) || !isRealUserId(followingId)) return;
  const { error } = await supabase.from('follows')
    .upsert({ follower_id: followerId, following_id: followingId }, { onConflict: 'follower_id,following_id' });
  if (error) console.error('[Social] insertFollow:', error.message);
}

export async function deleteFollow(followerId: string, followingId: string): Promise<void> {
  if (!isRealUserId(followerId) || !isRealUserId(followingId)) return;
  const { error } = await supabase.from('follows').delete()
    .eq('follower_id', followerId).eq('following_id', followingId);
  if (error) console.error('[Social] deleteFollow:', error.message);
}

// ─── Follow requests (private accounts) ───────────────────────────────────────

/** Supabase PostgREST antes de migrar: tabla aún no expuesta → evita LogBox con console.error. */
function isFollowRequestsTableMissing(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('follow_requests') &&
    (m.includes('schema cache') || m.includes('does not exist') || m.includes('not find'))
  );
}

export async function fetchProfileIsPrivate(userId: string): Promise<boolean> {
  if (!isRealUserId(userId)) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('is_private')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('[Social] fetchProfileIsPrivate:', error.message);
    return false;
  }
  return !!(data as { is_private?: boolean } | null)?.is_private;
}

export async function fetchOutgoingFollowRequestTargets(requesterId: string): Promise<string[]> {
  if (!isRealUserId(requesterId)) return [];
  const { data, error } = await supabase
    .from('follow_requests')
    .select('target_id')
    .eq('requester_id', requesterId);
  if (error) {
    if (isFollowRequestsTableMissing(error.message)) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          '[Social] Tabla follow_requests no creada en Supabase. Ejecuta supabase_private_accounts.sql',
        );
      }
    } else {
      console.error('[Social] fetchOutgoingFollowRequestTargets:', error.message);
    }
    return [];
  }
  return (data ?? []).map((r: { target_id: string }) => r.target_id);
}

/** Creates a pending request; DB trigger inserts follow_request notification for target. */
export async function insertFollowRequest(requesterId: string, targetId: string): Promise<boolean> {
  if (!isRealUserId(requesterId) || !isRealUserId(targetId)) return false;
  const { error } = await supabase.from('follow_requests').insert({
    requester_id: requesterId,
    target_id: targetId,
  });
  if (error) {
    if (isFollowRequestsTableMissing(error.message)) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[Social] insertFollowRequest: falta migración follow_requests');
      }
    } else {
      console.error('[Social] insertFollowRequest:', error.message);
    }
    return false;
  }
  return true;
}

export type IncomingFollowRequest = {
  requesterId: string;
  username: string;
  clanId: string | null;
  avatarUri?: string | null;
  createdAt: string;
};

/** Solicitudes pendientes recibidas (fuente de verdad: tabla follow_requests). */
export async function fetchIncomingFollowRequests(
  targetId: string,
): Promise<IncomingFollowRequest[]> {
  if (!isRealUserId(targetId)) return [];
  const { data, error } = await supabase
    .from('follow_requests')
    .select('requester_id, created_at')
    .eq('target_id', targetId)
    .order('created_at', { ascending: false });
  if (error) {
    if (isFollowRequestsTableMissing(error.message)) return [];
    console.error('[Social] fetchIncomingFollowRequests:', error.message);
    return [];
  }
  const rows = (data ?? []) as { requester_id: string; created_at: string }[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.requester_id);
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, username, clan_id, avatar_url')
    .in('id', ids);
  if (profileErr) {
    console.error('[Social] fetchIncomingFollowRequests profiles:', profileErr.message);
  }
  const profileMap = new Map<string, { username: string | null; clan_id: string | null; avatar_url: string | null }>();
  for (const p of (profiles ?? []) as Record<string, unknown>[]) {
    profileMap.set(p.id as string, {
      username: (p.username as string | null) ?? null,
      clan_id: (p.clan_id as string | null) ?? null,
      avatar_url: (p.avatar_url as string | null) ?? null,
    });
  }

  return rows.map((r) => {
    const prof = profileMap.get(r.requester_id);
    const raw = prof?.username?.trim();
    const username = raw ? `@${raw.toUpperCase()}` : '@?';
    return {
      requesterId: r.requester_id,
      username,
      clanId: prof?.clan_id ?? null,
      avatarUri: prof?.avatar_url ?? null,
      createdAt: r.created_at,
    };
  });
}

export async function deleteFollowRequest(requesterId: string, targetId: string): Promise<void> {
  if (!isRealUserId(requesterId) || !isRealUserId(targetId)) return;
  const { error } = await supabase
    .from('follow_requests')
    .delete()
    .eq('requester_id', requesterId)
    .eq('target_id', targetId);
  if (error && !isFollowRequestsTableMissing(error.message)) {
    console.error('[Social] deleteFollowRequest:', error.message);
  }
}

/** `true` solo si había una solicitud pendiente y se aceptó. */
export async function acceptFollowRequestRpc(requesterId: string): Promise<boolean> {
  if (!isRealUserId(requesterId)) return false;
  const { data, error } = await supabase.rpc('accept_follow_request', {
    p_requester: requesterId,
  });
  if (error) {
    console.error('[Social] acceptFollowRequestRpc:', error.message);
    return false;
  }
  return data === true;
}

/** `true` si se eliminó una solicitud pendiente. */
export async function rejectFollowRequestRpc(requesterId: string): Promise<boolean> {
  if (!isRealUserId(requesterId)) return false;
  const { data, error } = await supabase.rpc('reject_follow_request', {
    p_requester: requesterId,
  });
  if (error) {
    console.error('[Social] rejectFollowRequestRpc:', error.message);
    return false;
  }
  return data === true;
}

export async function setProfilePrivate(userId: string, isPrivate: boolean): Promise<boolean> {
  if (!isRealUserId(userId)) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ is_private: isPrivate })
    .eq('id', userId);
  if (error) {
    console.error('[Social] setProfilePrivate:', error.message);
    return false;
  }
  return true;
}

// ─── Posts by user ────────────────────────────────────────────────────────────

/** Fetch all posts from a specific author (for their profile page). */
export async function fetchPostsByUser(userId: string): Promise<SimPost[]> {
  // Use the live view (see fetchAllPosts) so the cards repaint when the
  // author changes clan. Falls back to the legacy table if needed.
  const primary = await supabase
    .from('posts_with_author_clan')
    .select('*')
    .eq('author_id', userId)
    .in('type', ['reflection', 'phrase'])
    .order('created_at', { ascending: false })
    .limit(50);

  let rows: Record<string, unknown>[] = [];
  if (primary.error) {
    console.warn('[Social] view posts_with_author_clan unavailable, falling back to posts table:', primary.error.message);
    const fallback = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', userId)
      .in('type', ['reflection', 'phrase'])
      .order('created_at', { ascending: false })
      .limit(50);
    if (fallback.error) {
      console.error('[Social] fetchPostsByUser:', fallback.error.message);
      return [];
    }
    rows = (fallback.data ?? []) as Record<string, unknown>[];
  } else {
    rows = (primary.data ?? []) as Record<string, unknown>[];
  }

  const posts = rows
    .filter((row) => isPublishedSimPostType(row['type']))
    .map(dbRowToSimPost);
  if (posts.length === 0) return posts;
  // Hydrate vote + save counts (muta los posts en sitio).
  await hydrateSimPostEngagement(posts);
  return posts;
}

// ─── Follow counts ────────────────────────────────────────────────────────────

/** Returns { followersCount, followingCount } for any user (conteo exacto en servidor). */
export async function fetchFollowCounts(
  userId: string,
): Promise<{ followersCount: number; followingCount: number }> {
  if (!isRealUserId(userId)) return { followersCount: 0, followingCount: 0 };

  const { data, error } = await supabase.rpc('get_profile_follow_counts', {
    p_user_id: userId,
  });

  if (!error && data && typeof data === 'object') {
    const row = data as { followers_count?: number; following_count?: number };
    return {
      followersCount: Number(row.followers_count) || 0,
      followingCount: Number(row.following_count) || 0,
    };
  }

  if (error) {
    console.warn('[Social] get_profile_follow_counts RPC fallback:', error.message);
  }

  const [followersRes, followingRes] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return {
    followersCount: followersRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
  };
}

/** Follower totals for many users (e.g. search result lists) in one query. */
export async function fetchFollowersCountsBatch(
  userIds: string[],
): Promise<Record<string, number>> {
  const ids = [...new Set(userIds.filter(isRealUserId))];
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .in('following_id', ids);

  if (error) {
    console.error('[Social] fetchFollowersCountsBatch:', error.message);
    return Object.fromEntries(ids.map((id) => [id, 0]));
  }

  const counts = Object.fromEntries(ids.map((id) => [id, 0])) as Record<string, number>;
  for (const row of data ?? []) {
    const targetId = row.following_id as string;
    counts[targetId] = (counts[targetId] ?? 0) + 1;
  }
  return counts;
}

/**
 * Conteo EXACTO de seguidores por usuario (una query `head:true` con
 * `count:'exact'` por id, en paralelo). A diferencia de fetchFollowersCountsBatch
 * —que trae filas y cuenta en cliente, sujeto al tope de filas del servidor— este
 * devuelve el total real aunque un usuario tenga cientos de seguidores. Úsalo para
 * listas pequeñas (p. ej. las cuentas destacadas), no para muchos ids a la vez.
 */
export async function fetchFollowersCountsExact(
  userIds: string[],
): Promise<Record<string, number>> {
  const ids = [...new Set(userIds.filter(isRealUserId))];
  if (ids.length === 0) return {};
  const entries = await Promise.all(
    ids.map(async (id) => {
      const { count, error } = await supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', id);
      if (error) {
        console.error('[Social] fetchFollowersCountsExact:', error.message);
        return [id, 0] as const;
      }
      return [id, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// ─── Profiles batch fetch ─────────────────────────────────────────────────────

export type BasicProfile = {
  id: string;
  username: string;
  clanId: string | null;
  rank: string;
  avatarUri?: string | null;
};

/** Fetch basic profile info for a list of user IDs (for followers/following display). */
export async function fetchProfilesBatch(userIds: string[]): Promise<BasicProfile[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, clan_id, rank, avatar_url')
    .in('id', userIds);
  if (error) { console.error('[Social] fetchProfilesBatch:', error.message); return []; }
  return (data ?? []).map(r => ({
    id: r.id,
    username: r.username ? `@${r.username.toUpperCase()}` : `@${r.id.slice(0, 8)}`,
    clanId: r.clan_id ?? null,
    rank: r.rank ?? 'aprendiz',
    avatarUri: (r as { avatar_url?: string | null }).avatar_url ?? null,
  }));
}

export type TopUser = BasicProfile & { followersCount: number };

/**
 * Dada una lista de ids ya ordenada (top N) y sus conteos de seguidores,
 * trae los perfiles en una sola consulta y construye los `TopUser`.
 * Compartido por la ruta RPC y el escaneo en cliente.
 */
async function fetchTopUsersProfiles(
  topIds: string[],
  counts: Record<string, number>,
): Promise<TopUser[]> {
  if (topIds.length === 0) return [];
  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('id, username, clan_id, rank, avatar_url')
    .in('id', topIds);
  if (pErr) {
    console.error('[Social] fetchTopUsersByFollowers profiles:', pErr.message);
    return [];
  }

  const byId = new Map(
    (profs ?? []).map((r) => [
      r.id as string,
      {
        id: r.id as string,
        username: (r.username as string) ?? (r.id as string).slice(0, 8),
        clanId: (r.clan_id as string | null) ?? null,
        rank: (r.rank as string) ?? 'aprendiz',
        avatarUri: (r as { avatar_url?: string | null }).avatar_url ?? null,
      } as BasicProfile,
    ]),
  );

  return topIds
    .map((id) => {
      const p = byId.get(id);
      return p ? { ...p, followersCount: counts[id] ?? 0 } : null;
    })
    .filter((u): u is TopUser => u != null);
}

/**
 * Ruta rápida: RPC `get_top_followed_users` que agrega `follows` en Postgres
 * (GROUP BY) y devuelve solo los top N con su conteo real. Una sola consulta
 * en vez de descargar ~2000 filas + N conteos exactos.
 *
 * Devuelve `null` si el RPC no está desplegado/falla → el llamador cae al
 * escaneo en cliente (comportamiento anterior, sin romper nada).
 */
async function fetchTopUsersByFollowersViaRpc(limit: number): Promise<TopUser[] | null> {
  const { data, error } = await supabase.rpc('get_top_followed_users', {
    p_result_limit: limit,
  });
  if (error) {
    console.warn(
      '[Social] get_top_followed_users RPC no disponible, usando escaneo en cliente:',
      error.message,
    );
    return null;
  }
  const rows = (data ?? []) as { following_id: string; followers_count: number }[];
  const counts: Record<string, number> = {};
  const topIds: string[] = [];
  for (const row of rows) {
    const id = String(row.following_id);
    if (!isRealUserId(id)) continue;
    counts[id] = Number(row.followers_count) || 0;
    topIds.push(id);
  }
  return fetchTopUsersProfiles(topIds, counts);
}

/**
 * Fallback en cliente: muestrea `follows`, agrega por `following_id`, hace un
 * conteo exacto por candidato y trae sus perfiles. Se usa solo si el RPC
 * `get_top_followed_users` no está disponible.
 */
async function fetchTopUsersByFollowersClientScan(limit: number): Promise<TopUser[]> {
  // 1) Descubrimiento de candidatos: una muestra de `follows` (el servidor
  //    limita el nº de filas, así que esto es solo para saber QUIÉN aparece
  //    mucho, no para el número final).
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .limit(2000);
  if (error) {
    console.error('[Social] fetchTopUsersByFollowers:', error.message);
    return [];
  }

  const sample: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { following_id: string }).following_id;
    if (!isRealUserId(id)) continue;
    sample[id] = (sample[id] ?? 0) + 1;
  }

  const candidateIds = Object.entries(sample)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(limit * 3, 30))
    .map(([id]) => id);
  if (candidateIds.length === 0) return [];

  // 2) Conteo EXACTO por candidato (no sujeto al tope de filas) → número real.
  const exact = await fetchFollowersCountsExact(candidateIds);

  // 3) Ranking final por conteo exacto.
  const topIds = candidateIds
    .sort((a, b) => (exact[b] ?? 0) - (exact[a] ?? 0))
    .slice(0, limit);

  return fetchTopUsersProfiles(topIds, exact);
}

/**
 * Cuentas con más seguidores de la app (para el feed de "cuentas destacadas"
 * de la pantalla de búsqueda). Prefiere el RPC agregado en Postgres
 * (`get_top_followed_users`) y, si no está disponible, cae al escaneo en
 * cliente — mismo resultado, comportamiento anterior preservado.
 */
export async function fetchTopUsersByFollowers(limit = 10): Promise<TopUser[]> {
  const viaRpc = await fetchTopUsersByFollowersViaRpc(limit);
  if (viaRpc) return viaRpc;
  return fetchTopUsersByFollowersClientScan(limit);
}

/** Search users by username prefix/substring in Supabase profiles. */
export async function searchSupabaseUsers(query: string): Promise<BasicProfile[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, clan_id, rank, avatar_url')
    .ilike('username', `%${query.trim()}%`)
    .limit(30);
  if (error) { console.error('[Social] searchSupabaseUsers:', error.message); return []; }
  return (data ?? []).map(r => ({
    id: r.id,
    username: r.username ?? r.id.slice(0, 8),
    clanId: r.clan_id ?? null,
    rank: r.rank ?? 'aprendiz',
    avatarUri: (r as { avatar_url?: string | null }).avatar_url ?? null,
  }));
}

// ─── Profile stats ────────────────────────────────────────────────────────────

/** Increment total_reflections or total_quotes in the profiles table. */
export async function incrementProfileStat(
  userId: string,
  field: 'total_reflections' | 'total_quotes',
): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.rpc('increment_profile_stat', {
    user_id: userId,
    stat_field: field,
  });
  if (error) console.error('[Social] incrementProfileStat:', error.message);
}

// ─── Notifications ────────────────────────────────────────────────────────────

/** Máximo de filas en el feed de notificaciones (la campana puede mostrar +99 vía conteo exacto). */
export const NOTIFICATIONS_FEED_FETCH_LIMIT = 99;

export async function fetchMyNotifications(userId: string): Promise<DbNotification[]> {
  if (!isRealUserId(userId)) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_FEED_FETCH_LIMIT);
  if (error) { console.error('[Social] fetchNotifications:', error.message); return []; }
  return (data ?? []) as DbNotification[];
}

/** Total real de notificaciones sin leer (no limitado por el fetch del feed). */
export async function fetchUnreadNotificationsCount(userId: string): Promise<number> {
  if (!isRealUserId(userId)) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('read', false);
  if (error) {
    console.error('[Social] fetchUnreadNotificationsCount:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function insertNotification(n: DbNotificationInsert): Promise<boolean> {
  if (!isRealUserId(n.recipient_id)) return false;
  const { error } = await supabase.from('notifications').insert(n);
  if (!error) return true;
  // Si el comentario aún no está visible para la FK, guardar la notificación sin comment_id.
  if (n.comment_id) {
    const { comment_id: _omit, ...withoutComment } = n;
    const { error: retryErr } = await supabase.from('notifications').insert(withoutComment);
    if (!retryErr) return true;
    console.error('[Social] insertNotification:', retryErr.message);
    return false;
  }
  console.error('[Social] insertNotification:', error.message);
  return false;
}

export async function markNotificationsRead(userId: string): Promise<void> {
  if (!isRealUserId(userId)) return;
  const { error } = await supabase.from('notifications')
    .update({ read: true })
    .eq('recipient_id', userId)
    .eq('read', false);
  if (error) console.error('[Social] markNotificationsRead:', error.message);
}

// ─── Hide post ────────────────────────────────────────────────────────────────

/** Toggle is_hidden on a post. Returns the new hidden state. */
export async function setPostHidden(postId: string, isHidden: boolean): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ is_hidden: isHidden })
    .eq('id', postId);
  if (error) console.error('[Social] setPostHidden:', error.message);
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });
  if (error) console.error('[Social] blockUser:', error.message);
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) console.error('[Social] unblockUser:', error.message);
}

export interface BlockedProfile {
  blockedId: string;
  username: string;
  clanId: string | null;
}

export async function fetchBlockedUserIds(blockerId: string): Promise<string[]> {
  const { data: blockRows, error: blockErr } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', blockerId);
  if (blockErr) {
    console.error('[Social] fetchBlockedUserIds:', blockErr.message);
    return [];
  }
  return (blockRows ?? []).map((r: Record<string, unknown>) => r.blocked_id as string);
}

export async function fetchBlockedUsers(blockerId: string): Promise<BlockedProfile[]> {
  const ids = await fetchBlockedUserIds(blockerId);
  if (ids.length === 0) return [];

  // Step 2: fetch profiles for those IDs
  const { data: profileRows, error: profileErr } = await supabase
    .from('profiles')
    .select('id, username, clan_id')
    .in('id', ids);
  if (profileErr) { console.error('[Social] fetchBlockedUsers profiles:', profileErr.message); }

  const profileMap: Record<string, { username: string | null; clan_id: string | null }> = {};
  for (const p of (profileRows ?? []) as Record<string, unknown>[]) {
    profileMap[p.id as string] = { username: p.username as string | null, clan_id: p.clan_id as string | null };
  }

  return ids.map((blockedId) => {
    const p = profileMap[blockedId];
    return {
      blockedId,
      username: p?.username ? '@' + p.username.toUpperCase() : '@' + blockedId.slice(0, 8),
      clanId: p?.clan_id ?? null,
    };
  });
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface ReportInsert {
  reporterId: string;
  targetType: 'post' | 'user' | 'comment' | 'bug';
  targetId?: string;
  reason: string;
}

export async function insertReport(r: ReportInsert): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: r.reporterId,
    target_type: r.targetType,
    target_id: r.targetId ?? null,
    reason: r.reason,
  });
  if (error) console.error('[Social] insertReport:', error.message);
}

export interface Report {
  id: string;
  targetType: string;
  targetId: string | null;
  reason: string;
  createdAt: string;
}

export async function fetchMyReports(reporterId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, created_at')
    .eq('reporter_id', reporterId)
    .order('created_at', { ascending: false });
  if (error) { console.error('[Social] fetchMyReports:', error.message); return []; }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    targetType: r.target_type as string,
    targetId: r.target_id as string | null,
    reason: r.reason as string,
    createdAt: r.created_at as string,
  }));
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function simPostToDbRow(p: SimPost) {
  // author_clan_id and author_rank are NOT written here. They exist on
  // the `posts` table as legacy columns, but the live values are resolved
  // in real time by the `posts_with_author_clan` view (JOIN profiles).
  //
  // Writing a frozen value would be the root cause of "post stuck with
  // an old clan" bug — by leaving them out we guarantee the view's
  // `live_*` columns are the only source of truth.
  //
  //   • author_clan_id  → stays NULL (column is nullable)
  //   • author_rank     → falls back to schema default 'aprendiz'
  //                       (column is NOT NULL with a default; we omit
  //                       the key so Postgres applies the default)
  return {
    id:              p.id,
    author_id:       p.authorId,
    author_username: p.authorUsername ?? '',
    author_clan_id:  null,
    type:            p.type,
    title:           p.title         ?? null,
    body:            p.body,
    quote_author:    p.quoteAuthor   ?? null,
    audio_track_id:  p.audioTrackId  ?? null,
    audio_volume:    p.audioVolume   ?? 1,
    image_url:       p.imageUrl      ?? null,
    image_width:     p.imageWidth    ?? null,
    image_height:    p.imageHeight   ?? null,
    image_crop_focus_y: p.imageCropFocusY ?? null,
    image_crop_focus_y_following: p.imageCropFocusYFollowing ?? null,
    image_show_para_ti: p.imageShowParaTi ?? null,
    image_show_siguiendo: p.imageShowSiguiendo ?? null,
    created_at:      p.createdAt,
  };
}

export function dbRowToSimPost(row: Record<string, unknown>): SimPost {
  // When reading from the posts_with_author_clan view we get two extra
  // columns: live_author_clan_id and live_author_rank, resolved from the
  // author's CURRENT profile. Prefer those over the frozen-at-publish
  // values so post cards always match the author's actual clan today.
  const liveClan = row['live_author_clan_id'] as string | null | undefined;
  const liveRank = row['live_author_rank'] as Rank | null | undefined;
  return {
    id:             row.id             as string,
    authorId:       row.author_id      as string,
    authorUsername: row.author_username as string,
    authorClanId:   liveClan !== undefined ? (liveClan ?? null) : ((row.author_clan_id as string | null) ?? null),
    authorRank:     (liveRank as Rank | undefined) ?? (row.author_rank as Rank),
    type:           row.type            as 'reflection' | 'phrase',
    title:          row.title           as string | undefined,
    body:           row.body            as string,
    quoteAuthor:    row.quote_author    as string | undefined,
    audioTrackId:   (row.audio_track_id as string | null | undefined) ?? null,
    audioVolume:    (row.audio_volume   as number | null | undefined) ?? null,
    imageUrl:       (row.image_url      as string | null | undefined) ?? null,
    imageWidth:     (row.image_width    as number | null | undefined) ?? null,
    imageHeight:    (row.image_height   as number | null | undefined) ?? null,
    imageCropFocusY: (row.image_crop_focus_y as number | null | undefined) ?? null,
    imageCropFocusYFollowing:
      (row.image_crop_focus_y_following as number | null | undefined) ?? null,
    imageShowParaTi:
      (row.image_show_para_ti as boolean | null | undefined) ?? null,
    imageShowSiguiendo:
      (row.image_show_siguiendo as boolean | null | undefined) ?? null,
    createdAt:      row.created_at      as string,
    upvoterIds:   [],
    downvoterIds: [],
    saverIds:     [],
  };
}

function simCommentToDbRow(c: SimComment) {
  // Same principle as simPostToDbRow: never freeze the author's clan or
  // rank into the comments row. We resolve them live from profiles when
  // we read (currently via direct mapping; can be moved behind a view
  // if comments end up needing live clan colours too).
  // parent_comment_id solo se serializa si está definido — degrada
  // graciosamente si la migración aún no se ha aplicado.
  const row: Record<string, unknown> = {
    id:              c.id,
    post_id:         c.postId,
    author_id:       c.authorId,
    author_username: c.authorUsername ?? '',
    author_clan_id:  null,
    body:            c.body,
    created_at:      c.createdAt,
  };
  if (c.parentId) row.parent_comment_id = c.parentId;
  return row;
}

export function dbRowToSimComment(row: Record<string, unknown>): SimComment {
  // Same logic as dbRowToSimPost — prefer the live_* values from the view.
  const liveClan = row['live_author_clan_id'] as string | null | undefined;
  const liveRank = row['live_author_rank'] as Rank | null | undefined;
  return {
    id:             row.id              as string,
    postId:         row.post_id         as string,
    authorId:       row.author_id       as string,
    authorUsername: row.author_username as string,
    authorClanId:   liveClan !== undefined ? (liveClan ?? null) : ((row.author_clan_id as string | null) ?? null),
    authorRank:     (liveRank as Rank | undefined) ?? (row.author_rank as Rank),
    body:           row.body            as string,
    upCount:        0,
    createdAt:      row.created_at      as string,
    parentId:       (row.parent_comment_id as string | null | undefined) ?? null,
  };
}

/** Borra un comentario propio o del autor del post. RLS lo valida en DB. */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);
  if (error) console.error('[Social] deleteComment:', error.message);
}

// ─── Admin ──────────────────────────────────────────────────────────────────

/** True si el usuario autenticado está en public.admins (vía RPC is_admin). */
export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    console.warn('[Social] checkIsAdmin:', error.message);
    return false;
  }
  return data === true;
}

/** Borra cualquier publicación (solo admin; verificado en la RPC). */
export async function adminDeletePost(postId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_post', { p_post_id: postId });
  if (error) throw new Error(error.message);
}

/** Borra cualquier comentario (solo admin; verificado en la RPC). */
export async function adminDeleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_comment', { p_comment_id: commentId });
  if (error) throw new Error(error.message);
}

/** Borra por completo la cuenta de otro usuario (solo admin). Irreversible. */
export async function adminDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
  if (error) throw new Error(error.message);
}
