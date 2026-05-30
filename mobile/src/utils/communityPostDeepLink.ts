/**
 * Deep link a una publicación en Comunidad → Para ti (widget, share, notificaciones).
 * Persiste el intent si expo-router pierde query params en cold start.
 */
import type { WidgetPostDeepLink } from './widgetDeepLink';
import { parseCommunityPostDeepLink, parseProfileDeepLink } from './widgetDeepLink';

let pending: WidgetPostDeepLink | null = null;
let navigationEpoch = 0;

/** Perfil compartido pendiente de abrir (cold start: sobrevive hasta que haya sesión + tabs). */
let pendingProfileId: string | null = null;

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

// ── Pestaña solicitada (Para ti / Siguiendo / Search) ────────────────────────
//
// Cuando se pulsa una pestaña de la barra inferior desde una pantalla que NO es
// Comunidad (perfil, racha, ajustes…), se navega a `/(tabs)`. Como CommunityScreen
// es persistente, su `activeTab` no se actualiza solo con el query param `tab`
// (expo-router puede no re-emitir si el param no cambia). Para que SIEMPRE se
// aplique la pestaña pulsada — incluso al re-pulsar la misma — guardamos aquí la
// pestaña pedida y notificamos vía el mismo canal de navegación; CommunityScreen
// la consume y la aplica.
let pendingTab: string | null = null;

/** Solicita que Comunidad muestre una pestaña concreta y notifica al listener. */
export function requestCommunityTab(tab: string): void {
  pendingTab = tab;
  notifyCommunityPostNavigation();
}

/** Devuelve la pestaña pedida y la borra (un solo consumo). */
export function consumeRequestedCommunityTab(): string | null {
  const t = pendingTab;
  pendingTab = null;
  return t;
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

// ── Perfil compartido ────────────────────────────────────────────────────────

export function scheduleProfileDeepLink(userId: string): void {
  pendingProfileId = userId;
}

export function peekProfileDeepLink(): string | null {
  return pendingProfileId;
}

/** Devuelve el userId pendiente y lo borra (un solo consumo por apertura). */
export function consumeProfileDeepLink(): string | null {
  const id = pendingProfileId;
  pendingProfileId = null;
  return id;
}

/**
 * Prime unificado para cold start: detecta si la URL es de post o de perfil y
 * deja el intent correspondiente pendiente. Devuelve 'post' | 'profile' | null.
 */
export function primeAppDeepLinkFromUrl(
  url: string | null | undefined,
): 'post' | 'profile' | null {
  const post = parseCommunityPostDeepLink(url);
  if (post) {
    scheduleCommunityPostDeepLink(post);
    return 'post';
  }
  const profileId = parseProfileDeepLink(url);
  if (profileId) {
    scheduleProfileDeepLink(profileId);
    return 'profile';
  }
  return null;
}
