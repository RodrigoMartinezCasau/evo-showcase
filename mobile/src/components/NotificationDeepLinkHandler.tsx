/**
 * Navegación al pulsar una burbuja del sistema (expo-notifications).
 * Requiere `data.postId` / `data.fromUserId` en el payload (supabase_push_remote.sql).
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mobile/lib/AuthContext';
import {
  navigateToCommunityPost,
  navigateToUserProfile,
} from '@evoconn/utils/notificationNavigation';

function getNotificationsModule() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

function readPushData(raw: unknown): { postId?: string; fromUserId?: string } {
  if (!raw || typeof raw !== 'object') return {};
  const d = raw as Record<string, unknown>;
  const postId = d.postId ?? d.post_id;
  const fromUserId = d.fromUserId ?? d.from_user_id;
  return {
    postId: postId != null ? String(postId).trim() : undefined,
    fromUserId: fromUserId != null ? String(fromUserId).trim() : undefined,
  };
}

export function NotificationDeepLinkHandler() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    const N = getNotificationsModule();
    if (!N || loading || !session) return;

    const handleResponse = (data: unknown) => {
      const { postId, fromUserId } = readPushData(data);
      if (postId) {
        navigateToCommunityPost(router, postId);
        return;
      }
      if (fromUserId) {
        navigateToUserProfile(router, fromUserId);
        return;
      }
      router.push('/notifications');
    };

    void N.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      handleResponse(response.notification.request.content.data);
    });

    const sub = N.addNotificationResponseReceivedListener((response) => {
      handleResponse(response.notification.request.content.data);
    });

    return () => sub.remove();
  }, [router, session, loading]);

  return null;
}
