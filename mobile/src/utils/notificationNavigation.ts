import type { Router } from 'expo-router';
import {
  scheduleCommunityPostDeepLink,
  peekCommunityPostNavigationEpoch,
} from './communityPostDeepLink';

/** Fuerza que CommunityScreen vuelva a procesar el mismo deep link (p. ej. otro post). */
let forcedCommunityPostId: string | null = null;
let forcedCommunityCommentId: string | null = null;
let forcedNavigationEpoch = 0;

type NavigationListener = () => void;
const navigationListeners: NavigationListener[] = [];

function notifyCommunityPostNavigation(): void {
  navigationListeners.forEach((fn) => fn());
}

/** CommunityScreen se suscribe para re-procesar aunque expo-router no actualice params. */
export function subscribeCommunityPostNavigation(listener: NavigationListener): () => void {
  navigationListeners.push(listener);
  return () => {
    const idx = navigationListeners.indexOf(listener);
    if (idx >= 0) navigationListeners.splice(idx, 1);
  };
}

export function consumeForcedCommunityPostOpen(): string | null {
  const id = forcedCommunityPostId;
  forcedCommunityPostId = null;
  return id;
}

export function consumeForcedCommunityCommentOpen(): string | null {
  const id = forcedCommunityCommentId;
  forcedCommunityCommentId = null;
  return id;
}

/** Epoch de la última navegación forzada (0 si no había). */
export function consumeForcedNavigationEpoch(): number {
  const epoch = forcedNavigationEpoch;
  forcedNavigationEpoch = 0;
  return epoch;
}

function scheduleCommunityPostOpen(postId: string, commentId?: string): number {
  forcedCommunityPostId = postId;
  forcedCommunityCommentId = commentId ?? null;
  const epoch = scheduleCommunityPostDeepLink({ tab: 'para-ti', postId, commentId });
  forcedNavigationEpoch = epoch;
  notifyCommunityPostNavigation();
  return epoch;
}

/**
 * Abre la publicación en el visor fullscreen de Para ti (misma UX que el widget).
 * `commentId` opcional: despliega el hilo y centra ese comentario (notificaciones).
 * Usa `replace` para no apilar otro `(tabs)` encima de /notifications (evita crash).
 */
export function navigateToCommunityPost(
  router: Router,
  postId: string | undefined,
  commentId?: string,
): void {
  const id = postId?.trim();
  if (!id) return;
  const cleanComment = commentId?.trim() || undefined;
  const epoch = scheduleCommunityPostOpen(id, cleanComment);
  router.replace({
    pathname: '/(tabs)',
    params: {
      tab: 'para-ti',
      postId: id,
      ...(cleanComment ? { commentId: cleanComment } : {}),
      nav: String(epoch),
    },
  });
}

/** Epoch actual del intent pendiente (para deps en CommunityScreen). */
export function peekNavigationEpoch(): number {
  return Math.max(peekCommunityPostNavigationEpoch(), forcedNavigationEpoch);
}

/** Perfil de otro usuario (@username opcional para cabecera mientras carga). */
export function navigateToUserProfile(
  router: Router,
  userId: string | undefined,
  username?: string,
): void {
  const id = userId?.trim();
  if (!id) return;
  const cleanUser = username?.replace(/^@+/, '').trim();
  router.push({
    pathname: '/profile/[id]',
    params: {
      id,
      ...(cleanUser ? { username: cleanUser } : {}),
    },
  });
}
