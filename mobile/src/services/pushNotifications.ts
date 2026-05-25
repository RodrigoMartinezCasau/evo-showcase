/**
 * Push Notifications — registro de token y notificaciones locales (racha).
 *
 * Flujo social (burbujas del sistema con la app cerrada):
 * 1. Al iniciar sesión, registramos el Expo Push Token en Supabase (`profiles.push_token`).
 * 2. Al insertar una fila en `notifications`, el trigger `send_expo_push_for_notification_row`
 *    (supabase_push_remote.sql) llama a la API de Expo → burbuja en el móvil del destinatario.
 *
 * Flujo in-app: Realtime en NotificationsContext actualiza la campana (sin depender del push).
 *
 * Racha: notificaciones locales programadas en el dispositivo (22:00 / 23:30).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from '../../mobile/lib/supabase';

// expo-notifications remote push was removed from Expo Go in SDK 53.
// Skip entirely when running inside Expo Go to avoid the fatal error.
const IS_EXPO_GO =
  Constants.appOwnership === 'expo' ||
  (Constants.executionEnvironment as string) === 'storeClient';

function getNotifications() {
  if (IS_EXPO_GO) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

const NOTIFS_KEY = '@evo/notifications_enabled';

async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(NOTIFS_KEY);
    return val === null || val === 'true';
  } catch {
    return true;
  }
}

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano.
// Se llama solo si el módulo está disponible (build nativo).
const Notifications = getNotifications();
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Anti-loop guard ──────────────────────────────────────────────────────────
// Evitamos llamar a requestPermissionsAsync repetidamente: en algunos dispositivos
// abrir el diálogo del sistema dispara el ciclo paused→resumed, y si nuestro
// AppState listener vuelve a llamar a registerPushToken, entra en bucle infinito
// que a su vez crashea Fabric con IllegalStateException (vistas no desmontadas).
let _registrationInFlight: Promise<void> | null = null;
let _hasPromptedThisSession = false;
let _lastRegisteredUserId: string | null = null;
let _lastRegisteredAt = 0;
const MIN_REREGISTER_INTERVAL_MS = 60_000; // No reescribir el token más de 1×/min.

/** Solicita permisos y registra el push token en Supabase para este dispositivo. */
export async function registerPushToken(userId: string): Promise<void> {
  if (_registrationInFlight) return _registrationInFlight;

  // Skip si el mismo usuario ya se registró hace menos de 1 minuto.
  const now = Date.now();
  if (_lastRegisteredUserId === userId && now - _lastRegisteredAt < MIN_REREGISTER_INTERVAL_MS) {
    return;
  }

  _registrationInFlight = (async () => {
    const N = getNotifications();
    if (!N) return;
    try {
      if (Platform.OS === 'android') {
        await N.setNotificationChannelAsync('default', {
          name: 'EVO',
          importance: N.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#C7FF02',
        });
      }

      const perms = await N.getPermissionsAsync();
      const existingStatus = perms.status;
      const canAskAgain = (perms as { canAskAgain?: boolean }).canAskAgain ?? true;
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        // Solo pedimos el diálogo del sistema si:
        //   – el usuario aún puede ser preguntado (no marcó "No volver a preguntar"), y
        //   – no se lo hemos pedido ya en esta sesión.
        if (!canAskAgain || _hasPromptedThisSession) {
          console.log('[Push] Permisos de notificación denegados.');
          return;
        }
        _hasPromptedThisSession = true;
        const { status } = await N.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Push] Permisos de notificación denegados.');
        return;
      }

      const tokenData = await N.getExpoPushTokenAsync({
        projectId: '160e255b-b9ca-4948-ad82-88a29a5a2633',
      });

      const token = tokenData.data;
      console.log('[Push] Token registrado:', token);

      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
      if (error) {
        console.error('[Push] Error guardando push_token en profiles:', error.message);
      } else {
        _lastRegisteredUserId = userId;
        _lastRegisteredAt = Date.now();
      }
    } catch (err) {
      console.error('[Push] Error registrando token:', err);
    } finally {
      _registrationInFlight = null;
    }
  })();

  return _registrationInFlight;
}

/**
 * Muestra una notificación local inmediata (sonido + vibración).
 * Solo debe llamarse para tipos que justifican interrupción: follow y comment.
 * Los likes, dislikes y guardados NO generan notificación nativa.
 */
export async function showLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  try {
    const enabled = await areNotificationsEnabled();
    if (!enabled) return;

    await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null,
    });
  } catch (err) {
    console.error('[Push] Error mostrando notificación local:', err);
  }
}

// ─── Recordatorio de racha ────────────────────────────────────────────────────
// Ventana hasta medianoche: aviso a las 22:00 (~2 h) y a las 23:30 (~30 min).

const STREAK_REMINDER_2H_ID = 'evo_streak_reminder_2h';
const STREAK_REMINDER_30M_ID = 'evo_streak_reminder_30m';

/**
 * Cuentas con este número de seguidores o más no reciben notificación nativa
 * por comentarios ni nuevos seguidores (sí siguen viendo la campana en la app).
 */
export const MAX_FOLLOWERS_FOR_SOCIAL_PUSH = 10_000;

export function shouldDeliverSocialPush(followersCount: number): boolean {
  return followersCount < MAX_FOLLOWERS_FOR_SOCIAL_PUSH;
}

/**
 * Programa recordatorios locales (22:00 y 23:30) si aún no ha reflexionado hoy.
 * Llama al abrir la app cuando hasSentToday = false.
 */
export async function scheduleStreakReminder(): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  try {
    await cancelStreakReminder();

    const now = new Date();
    const at22 = new Date();
    at22.setHours(22, 0, 0, 0);
    const at2330 = new Date();
    at2330.setHours(23, 30, 0, 0);

    if (at22 > now) {
      const secondsUntil = Math.floor((at22.getTime() - now.getTime()) / 1000);
      await N.scheduleNotificationAsync({
        identifier: STREAK_REMINDER_2H_ID,
        content: {
          title: '🔥 Tu racha está en peligro',
          body: 'Te quedan 2 horas para reflexionar y mantener tu racha viva.',
          sound: true,
          vibrate: [0, 300, 200, 300],
        },
        trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntil },
      });
      console.log('[Push] Recordatorio racha (2 h) en', secondsUntil, 's.');
    }

    if (at2330 > now) {
      const secondsUntil = Math.floor((at2330.getTime() - now.getTime()) / 1000);
      await N.scheduleNotificationAsync({
        identifier: STREAK_REMINDER_30M_ID,
        content: {
          title: '🔥 Último aviso de racha',
          body: 'Te quedan 30 minutos para reflexionar y extender tu racha.',
          sound: true,
          vibrate: [0, 300, 200, 300],
        },
        trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntil },
      });
      console.log('[Push] Recordatorio racha (30 min) en', secondsUntil, 's.');
    }
  } catch (err) {
    console.error('[Push] Error programando recordatorio de racha:', err);
  }
}

/**
 * Cancela los recordatorios de racha (llama esto cuando el usuario reflexiona).
 */
export async function cancelStreakReminder(): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(STREAK_REMINDER_2H_ID);
  } catch {
    // Ignorar si no existe
  }
  try {
    await N.cancelScheduledNotificationAsync(STREAK_REMINDER_30M_ID);
  } catch {
    // Ignorar si no existe
  }
}
