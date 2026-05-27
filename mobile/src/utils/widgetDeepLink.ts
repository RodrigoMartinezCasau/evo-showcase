import * as Linking from 'expo-linking';
import { sanitizeRouteId } from './sanitizeRouteId';

export type WidgetPostDeepLink = { tab: 'para-ti'; postId: string };

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
  if (postIdFromQuery) {
    const id = sanitizeRouteId(postIdFromQuery);
    if (id) return { tab: 'para-ti', postId: id };
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

/** Normaliza un route/query param y limpia caracteres no-id (texto del share
 * que un parser permisivo de chat pega al URL). Devuelve `undefined` si tras
 * limpiar no queda un id válido. */
export function normalizeRouteParam(value: string | string[] | undefined): string | undefined {
  const normalized = normalizeQueryParam(value);
  if (!normalized) return undefined;
  return sanitizeRouteId(normalized);
}
