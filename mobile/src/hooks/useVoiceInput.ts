/**
 * useVoiceInput.ts
 * ================
 * STUB — la transcripción de voz está temporalmente desactivada.
 *
 * El módulo `expo-speech-recognition` requiere un build nativo correcto y
 * estaba rompiendo Metro. Cuando volvamos a integrarlo, restaurar este hook.
 *
 * Mantiene la API original (mismas props/return) para no romper consumers.
 */
import { useCallback } from 'react';
import { Alert } from 'react-native';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

type Options = {
  onTranscriptReady: (text: string) => void;
};

export type UseVoiceInputResult = {
  voiceState: VoiceState;
  interimText: string;
  elapsedSeconds: number;
  volumeLevel: number;
  isAvailable: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
};

export function useVoiceInput(_opts: Options): UseVoiceInputResult {
  const startRecording = useCallback(async () => {
    Alert.alert(
      'Próximamente',
      'La transcripción por voz se activará en una próxima versión.',
    );
  }, []);

  const noop = useCallback(() => {}, []);

  return {
    voiceState: 'idle',
    interimText: '',
    elapsedSeconds: 0,
    volumeLevel: 0,
    isAvailable: false,
    startRecording,
    stopRecording: noop,
    cancelRecording: noop,
  };
}
