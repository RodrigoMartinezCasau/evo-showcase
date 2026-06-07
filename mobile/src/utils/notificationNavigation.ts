import type { Router } from 'expo-router';
import { sanitizeRouteId } from '@evoconn/utils/sanitizeRouteId';
import {
  scheduleCommunityPostDeepLink,
  peekCommunityPostNavigationEpoch,
  notifyCommunityPostNavigation,
  subscribeCommunityPostNavigation,
} from './communityPostDeepLink';

export { subscribeCommunityPostNavigation };

let forcedCommunityPostId: string | null = null;
let forcedCommunityCommentId: string | null = null;
let forcedNavigationEpoch = 0;

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

export function peekNavigationEpoch(): number {
  return Math.max(peekCommunityPostNavigationEpoch(), forcedNavigationEpoch);
}

/**
 * Abre una publicación en el visor fullscreen de Para ti.
 * Usa `/detail-feed` con el post objetivo siempre en índice 0.
 */
export function navigateToCommunityPost(
  router: Router,
  postId: string | undefined,
  commentId?: string,
): void {
  const id = sanitizeRouteId(postId);
  if (!id) return;
  const cleanComment = commentId?.trim() || undefined;
  scheduleCommunityPostOpen(id, cleanComment);
  router.push({
    pathname: '/detail-feed',
    params: {
      mode: 'foryou',
      postId: id,
      ...(cleanComment ? { commentId: cleanComment } : {}),
    },
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
