/**
 * Push Notifications — registro de token y mostrar notificaciones locales.
 *
 * Flujo:
 * 1. Al iniciar sesión, registramos el Expo Push Token del dispositivo en Supabase (profiles.push_token).
 * 2. Cuando llega una notificación por Realtime (NotificationsContext), mostramos una notificación
 *    local nativa con sonido y vibración usando expo-notifications.
 * 3. Para notificaciones push reales entre dispositivos, el token se usa desde el backend/Edge Functions.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../mobile/lib/supabase';

const NOTIFS_KEY = '@evo/notifications_enabled';

async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(NOTIFS_KEY);
    // Default to true if not set
    return val === null || val === 'true';
  } catch {
    return true;
  }
}

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Solicita permisos y registra el push token en Supabase para este dispositivo. */
export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'EVO',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C7FF02',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permisos de notificación denegados.');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '160e255b-b9ca-4948-ad82-88a29a5a2633',
    });

    const token = tokenData.data;
    console.log('[Push] Token registrado:', token);

    // Guardar el token en Supabase para poder enviar push remotos.
    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);
  } catch (err) {
    console.error('[Push] Error registrando token:', err);
  }
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
  try {
    const enabled = await areNotificationsEnabled();
    if (!enabled) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // Inmediata
    });
  } catch (err) {
    console.error('[Push] Error mostrando notificación local:', err);
  }
}

// ─── Recordatorio de racha ────────────────────────────────────────────────────

const STREAK_REMINDER_ID = 'evo_streak_reminder';

/**
 * Programa un recordatorio diario a las 22:00 si el usuario no ha reflexionado.
 * Llama esto al abrir la app cuando hasSentToday = false.
 */
export async function scheduleStreakReminder(): Promise<void> {
  try {
    // Cancela cualquier recordatorio previo para no duplicar.
    await cancelStreakReminder();

    // Calcula cuántos segundos faltan para las 22:00 de hoy.
    const now = new Date();
    const target = new Date();
    target.setHours(22, 0, 0, 0);

    // Si ya pasaron las 22:00, no programar (el usuario tiene hasta medianoche).
    if (target <= now) return;

    const secondsUntil = Math.floor((target.getTime() - now.getTime()) / 1000);

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_REMINDER_ID,
      content: {
        title: '🔥 Tu racha está en peligro',
        body: 'Te quedan 2 horas para reflexionar y mantener tu racha viva.',
        sound: true,
        vibrate: [0, 300, 200, 300],
      },
      trigger: { seconds: secondsUntil },
    });
    console.log('[Push] Recordatorio de racha programado en', secondsUntil, 'segundos.');
  } catch (err) {
    console.error('[Push] Error programando recordatorio de racha:', err);
  }
}

/**
 * Cancela el recordatorio de racha (llama esto cuando el usuario reflexiona).
 */
export async function cancelStreakReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID);
  } catch {
    // Ignorar si no existe
  }
}
