/**
 * EvoPreferencesContext
 * ─────────────────────
 * Persisted user preferences for haptic feedback.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const HAPTICS_KEY = '@evo/haptics_enabled';

export type EvoHapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

interface EvoPreferencesContextValue {
  hapticsEnabled: boolean;
  setHapticsEnabled: (v: boolean) => void;
  triggerHaptic: (type: EvoHapticType) => void;
}

const EvoPreferencesContext = createContext<EvoPreferencesContextValue>({
  hapticsEnabled: true,
  setHapticsEnabled: () => {},
  triggerHaptic: () => {},
});

export function useEvoPreferences(): EvoPreferencesContextValue {
  return useContext(EvoPreferencesContext);
}

export function EvoPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [hapticsEnabled, setHapticsState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(HAPTICS_KEY)
      .then((h) => {
        if (h !== null) setHapticsState(h === 'true');
      })
      .catch(() => {});
  }, []);

  const setHapticsEnabled = useCallback((v: boolean) => {
    setHapticsState(v);
    AsyncStorage.setItem(HAPTICS_KEY, String(v)).catch(console.error);
  }, []);

  const triggerHaptic = useCallback(
    (type: EvoHapticType) => {
      if (!hapticsEnabled) return;
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    },
    [hapticsEnabled],
  );

  return (
    <EvoPreferencesContext.Provider
      value={{
        hapticsEnabled,
        setHapticsEnabled,
        triggerHaptic,
      }}
    >
      {children}
    </EvoPreferencesContext.Provider>
  );
}
