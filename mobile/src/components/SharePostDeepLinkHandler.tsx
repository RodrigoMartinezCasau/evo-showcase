/**
 * Enlaces de publicación compartida (evo://post/…, evo:///?tab=para-ti&postId=…,
 * https://www.evoconn.com/post/…). Misma UX que widget: programa el post y abre tabs.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mobile/lib/AuthContext';
import { parseCommunityPostDeepLink } from '@evoconn/utils/widgetDeepLink';
import { primeCommunityPostDeepLinkFromUrl } from '@evoconn/utils/communityPostDeepLink';
import { navigateToCommunityPost } from '@evoconn/utils/notificationNavigation';

export function SharePostDeepLinkHandler() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const linkingUrl = Linking.useURL();

  const lastWarmUrlRef = useRef<string | null>(null);

  const openPostFromUrl = useCallback(
    (url: string | null | undefined, source: 'event' | 'url-hook' = 'event') => {
      if (!url) return;
      if (source === 'url-hook' && lastWarmUrlRef.current === url) return;
      const link = parseCommunityPostDeepLink(url);
      if (!link) return;
      lastWarmUrlRef.current = url;
      navigateToCommunityPost(router, link.postId, link.commentId);
    },
    [router],
  );

  // App en caliente: useURL (Safari / universal) + listener (botón «Abrir en EVO»).
  useEffect(() => {
    if (loading || !session) return;
    if (linkingUrl) openPostFromUrl(linkingUrl, 'url-hook');
  }, [loading, session, linkingUrl, openPostFromUrl]);

  useEffect(() => {
    if (loading || !session) return;
    const sub = Linking.addEventListener('url', ({ url }) => {
      lastWarmUrlRef.current = null;
      openPostFromUrl(url, 'event');
    });
    return () => sub.remove();
  }, [loading, session, openPostFromUrl]);

  return null;
}

/** Programa post en cold start antes de AuthGate (widget + share + universal). */
export function CommunityPostColdStartLinkPrime() {
  const primed = useRef(false);
  useEffect(() => {
    if (primed.current) return;
    primed.current = true;
    void Linking.getInitialURL().then((url) => {
      primeCommunityPostDeepLinkFromUrl(url);
    });
  }, []);
  return null;
}
