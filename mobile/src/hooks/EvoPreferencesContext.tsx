/**
 * EvoPreferencesContext
 * ─────────────────────
 * Persisted user preferences for haptic feedback and sound effects.
 * Provides `playSound()` via a hidden Web Audio WebView (EvoAudioBridge).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import type WebView from 'react-native-webview';

// ─── Keys ────────────────────────────────────────────────────────────────────
const HAPTICS_KEY = '@evo/haptics_enabled';
const SOUNDS_KEY  = '@evo/sounds_enabled';

// ─── Types ───────────────────────────────────────────────────────────────────
export type EvoSoundName =
  | 'star-tap-1'   // 1st clan-reveal tap
  | 'star-tap-2'   // 2nd clan-reveal tap
  | 'star-tap-3'   // 3rd clan-reveal tap
  | 'star-shine'   // post-streak fire / post-clan reveal
  | 'star-soft';   // AI output / publish complete

export type EvoHapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

interface EvoPreferencesContextValue {
  hapticsEnabled:     boolean;
  soundsEnabled:      boolean;
  setHapticsEnabled:  (v: boolean) => void;
  setSoundsEnabled:   (v: boolean) => void;
  /** Fire a one-shot haptic if haptics are enabled. */
  triggerHaptic:      (type: EvoHapticType) => void;
  /** Play a synthesized star sparkle via the hidden audio WebView. */
  playSound:          (name: EvoSoundName) => void;
  /** Ref to the hidden audio WebView — set by EvoAudioBridge. */
  audioWebViewRef:    React.MutableRefObject<WebView | null>;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const EvoPreferencesContext = createContext<EvoPreferencesContextValue>({
  hapticsEnabled:    true,
  soundsEnabled:     true,
  setHapticsEnabled: () => {},
  setSoundsEnabled:  () => {},
  triggerHaptic:     () => {},
  playSound:         () => {},
  audioWebViewRef:   { current: null },
});

export function useEvoPreferences(): EvoPreferencesContextValue {
  return useContext(EvoPreferencesContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function EvoPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [hapticsEnabled, setHapticsState] = useState(true);
  const [soundsEnabled,  setSoundsState]  = useState(true);
  // Ref to the hidden EvoAudioBridge WebView — set via its own component
  const audioWebViewRef = useRef<WebView | null>(null);

  // Load persisted values on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(HAPTICS_KEY),
      AsyncStorage.getItem(SOUNDS_KEY),
    ]).then(([h, s]) => {
      if (h !== null) setHapticsState(h === 'true');
      if (s !== null) setSoundsState(s === 'true');
    }).catch(() => {});
  }, []);

  const setHapticsEnabled = useCallback((v: boolean) => {
    setHapticsState(v);
    AsyncStorage.setItem(HAPTICS_KEY, String(v)).catch(console.error);
  }, []);

  const setSoundsEnabled = useCallback((v: boolean) => {
    setSoundsState(v);
    AsyncStorage.setItem(SOUNDS_KEY, String(v)).catch(console.error);
  }, []);

  const triggerHaptic = useCallback((type: EvoHapticType) => {
    if (!hapticsEnabled) return;
    switch (type) {
      case 'light':   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);   break;
      case 'medium':  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);  break;
      case 'heavy':   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);   break;
      case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case 'warning': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break;
    }
  }, [hapticsEnabled]);

  const playSound = useCallback((name: EvoSoundName) => {
    if (!soundsEnabled) return;
    try {
      // Inject into the hidden audio WebView managed by EvoAudioBridge
      (audioWebViewRef.current as any)?.injectJavaScript?.(
        `if(window.playEvoSound)window.playEvoSound('${name}');true;`,
      );
    } catch {
      // Silently ignore — WebView may not be mounted yet
    }
  }, [soundsEnabled]);

  return (
    <EvoPreferencesContext.Provider
      value={{
        hapticsEnabled,
        soundsEnabled,
        setHapticsEnabled,
        setSoundsEnabled,
        triggerHaptic,
        playSound,
        audioWebViewRef,
      }}
    >
      {children}
    </EvoPreferencesContext.Provider>
  );
}
