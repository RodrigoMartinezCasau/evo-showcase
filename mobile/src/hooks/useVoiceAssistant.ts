/**
 * Orquesta hold-to-talk → STT → ChatGPT (backend) → reproducción TTS.
 *
 * Flujo:
 *   1. Pulsar el orbe → grabación + waveform (máx. 60 s)
 *   2. Volver a pulsar → transcripción (sin mostrar texto)
 *   3. Spinner → POST /assistant/chat (consume 1 uso IA, no racha)
 *   4. Reproducir respuesta por voz (OpenAI TTS)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useDebugStats } from '@evoconn/debug/DebugStatsContext';
import { useDailyUsesGate } from '@evoconn/hooks/useDailyUsesGate';
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import {
  hasNativeSpeechRecognition,
  speechRecognitionUnavailableMessage,
  useVoiceInput,
} from '@evoconn/hooks/useVoiceInput';
import { useVoiceAssistantPreferences } from '@evoconn/hooks/VoiceAssistantPreferencesContext';
import { useVoiceAssistantScreenContextReader } from '@evoconn/hooks/VoiceAssistantScreenContext';
import { sendVoiceAssistantTurn } from '@evoconn/services/voiceAssistantApi';
import { showOutOfUsesAlert } from '@evoconn/utils/dailyUsesGate';

export type VoiceAssistantPhase = 'idle' | 'listening' | 'thinking' | 'speaking';

const MAX_LISTENING_SECONDS = 60;

type Options = {
  enabled?: boolean;
};

async function ensurePlaybackAudioMode(): Promise<void> {
  try {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
  } catch {
    /* noop */
  }
}

async function waitForPlayerLoaded(player: AudioPlayer, timeoutMs = 12_000): Promise<void> {
  if (player.isLoaded) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new Error('audio_load_timeout'));
    }, timeoutMs);
    const sub = player.addListener('playbackStatusUpdate', (status: { isLoaded: boolean }) => {
      if (!status.isLoaded) return;
      clearTimeout(timer);
      sub.remove();
      resolve();
    });
  });
}

async function waitForPlaybackToFinish(player: AudioPlayer, maxMs = 90_000): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (player.playing) break;
    await new Promise((r) => setTimeout(r, 40));
  }
  while (player.playing && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 80));
  }
}

function showAssistantError(message: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[VoiceAssistant]', message);
  }
  Alert.alert('Asistente de voz', message);
}

export function useVoiceAssistant({ enabled = true }: Options = {}) {
  const { voiceId } = useVoiceAssistantPreferences();
  const getScreenContextText = useVoiceAssistantScreenContextReader();
  const { decrementUses } = useDebugStats();
  const { blockIfNoUses } = useDailyUsesGate();
  const [phase, setPhase] = useState<VoiceAssistantPhase>('idle');
  const phaseRef = useRef<VoiceAssistantPhase>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const speechEndResolverRef = useRef<(() => void) | null>(null);
  const awaitingTranscriptRef = useRef(false);
  const pendingEndRef = useRef(false);

  const setPhaseSafe = useCallback((next: VoiceAssistantPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const disposePlayer = useCallback(() => {
    const p = playerRef.current;
    playerRef.current = null;
    if (!p) return;
    try {
      p.pause();
      p.remove();
    } catch {
      /* noop */
    }
  }, []);

  const stopSpeech = useCallback(() => {
    Speech.stop();
    speechEndResolverRef.current?.();
    speechEndResolverRef.current = null;
    disposePlayer();
  }, [disposePlayer]);

  const speakWithDeviceTts = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        speechEndResolverRef.current = resolve;
        // Solo si falla el MP3 de OpenAI. Suena a Siri/Animal Crossing — evitar en flujo normal.
        Speech.speak(text, {
          language: 'es-ES',
          rate: 0.88,
          pitch: 0.92,
          onDone: () => {
            speechEndResolverRef.current = null;
            resolve();
          },
          onStopped: () => {
            speechEndResolverRef.current = null;
            resolve();
          },
          onError: () => {
            speechEndResolverRef.current = null;
            resolve();
          },
        });
      }),
    [],
  );

  const speakReply = useCallback(
    async (reply: string, audioBase64?: string | null) => {
      if (!reply.trim()) {
        setPhaseSafe('idle');
        return;
      }

      setPhaseSafe('speaking');
      stopSpeech();
      await ensurePlaybackAudioMode();

      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[VoiceAssistant] reply:', reply.slice(0, 120));
      }

      if (audioBase64?.length) {
        try {
          const uri = `${FileSystem.cacheDirectory}evo-assistant-${Date.now()}.mp3`;
          await FileSystem.writeAsStringAsync(uri, audioBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const player = createAudioPlayer(null, { keepAudioSessionActive: true });
          playerRef.current = player;
          player.replace(uri);
          await waitForPlayerLoaded(player);
          if (phaseRef.current !== 'speaking') return;
          player.play();
          await waitForPlaybackToFinish(player);
          disposePlayer();
          if (phaseRef.current === 'speaking') setPhaseSafe('idle');
          return;
        } catch (e) {
          disposePlayer();
          if (__DEV__) console.warn('[VoiceAssistant] OpenAI TTS playback failed, fallback:', e);
        }
      }

      await speakWithDeviceTts(reply);
      if (phaseRef.current === 'speaking') setPhaseSafe('idle');
    },
    [disposePlayer, setPhaseSafe, speakWithDeviceTts, stopSpeech],
  );

  const handleTranscript = useCallback(
    async (text: string) => {
      awaitingTranscriptRef.current = false;
      const msg = text.trim();
      if (!msg || !enabled) {
        setPhaseSafe('idle');
        return;
      }

      setPhaseSafe('thinking');
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { reply, audio_base64 } = await sendVoiceAssistantTurn(msg, {
          signal: controller.signal,
          voice: voiceId,
          screenContext: getScreenContextText() ?? undefined,
        });
        if (controller.signal.aborted) return;
        if (!reply.trim()) {
          showAssistantError('No he recibido respuesta del asistente.');
          setPhaseSafe('idle');
          return;
        }
        decrementUses();
        await speakReply(reply, audio_base64);
      } catch (e) {
        if (controller.signal.aborted) return;
        const errMsg = e instanceof Error ? e.message : 'Error desconocido';
        if (errMsg.includes('sin usos') || errMsg.toLowerCase().includes('quota')) {
          showOutOfUsesAlert();
        } else if (
          errMsg.includes('conexión') ||
          errMsg.includes('conectar') ||
          errMsg.includes('internet') ||
          errMsg.includes('Network') ||
          errMsg.includes('fetch')
        ) {
          showAssistantError('Sin conexión con el servidor. Comprueba tu internet e inténtalo de nuevo.');
        } else {
          showAssistantError(errMsg);
        }
        setPhaseSafe('idle');
      }
    },
    [decrementUses, enabled, getScreenContextText, setPhaseSafe, speakReply, voiceId],
  );

  const onSimulatedTranscriptBlocked = useCallback(() => {
    awaitingTranscriptRef.current = false;
    setPhaseSafe('idle');
    showAssistantError(
      speechRecognitionUnavailableMessage() ??
        'No hay reconocimiento de voz disponible en este entorno.',
    );
  }, [setPhaseSafe]);

  const handleTranscriptRef = useRef(handleTranscript);
  useEffect(() => {
    handleTranscriptRef.current = handleTranscript;
  }, [handleTranscript]);

  const onTranscriptReady = useCallback((text: string) => {
    void handleTranscriptRef.current(text);
  }, []);

  const {
    voiceState,
    volumeLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceInput({
    onTranscriptReady,
    holdToTalk: true,
    maxRecordingSeconds: MAX_LISTENING_SECONDS,
    blockSimulatedTranscript: true,
    onSimulatedTranscriptBlocked,
  });

  const voiceStateRef = useRef(voiceState);
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  const requestStopRecording = useCallback(() => {
    awaitingTranscriptRef.current = true;
    setPhaseSafe('thinking');
    stopRecording();
  }, [setPhaseSafe, stopRecording]);

  const beginListening = useCallback(async () => {
    if (!enabled) return;
    if (blockIfNoUses()) return;
    if (!hasNativeSpeechRecognition) {
      showAssistantError(
        speechRecognitionUnavailableMessage() ??
          'No hay reconocimiento de voz disponible en este entorno.',
      );
      return;
    }
    if (phaseRef.current === 'thinking') return;
    if (phaseRef.current === 'speaking') {
      stopSpeech();
      setPhaseSafe('idle');
    }
    pendingEndRef.current = false;
    awaitingTranscriptRef.current = false;
    abortRef.current?.abort();
    setPhaseSafe('listening');
    await startRecording();
  }, [blockIfNoUses, enabled, setPhaseSafe, startRecording, stopSpeech]);

  const endListening = useCallback(() => {
    if (phaseRef.current !== 'listening') return;
    if (voiceStateRef.current === 'recording' || voiceStateRef.current === 'transcribing') {
      requestStopRecording();
      return;
    }
    pendingEndRef.current = true;
  }, [requestStopRecording]);

  useEffect(() => {
    if (!pendingEndRef.current) return;
    if (voiceStateRef.current === 'recording' || voiceStateRef.current === 'transcribing') {
      pendingEndRef.current = false;
      requestStopRecording();
    }
  }, [voiceState, requestStopRecording]);

  useEffect(() => {
    if (awaitingTranscriptRef.current) return;
    if (phaseRef.current !== 'listening') return;
    if (voiceState !== 'idle') return;
    setPhaseSafe('idle');
  }, [voiceState, setPhaseSafe]);

  useEffect(() => {
    if (!awaitingTranscriptRef.current) return;
    if (voiceState !== 'idle') return;
    const t = setTimeout(() => {
      if (!awaitingTranscriptRef.current) return;
      awaitingTranscriptRef.current = false;
      if (phaseRef.current === 'thinking') {
        showAssistantError('No se ha entendido lo que dijiste. Pulsa el botón y habla un poco más.');
        setPhaseSafe('idle');
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [voiceState, setPhaseSafe]);

  const cancelAll = useCallback(() => {
    pendingEndRef.current = false;
    awaitingTranscriptRef.current = false;
    abortRef.current?.abort();
    cancelRecording();
    stopSpeech();
    setPhaseSafe('idle');
  }, [cancelRecording, setPhaseSafe, stopSpeech]);

  useEffect(() => () => {
    pendingEndRef.current = false;
    awaitingTranscriptRef.current = false;
    abortRef.current?.abort();
    cancelRecording();
    stopSpeech();
  }, [cancelRecording, stopSpeech]);

  const isListening = phase === 'listening' && (voiceState === 'recording' || voiceState === 'transcribing');
  const showWaveform = phase === 'listening' && voiceState === 'recording';
  const showThinking = phase === 'thinking' || (phase === 'listening' && voiceState === 'transcribing');

  const toggleListening = useCallback(async () => {
    if (!enabled || showThinking) return;
    if (phaseRef.current === 'listening') {
      endListening();
      return;
    }
    if (phaseRef.current === 'speaking') {
      stopSpeech();
    }
    await beginListening();
  }, [beginListening, enabled, endListening, showThinking, stopSpeech]);

  return {
    phase,
    isListening,
    showWaveform,
    showThinking,
    volumeLevel,
    toggleListening,
    cancelAll,
    isBusy: showThinking || phase === 'speaking',
  };
}
