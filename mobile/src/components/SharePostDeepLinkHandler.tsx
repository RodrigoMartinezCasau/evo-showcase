/**
 * Enlaces compartidos:
 *  - Publicación: evo://post/…, evo:///?tab=para-ti&postId=…, https://www.evoconn.com/post/…
 *    → misma UX que el widget: programa el post y CommunityScreen lo abre tras la animación.
 *  - Perfil: evo://profile/…, https://www.evoconn.com/profile/…
 *    → navega a /profile/[id] en cuanto hay sesión + tabs montados.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mobile/lib/AuthContext';
import {
  parseCommunityPostDeepLink,
  parseProfileDeepLink,
} from '@evoconn/utils/widgetDeepLink';
import {
  primeAppDeepLinkFromUrl,
  consumeProfileDeepLink,
} from '@evoconn/utils/communityPostDeepLink';
import {
  navigateToCommunityPost,
  navigateToUserProfile,
} from '@evoconn/utils/notificationNavigation';

export function SharePostDeepLinkHandler() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const linkingUrl = Linking.useURL();

  const lastWarmUrlRef = useRef<string | null>(null);
  const lastProfileNavRef = useRef<string | null>(null);

  /** Push diferido para que /(tabs) termine de montar antes de abrir el perfil. */
  const openProfile = useCallback(
    (profileId: string) => {
      if (lastProfileNavRef.current === profileId) return;
      lastProfileNavRef.current = profileId;
      setTimeout(() => navigateToUserProfile(router, profileId), 350);
    },
    [router],
  );

  const openFromUrl = useCallback(
    (url: string | null | undefined, source: 'event' | 'url-hook' = 'event') => {
      if (!url) return;
      if (source === 'url-hook' && lastWarmUrlRef.current === url) return;

      const post = parseCommunityPostDeepLink(url);
      if (post) {
        lastWarmUrlRef.current = url;
        navigateToCommunityPost(router, post.postId, post.commentId);
        return;
      }

      const profileId = parseProfileDeepLink(url);
      if (profileId) {
        lastWarmUrlRef.current = url;
        openProfile(profileId);
      }
    },
    [router, openProfile],
  );

  // App en caliente: useURL (Safari / universal) + listener (botón «Abrir en EVO»).
  useEffect(() => {
    if (loading || !session) return;
    if (linkingUrl) openFromUrl(linkingUrl, 'url-hook');
  }, [loading, session, linkingUrl, openFromUrl]);

  useEffect(() => {
    if (loading || !session) return;
    const sub = Linking.addEventListener('url', ({ url }) => {
      lastWarmUrlRef.current = null;
      lastProfileNavRef.current = null;
      openFromUrl(url, 'event');
    });
    return () => sub.remove();
  }, [loading, session, openFromUrl]);

  // Cold start de PERFIL (backup si `useURL` no devolvió la URL inicial): el
  // intent quedó programado antes de AuthGate; lo consumimos al haber sesión.
  useEffect(() => {
    if (loading || !session) return;
    const profileId = consumeProfileDeepLink();
    if (profileId) openProfile(profileId);
  }, [loading, session, openProfile]);

  return null;
}

/** Programa post/perfil en cold start antes de AuthGate (widget + share + universal). */
export function CommunityPostColdStartLinkPrime() {
  const primed = useRef(false);
  useEffect(() => {
    if (primed.current) return;
    primed.current = true;
    void Linking.getInitialURL().then((url) => {
      primeAppDeepLinkFromUrl(url);
    });
  }, []);
  return null;
}
