/**
 * Deep link a una publicación en Comunidad → Para ti (widget, share, notificaciones).
 * Persiste el intent si expo-router pierde query params en cold start.
 */
import type { WidgetPostDeepLink } from './widgetDeepLink';
import { parseCommunityPostDeepLink } from './widgetDeepLink';

let pending: WidgetPostDeepLink | null = null;
let navigationEpoch = 0;

type NavigationListener = () => void;
const navigationListeners: NavigationListener[] = [];

/** CommunityScreen se suscribe para re-procesar aunque expo-router no actualice params. */
export function subscribeCommunityPostNavigation(listener: NavigationListener): () => void {
  navigationListeners.push(listener);
  return () => {
    const idx = navigationListeners.indexOf(listener);
    if (idx >= 0) navigationListeners.splice(idx, 1);
  };
}

export function notifyCommunityPostNavigation(): void {
  navigationListeners.forEach((fn) => fn());
}

export function scheduleCommunityPostDeepLink(link: WidgetPostDeepLink): number {
  pending = link;
  navigationEpoch += 1;
  notifyCommunityPostNavigation();
  return navigationEpoch;
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

export function acknowledgeCommunityPostDeepLink(): void {
  pending = null;
}

export function peekCommunityPostId(): string | undefined {
  return pending?.postId;
}

export function peekCommunityPostNavigationEpoch(): number {
  return navigationEpoch;
}

/** Widget, share (evo:// / https evoconn.com/post/…) y universal links en cold start. */
export function primeCommunityPostDeepLinkFromUrl(
  url: string | null | undefined,
): WidgetPostDeepLink | null {
  const link = parseCommunityPostDeepLink(url);
  if (!link) return null;
  scheduleCommunityPostDeepLink(link);
  return link;
}
