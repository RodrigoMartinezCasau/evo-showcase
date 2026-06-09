import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../../mobile/lib/AuthContext';
import { useEntryAnimPlaying } from '../../../mobile/lib/animationState';
import { warmUpBackend } from '@evoconn/services/debateApi';
import {
  isVoiceAssistantHiddenPath,
  voiceAssistantBottomOffsetPx,
  VOICE_ASSISTANT_LAYOUT,
} from '@evoconn/constants/voiceAssistantLayout';
import { VoiceAssistantOrb } from './VoiceAssistantOrb';

/**
 * No mostrar el orbe hasta que termine la animación de entrada (evita el flash al abrir la app).
 */
function useVoiceAssistantChromeReady(): boolean {
  const entryAnimPlaying = useEntryAnimPlaying();
  const seenEntryAnimRef = useRef(false);
  const [chromeReady, setChromeReady] = useState(false);

  useEffect(() => {
    if (entryAnimPlaying) {
      seenEntryAnimRef.current = true;
      setChromeReady(false);
      return;
    }
    if (!seenEntryAnimRef.current) {
      const waitForEntry = setTimeout(() => setChromeReady(true), 2200);
      return () => clearTimeout(waitForEntry);
    }
    const t = setTimeout(() => setChromeReady(true), 400);
    return () => clearTimeout(t);
  }, [entryAnimPlaying]);

  return chromeReady;
}

/**
 * Capa global del asistente de voz: orbe flotante sobre la barra inferior.
 */
export function VoiceAssistantLayer() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { session, loading } = useAuth();
  const chromeReady = useVoiceAssistantChromeReady();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const visible =
    !!session &&
    !loading &&
    chromeReady &&
    !keyboardOpen &&
    !isVoiceAssistantHiddenPath(pathname);

  useEffect(() => {
    if (!visible) return;
    void warmUpBackend();
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.layer,
        {
          bottom: voiceAssistantBottomOffsetPx(insets.bottom),
          right: VOICE_ASSISTANT_LAYOUT.ORB_RIGHT_OFFSET,
        },
      ]}
    >
      <VoiceAssistantOrb enabled={visible} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    zIndex: 120,
  },
});
