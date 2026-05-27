import type { Router } from 'expo-router';
import { scheduleCommunityPostDeepLink } from './communityPostDeepLink';

/** Fuerza que CommunityScreen vuelva a procesar el mismo deep link (p. ej. otro post). */
let forcedCommunityPostId: string | null = null;

export function consumeForcedCommunityPostOpen(): string | null {
  const id = forcedCommunityPostId;
  forcedCommunityPostId = null;
  return id;
}

function scheduleCommunityPostOpen(postId: string): void {
  forcedCommunityPostId = postId;
  scheduleCommunityPostDeepLink({ tab: 'para-ti', postId });
}

/**
 * Abre la publicación en el visor fullscreen de Para ti (misma UX que el widget).
 * Usa `replace` para no apilar otro `(tabs)` encima de /notifications (evita crash).
 */
export function navigateToCommunityPost(router: Router, postId: string | undefined): void {
  const id = postId?.trim();
  if (!id) return;
  scheduleCommunityPostOpen(id);
  router.replace({
    pathname: '/(tabs)',
    params: { tab: 'para-ti', postId: id },
  });
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
