/**
 * Contexto de publicaciones visibles en el feed (Bloque B).
 *
 * Lógica pura (sin React Native, sin tipos de Evo): la pantalla del feed
 * mapea sus posts a `VisiblePost` y este módulo selecciona, limita y formatea
 * el texto que viaja al LLM. Así el LLM puede responder a "léeme esta
 * publicación", "¿de qué trata el post de @fulano?", etc.
 *
 * Límites propios del feed (se aplican ANTES del tope general de contexto
 * de `contextLimits.ts`): máximo 5 publicaciones y 200 chars de preview.
 */

/** Máximo de publicaciones visibles que se envían al contexto. */
export const MAX_VISIBLE_POSTS = 5;

/** Máximo de caracteres del contenido de cada publicación. */
export const MAX_POST_PREVIEW_CHARS = 200;

/** Publicación visible en el viewport, ya normalizada para el LLM. */
export interface VisiblePost {
  /** Id de la publicación (para acciones sobre posts en v2). */
  post_id: string;
  post_type: 'reflection' | 'phrase';
  author_username: string;
  author_display_name?: string;
  /** Etiqueta legible del clan del autor ("Humanista"), no el id interno. */
  author_clan?: string;
  /** Contenido recortado a MAX_POST_PREVIEW_CHARS. */
  content_preview: string;
  /** Solo metadato en v1: la imagen NO se envía al LLM. */
  has_image: boolean;
  has_my_like?: boolean;
  likes_count: number;
  comments_count?: number;
  /** "hace 2 h", "hace 1 d"… */
  created_at_relative: string;
}

/** Contexto de pantalla del feed con publicaciones visibles. */
export interface FeedScreenContext {
  type: 'feed';
  feedType: 'para-ti' | 'siguiendo';
  visiblePosts: VisiblePost[];
  /** Índice (en visiblePosts) del post más centrado en pantalla. */
  focusedPostIndex?: number;
}

/**
 * Publicación objetivo de una acción ("dale like", "guarda esto"): la marcada
 * como enfocada o, en su defecto, la primera visible. Null si no hay posts.
 */
export function getFocusedPost(feed: FeedScreenContext | undefined | null): VisiblePost | null {
  if (!feed || feed.visiblePosts.length === 0) return null;
  const idx =
    feed.focusedPostIndex != null &&
    feed.focusedPostIndex >= 0 &&
    feed.focusedPostIndex < feed.visiblePosts.length
      ? feed.focusedPostIndex
      : 0;
  return feed.visiblePosts[idx];
}

/**
 * Limita a `max` elementos manteniendo los más centrados: si hay de sobra,
 * recorta por los extremos alrededor de `focusedIndex` (o del centro).
 */
export function selectMostCentered<T>(
  items: T[],
  focusedIndex?: number,
  max: number = MAX_VISIBLE_POSTS,
): T[] {
  if (items.length <= max) return items;
  const center =
    focusedIndex != null && focusedIndex >= 0 && focusedIndex < items.length
      ? focusedIndex
      : Math.floor(items.length / 2);
  let start = center - Math.floor(max / 2);
  start = Math.max(0, Math.min(start, items.length - max));
  return items.slice(start, start + max);
}

/** Recorta el contenido de un post a MAX_POST_PREVIEW_CHARS. */
export function clipPostPreview(content: string, max: number = MAX_POST_PREVIEW_CHARS): string {
  const t = content.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatPostLine(post: VisiblePost, ordinal: number, focused: boolean): string {
  const parts: string[] = [];
  parts.push(post.post_type === 'phrase' ? 'frase' : 'reflexión');
  if (post.author_clan) parts.push(`clan ${post.author_clan}`);
  parts.push(`${post.likes_count} votos positivos`);
  if (post.comments_count != null) parts.push(`${post.comments_count} comentarios`);
  if (post.created_at_relative) parts.push(post.created_at_relative);
  if (post.has_image) parts.push('con imagen adjunta');

  const focusTag = focused ? ' [POST EN PANTALLA AHORA]' : '';
  return (
    `${ordinal}.${focusTag} [post_id: ${post.post_id}] ` +
    `@${post.author_username} (${parts.join(', ')}): «${post.content_preview}»`
  );
}

/**
 * Construye el texto de contexto del feed para el LLM. Aplica los límites
 * de 5 posts (los más centrados) y 200 chars por preview. Con el feed vacío
 * devuelve un texto explícito para que el LLM no invente publicaciones.
 */
export function buildFeedScreenContextText(ctx: FeedScreenContext): string {
  const feedLabel = ctx.feedType === 'para-ti' ? '«Para ti»' : '«Siguiendo»';
  const header = `Pantalla actual: feed ${feedLabel} de Evo.`;

  if (ctx.visiblePosts.length === 0) {
    return `${header}\nTodavía no hay publicaciones cargadas en pantalla.`;
  }

  const limited = selectMostCentered(ctx.visiblePosts, ctx.focusedPostIndex);
  const focusedPost =
    ctx.focusedPostIndex != null ? ctx.visiblePosts[ctx.focusedPostIndex] : undefined;

  const lines = limited.map((post, i) => {
    const normalized: VisiblePost = {
      ...post,
      content_preview: clipPostPreview(post.content_preview),
    };
    return formatPostLine(normalized, i + 1, focusedPost === post);
  });

  return [
    header,
    `Publicaciones visibles en pantalla (${limited.length}):`,
    ...lines,
    'Si el usuario dice "esta publicación" o "este post" se refiere a la marcada como',
    'POST EN PANTALLA AHORA (o a la única visible). Las imágenes no se pueden describir,',
    'solo mencionar que existen.',
  ].join('\n');
}
