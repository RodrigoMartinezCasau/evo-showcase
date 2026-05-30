import * as Linking from 'expo-linking';
import { sanitizeRouteId } from './sanitizeRouteId';

export type WidgetPostDeepLink = { tab: 'para-ti'; postId: string; commentId?: string };

function normalizeQueryParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s.length > 0 ? s : undefined;
}

function postIdFromPathSegment(segment: string | undefined): string | undefined {
  if (!segment) return undefined;
  const cleaned = sanitizeRouteId(segment);
  return cleaned || undefined;
}

/** Widget + share + universal link → abrir publicación en visor Para ti. */
export function parseCommunityPostDeepLink(url: string | null | undefined): WidgetPostDeepLink | null {
  if (!url) return null;

  const parsed = Linking.parse(url);
  const queryParams = parsed.queryParams ?? {};

  const tab = normalizeQueryParam(queryParams.tab as string | string[] | undefined);
  const postIdFromQuery = normalizeQueryParam(
    queryParams.postId as string | string[] | undefined,
  );
  const commentIdFromQuery = normalizeQueryParam(
    queryParams.commentId as string | string[] | undefined,
  );
  if (postIdFromQuery) {
    const id = sanitizeRouteId(postIdFromQuery);
    const commentId = commentIdFromQuery ? sanitizeRouteId(commentIdFromQuery) : undefined;
    if (id) return { tab: 'para-ti', postId: id, commentId };
  }

  const path = (parsed.path ?? '').replace(/^\//, '');
  const host = (parsed.hostname ?? '').toLowerCase();

  // evo://post/{uuid}
  if (host === 'post') {
    const id = postIdFromPathSegment(path || undefined);
    if (id) return { tab: 'para-ti', postId: id };
  }
  if (path.startsWith('post/')) {
    const id = postIdFromPathSegment(path.slice('post/'.length).split('/')[0]);
    if (id) return { tab: 'para-ti', postId: id };
  }

  // https://www.evoconn.com/post/{uuid} (universal / app link)
  const isWeb =
    host.includes('evoconn.com') ||
    (parsed.scheme === 'https' && path.startsWith('post/'));
  if (isWeb && path.startsWith('post/')) {
    const id = postIdFromPathSegment(path.slice('post/'.length).split('/')[0]);
    if (id) return { tab: 'para-ti', postId: id };
  }

  return null;
}

/** @deprecated Usa {@link parseCommunityPostDeepLink}. */
export function parseWidgetPostDeepLink(url: string | null | undefined): WidgetPostDeepLink | null {
  return parseCommunityPostDeepLink(url);
}

/**
 * Enlace de PERFIL compartido → `/profile/[id]`.
 * Soporta `evo://profile/{id}` y `https://(www.)evoconn.com/profile/{id}`.
 * Devuelve el userId limpio o null si la URL no es de perfil.
 */
export function parseProfileDeepLink(url: string | null | undefined): string | null {
  if (!url) return null;

  const parsed = Linking.parse(url);
  const path = (parsed.path ?? '').replace(/^\//, '');
  const host = (parsed.hostname ?? '').toLowerCase();

  // evo://profile/{id}
  if (host === 'profile') {
    const id = postIdFromPathSegment(path || undefined);
    if (id) return id;
  }
  if (path.startsWith('profile/')) {
    const id = postIdFromPathSegment(path.slice('profile/'.length).split('/')[0]);
    if (id) return id;
  }

  // https://www.evoconn.com/profile/{id}
  const isWeb =
    host.includes('evoconn.com') ||
    (parsed.scheme === 'https' && path.startsWith('profile/'));
  if (isWeb && path.startsWith('profile/')) {
    const id = postIdFromPathSegment(path.slice('profile/'.length).split('/')[0]);
    if (id) return id;
  }

  return null;
}

/** Normaliza un route/query param y limpia caracteres no-id (texto del share
 * que un parser permisivo de chat pega al URL). Devuelve `undefined` si tras
 * limpiar no queda un id válido. */
export function normalizeRouteParam(value: string | string[] | undefined): string | undefined {
  const normalized = normalizeQueryParam(value);
  if (!normalized) return undefined;
  return sanitizeRouteId(normalized);
}
