/**
 * Registra el puente de configuración del agente con los stores reales de Evo.
 * Montar una sola vez bajo AuthProvider y VoiceAssistantPreferencesProvider
 * (VoiceAssistantLayer).
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { useAuth } from '../../../mobile/lib/AuthContext';
import { useVoiceAssistantPreferences } from '@evoconn/hooks/VoiceAssistantPreferencesContext';
import { normalizeVoiceAssistantVoiceId } from '@evoconn/constants/voiceAssistantVoices';
import { isRealUserId, setProfilePrivate } from '@evoconn/services/supabaseSocial';
import {
  setAgentConfigBridge,
  type AgentConfigBridge,
  type NotificationsPermission,
} from './configBridge';

/** Misma clave que Ajustes (SettingsScreen) y pushNotifications.ts. */
const NOTIFS_KEY = '@evo/notifications_enabled';

// expo-notifications no existe en Expo Go (SDK 53+): require protegido,
// idéntico al patrón de services/pushNotifications.ts.
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

async function ensureSystemPermission(): Promise<NotificationsPermission> {
  const N = getNotificationsModule();
  if (!N) return 'unavailable';
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
    if (perms.status === 'granted') return 'granted';
    const canAskAgain = (perms as { canAskAgain?: boolean }).canAskAgain ?? true;
    if (!canAskAgain) return 'denied';
    const { status } = await N.requestPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export function useRegisterAgentConfig(): void {
  const { profile, refreshProfile } = useAuth();
  const { voiceId, setVoiceId } = useVoiceAssistantPreferences();

  // El puente lee siempre la versión más reciente vía ref (las funciones y el
  // perfil cambian de identidad entre renders).
  const stateRef = useRef({ profile, refreshProfile, voiceId, setVoiceId });
  stateRef.current = { profile, refreshProfile, voiceId, setVoiceId };

  useEffect(() => {
    const bridge: AgentConfigBridge = {
      getIsPrivate: () => {
        const p = stateRef.current.profile;
        if (!p?.id) return null;
        return Boolean(p.is_private);
      },
      setAccountPrivacy: async (isPrivate) => {
        const p = stateRef.current.profile;
        if (!p?.id || !isRealUserId(p.id)) return false;
        const ok = await setProfilePrivate(p.id, isPrivate);
        if (ok) await stateRef.current.refreshProfile();
        return ok;
      },
      getAssistantVoice: () => stateRef.current.voiceId,
      setAssistantVoice: (id) => {
        stateRef.current.setVoiceId(normalizeVoiceAssistantVoiceId(id));
      },
      getNotificationsEnabled: async () => {
        try {
          const val = await AsyncStorage.getItem(NOTIFS_KEY);
          // Default true cuando no hay valor — mismo criterio que pushNotifications.ts.
          return val === null || val === 'true';
        } catch {
          return true;
        }
      },
      setNotificationsEnabled: async (enabled) => {
        await AsyncStorage.setItem(NOTIFS_KEY, String(enabled));
      },
      ensureNotificationsSystemPermission: ensureSystemPermission,
    };
    setAgentConfigBridge(bridge);
    return () => setAgentConfigBridge(null);
  }, []);
}
