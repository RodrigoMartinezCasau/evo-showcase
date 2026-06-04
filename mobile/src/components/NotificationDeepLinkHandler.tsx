/**
 * Navegación al pulsar una burbuja del sistema (expo-notifications).
 * Requiere `data.postId` / `data.fromUserId` en el payload (supabase_push_remote.sql).
 */
import { useCallback, useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '../../mobile/lib/AuthContext';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import {
  navigateToCommunityPost,
  navigateToUserProfile,
} from '@evoconn/utils/notificationNavigation';

// En Expo Go (SDK 53+) el módulo de push remoto no existe; require() muestra ERROR en consola.
const IS_EXPO_GO =
  Constants.appOwnership === 'expo' ||
  (Constants.executionEnvironment as string) === 'storeClient';

function getNotificationsModule() {
  if (IS_EXPO_GO) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

type NotificationResponse = import('expo-notifications').NotificationResponse;

function readPushData(raw: unknown): {
  postId?: string;
  commentId?: string;
  fromUserId?: string;
  type?: string;
} {
  if (!raw || typeof raw !== 'object') return {};
  const d = raw as Record<string, unknown>;
  const postId = d.postId ?? d.post_id;
  const commentId = d.commentId ?? d.comment_id;
  const fromUserId = d.fromUserId ?? d.from_user_id;
  const type = d.type;
  return {
    postId: postId != null ? String(postId).trim() : undefined,
    commentId: commentId != null ? String(commentId).trim() : undefined,
    fromUserId: fromUserId != null ? String(fromUserId).trim() : undefined,
    type: type != null ? String(type).trim() : undefined,
  };
}

function responseDedupeKey(response: NotificationResponse): string {
  const req = response.notification.request;
  return `${req.identifier}:${response.actionIdentifier}:${response.notification.date}`;
}

/** Solo una lectura de cold-start por proceso JS (evita re-disparos en refresh de sesión). */
let coldStartLastResponseChecked = false;

export function NotificationDeepLinkHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading } = useAuth();
  const handledResponseKeysRef = useRef(new Set<string>());

  const handleResponse = useCallback(
    (response: NotificationResponse, source: 'cold-start' | 'user-tap') => {
      const dedupeKey = responseDedupeKey(response);
      if (handledResponseKeysRef.current.has(dedupeKey)) return;

      const { postId, commentId, fromUserId, type } = readPushData(
        response.notification.request.content.data,
      );

      // Reveal de clan (campaña de desbloqueo): no hay pantalla destino. Basta
      // con que la app se abra: la animación de reveal se dispara sola en el
      // arranque (pendingLaunchReveal + AppAnimationLayer). Evitamos abrir la
      // bandeja de notificaciones, que no tiene nada que ver.
      if (type === 'clan_reveal') {
        handledResponseKeysRef.current.add(dedupeKey);
        return;
      }

      if (postId) {
        handledResponseKeysRef.current.add(dedupeKey);
        navigateToCommunityPost(router, postId, commentId);
        return;
      }
      if (fromUserId) {
        handledResponseKeysRef.current.add(dedupeKey);
        navigateToUserProfile(router, fromUserId);
        return;
      }

      // Sin deep link: solo abrir bandeja si el usuario PULSÓ la burbuja.
      // Antes también se hacía en cold-start/replays → Android mandaba a
      // /notifications sin tocar nada (p. ej. tras refresh_token o al volver
      // de background porque getLastNotificationResponseAsync se re-ejecutaba).
      if (source === 'user-tap') {
        handledResponseKeysRef.current.add(dedupeKey);
        navigateUnlessCurrent(pathname, '/notifications');
      }
    },
    [router, pathname],
  );

  useEffect(() => {
    const N = getNotificationsModule();
    if (!N || loading || !session) return;

    if (!coldStartLastResponseChecked) {
      coldStartLastResponseChecked = true;
      void N.getLastNotificationResponseAsync().then((response) => {
        if (!response) return;
        handleResponse(response, 'cold-start');
      });
    }

    const sub = N.addNotificationResponseReceivedListener((response) => {
      handleResponse(response, 'user-tap');
    });

    return () => sub.remove();
  }, [session, loading, handleResponse]);

  return null;
}
