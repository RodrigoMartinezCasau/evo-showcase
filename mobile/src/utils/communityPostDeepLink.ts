/**
 * Deep link a una publicación en Comunidad → Para ti (widget, share, notificaciones).
 * Persiste el intent si expo-router pierde query params en cold start.
 */
import type { WidgetPostDeepLink } from './widgetDeepLink';

let pending: WidgetPostDeepLink | null = null;

export function scheduleCommunityPostDeepLink(link: WidgetPostDeepLink): void {
  pending = link;
}

export function peekCommunityPostDeepLink(): WidgetPostDeepLink | null {
  return pending;
}

/** Devuelve el intent y lo borra (un solo consumo por apertura). */
export function consumeCommunityPostDeepLink(): WidgetPostDeepLink | null {
  const link = pending;
  pending = null;
  return link;
}

export function peekCommunityPostId(): string | undefined {
  return pending?.postId;
}
