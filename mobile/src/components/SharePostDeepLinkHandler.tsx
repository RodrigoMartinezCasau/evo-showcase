/**
 * Enlaces de publicación compartida (evo://post/…, evo:///?tab=para-ti&postId=…, https universal).
 * Misma UX que widget / notificaciones: visor Para ti, no PostDetailScreen.
 */
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mobile/lib/AuthContext';
import { parseCommunityPostDeepLink } from '@evoconn/utils/widgetDeepLink';
import { navigateToCommunityPost } from '@evoconn/utils/notificationNavigation';

export function SharePostDeepLinkHandler() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading || !session) return;

    const handleUrl = (url: string) => {
      const link = parseCommunityPostDeepLink(url);
      if (!link) return;
      navigateToCommunityPost(router, link.postId);
    };

    // Cold start: AuthGate ya procesa getInitialURL. Aquí solo enlaces en caliente.
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [loading, session, router]);

  return null;
}
