import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  VOICE_ASSISTANT_DEFAULT_VOICE,
  normalizeVoiceAssistantVoiceId,
  type VoiceAssistantVoiceId,
} from '@evoconn/constants/voiceAssistantVoices';

const STORAGE_KEY = '@evo/voice_assistant_tts_voice';

type VoiceAssistantPreferencesValue = {
  voiceId: VoiceAssistantVoiceId;
  setVoiceId: (id: VoiceAssistantVoiceId) => void;
  ready: boolean;
};

const VoiceAssistantPreferencesContext = createContext<VoiceAssistantPreferencesValue>({
  voiceId: VOICE_ASSISTANT_DEFAULT_VOICE,
  setVoiceId: () => {},
  ready: false,
});

export function VoiceAssistantPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [voiceId, setVoiceIdState] = useState<VoiceAssistantVoiceId>(VOICE_ASSISTANT_DEFAULT_VOICE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setVoiceIdState(normalizeVoiceAssistantVoiceId(raw));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setVoiceId = useCallback((id: VoiceAssistantVoiceId) => {
    const norm = normalizeVoiceAssistantVoiceId(id);
    setVoiceIdState(norm);
    AsyncStorage.setItem(STORAGE_KEY, norm).catch(console.error);
  }, []);

  const value = useMemo(
    () => ({ voiceId, setVoiceId, ready }),
    [voiceId, setVoiceId, ready],
  );

  return (
    <VoiceAssistantPreferencesContext.Provider value={value}>
      {children}
    </VoiceAssistantPreferencesContext.Provider>
  );
}

export function useVoiceAssistantPreferences(): VoiceAssistantPreferencesValue {
  return useContext(VoiceAssistantPreferencesContext);
}
