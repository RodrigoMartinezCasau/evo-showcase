/**
 * useVoiceInput.ts
 * ================
 * Hook de transcripción de voz.
 *
 * • Con build nativo (expo-speech-recognition linkeado):
 *     → transcripción real en tiempo real (es-ES)
 *     → waveform reactiva al volumen real
 *
 * • Sin build nativo (Expo Go / dev-client sin el plugin):
 *     → modo simulación: graba animación real de timer + waveform aleatoria,
 *       al parar inserta una frase de ejemplo
 *     → NO crashea: usa requireOptionalNativeModule de expo
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
// requireOptionalNativeModule returns null if the native module is not linked,
// instead of throwing an uncaught native exception like require() would.
import { requireOptionalNativeModule } from 'expo';
import * as Device from 'expo-device';
import { messageLimitReached, truncateTranscriptToFit } from '@evoconn/utils/messageWordLimit';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

type Options = {
  onTranscriptReady: (text: string) => void;
  /** Texto ya escrito antes de la transcripción (para respetar límite de palabras). */
  getCurrentText?: () => string;
  maxWords?: number;
  maxChars?: number;
  /** Grabación continua hasta stopRecording (asistente: pulsar para parar). */
  holdToTalk?: boolean;
  /** Corta la grabación automáticamente tras N segundos (asistente: 60). */
  maxRecordingSeconds?: number;
  /**
   * En simulador / sin micrófono: no inventar frases de prueba.
   * El asistente de voz debe usar esto para no mandar texto falso al LLM.
   */
  blockSimulatedTranscript?: boolean;
  onSimulatedTranscriptBlocked?: () => void;
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

// Simulador: sin Speech Recognition fiable. Dispositivo físico: STT nativo aunque sea __DEV__.
const FORCE_SIMULATION = __DEV__ && !Device.isDevice;

// ─── Native module (null when not linked) ─────────────────────────────────────

type SpeechModule = {
  start: (opts: object) => void;
  stop: () => void;
  abort: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (event: string, cb: (e: unknown) => void) => { remove: () => void };
};

// Evaluated once at module load — safe even if native module is absent.
const speechModule = requireOptionalNativeModule<SpeechModule>('ExpoSpeechRecognition');

/** STT nativo (expo-speech-recognition linkeado). No existe en Expo Go. */
export const hasNativeSpeechRecognition =
  !FORCE_SIMULATION && speechModule !== null;

/** Mensaje cuando no hay STT real (simulador o Expo Go en iPhone). */
export function speechRecognitionUnavailableMessage(): string | null {
  if (hasNativeSpeechRecognition) return null;
  if (__DEV__ && !Device.isDevice) {
    return (
      'En el simulador no hay micrófono real: no se envía tu voz al asistente. ' +
      'Prueba en un iPhone con la app instalada vía npx expo run:ios --device.'
    );
  }
  return (
    'El micrófono del asistente no funciona en Expo Go: falta el módulo nativo de voz.\n\n' +
    'Conecta el iPhone al Mac y ejecuta:\n' +
    'cd mobile/mobile\n' +
    'npx expo run:ios --device\n\n' +
    'Deja el backend en marcha en el Mac (uvicorn … --host 0.0.0.0).'
  );
}

// ─── Simulation fallback phrases ──────────────────────────────────────────────

const SIM_PHRASES = [
  'La filosofía comienza donde acaba la certeza',
  'El hombre es la medida de todas las cosas',
  'Pensar es resistir el vacío que nos rodea',
  'La libertad no es un don, es una conquista',
  'Solo sé que no sé nada, y eso me basta',
  'El dolor tiene su propio silencio interior',
  'La conciencia es el espejo del alma humana',
];
let _simIdx = 0;
function nextSimPhrase() {
  return SIM_PHRASES[_simIdx++ % SIM_PHRASES.length]!;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceInput({
  onTranscriptReady,
  getCurrentText,
  maxWords,
  maxChars,
  holdToTalk = false,
  maxRecordingSeconds,
  blockSimulatedTranscript = false,
  onSimulatedTranscriptBlocked,
}: Options): UseVoiceInputResult {
  const [voiceState, setVoiceState]   = useState<VoiceState>('idle');
  const [interimText, setInterimText] = useState('');
  const [elapsedSeconds, setElapsed]  = useState(0);
  const [volumeLevel, setVolume]      = useState(0);

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const volumeRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenersRef = useRef<Array<{ remove: () => void }>>([]);
  const cancelledRef = useRef(false);
  const simStopRef   = useRef<(() => void) | null>(null);
  const stopNativeRef  = useRef<(() => void) | null>(null);

  const wordLimitReached = useCallback(
    (candidateTranscript: string) => {
      if (!getCurrentText) return false;
      const base = getCurrentText().trim();
      const merged = base
        ? `${base} ${candidateTranscript.trim()}`
        : candidateTranscript.trim();
      return messageLimitReached(merged, maxWords, maxChars);
    },
    [getCurrentText, maxWords, maxChars],
  );

  // ── cleanup ───────────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (volumeRef.current) { clearInterval(volumeRef.current); volumeRef.current = null; }
    if (maxDurationRef.current) { clearTimeout(maxDurationRef.current); maxDurationRef.current = null; }
  }, []);

  const scheduleMaxDurationStop = useCallback(() => {
    if (!maxRecordingSeconds || maxRecordingSeconds <= 0) return;
    maxDurationRef.current = setTimeout(() => {
      maxDurationRef.current = null;
      stopNativeRef.current?.();
      simStopRef.current?.();
    }, maxRecordingSeconds * 1000);
  }, [maxRecordingSeconds]);

  const removeListeners = useCallback(() => {
    listenersRef.current.forEach((l) => l.remove());
    listenersRef.current = [];
  }, []);

  useEffect(() => () => { clearTimers(); removeListeners(); }, [clearTimers, removeListeners]);

  const startAnimations = useCallback(() => {
    setElapsed(0);
    timerRef.current  = setInterval(() => setElapsed((s) => s + 1), 1000);
    // Volumen constante mientras se graba: la waveform genera su propio ruido
    // internamente (hilo de UI). El setInterval anterior con Math.random() cada
    // 140 ms re-renderizaba todo el árbol del orbe a 7 Hz y lageaba las
    // pantallas pesadas (Para ti / Siguiendo / Notificaciones).
    setVolume(0.85);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // NATIVE PATH
  // ═══════════════════════════════════════════════════════════════════════════

  // Stores the best transcript captured so far from isFinal result events.
  const finalTranscriptRef = useRef('');

  const startNative = useCallback(async () => {
    if (!speechModule) return;

    const { granted } = await speechModule
      .requestPermissionsAsync()
      .catch(() => ({ granted: false }));

    if (!granted) {
      Alert.alert(
        'Permiso denegado',
        'Necesitas dar permiso al micrófono para usar esta función.',
      );
      return;
    }

    cancelledRef.current = false;
    finalTranscriptRef.current = '';
    setVoiceState('recording');
    setInterimText('');
    startAnimations();
    scheduleMaxDurationStop();

    // Capture interim text AND the final transcript from the result event.
    // expo-speech-recognition does NOT emit a separate 'finalresult' event —
    // the final result arrives as a result with isFinal: true.
    listenersRef.current.push(
      speechModule.addListener('result', (e: unknown) => {
        const ev = e as { results?: Array<{ transcript?: string; isFinal?: boolean }> };
        const r = ev.results?.[0];
        if (!r) return;
        const text = r.transcript ?? '';
        if (r.isFinal) {
          finalTranscriptRef.current = text;
          setInterimText('');
        } else {
          setInterimText(text);
          if (text) finalTranscriptRef.current = text;
        }
        if (wordLimitReached(text)) {
          stopNativeRef.current?.();
        }
      }),
    );

    // Recognition ended — deliver whatever transcript we captured.
    listenersRef.current.push(
      speechModule.addListener('end', (_e: unknown) => {
        clearTimers(); setVolume(0);
        removeListeners();
        if (cancelledRef.current) {
          setVoiceState('idle'); setInterimText('');
          return;
        }
        const transcript = finalTranscriptRef.current;
        finalTranscriptRef.current = '';
        if (transcript) {
          const base = getCurrentText?.() ?? '';
          const slice = truncateTranscriptToFit(base, transcript, maxWords, maxChars);
          if (slice) onTranscriptReady(slice);
        }
        setInterimText('');
        setVoiceState('idle');
      }),
    );

    listenersRef.current.push(
      speechModule.addListener('error', (_e: unknown) => {
        clearTimers(); removeListeners();
        setVoiceState('idle'); setInterimText(''); setVolume(0);
        finalTranscriptRef.current = '';
      }),
    );

    speechModule.start({
      lang: 'es-ES',
      interimResults: true,
      continuous: holdToTalk,
    });
  }, [startAnimations, scheduleMaxDurationStop, clearTimers, removeListeners, onTranscriptReady, getCurrentText, maxWords, maxChars, wordLimitReached, holdToTalk]);

  const stopNative = useCallback(() => {
    speechModule?.stop();
    clearTimers(); setVolume(0);
    setVoiceState('transcribing');
  }, [clearTimers]);

  stopNativeRef.current = stopNative;

  const cancelNative = useCallback(() => {
    cancelledRef.current = true;
    speechModule?.abort();
    clearTimers(); removeListeners();
    setVoiceState('idle'); setInterimText(''); setVolume(0);
  }, [clearTimers, removeListeners]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMULATION PATH  (no native module available)
  // ═══════════════════════════════════════════════════════════════════════════

  const startSimulation = useCallback(() => {
    cancelledRef.current = false;
    setVoiceState('recording');
    setInterimText('');
    startAnimations();
    scheduleMaxDurationStop();

    const simMaxMs = (maxRecordingSeconds && maxRecordingSeconds > 0 ? maxRecordingSeconds : 30) * 1000;
    const autoStopTimer = setTimeout(() => simStopRef.current?.(), simMaxMs);

    simStopRef.current = () => {
      clearTimeout(autoStopTimer);
      simStopRef.current = null;
      if (cancelledRef.current) {
        clearTimers(); setVolume(0);
        setVoiceState('idle');
        return;
      }
      clearTimers(); setVolume(0);
      setVoiceState('transcribing');
      setTimeout(() => {
        if (!cancelledRef.current) {
          if (blockSimulatedTranscript) {
            onSimulatedTranscriptBlocked?.();
          } else {
            const base = getCurrentText?.() ?? '';
            const phrase = nextSimPhrase();
            const slice = truncateTranscriptToFit(base, phrase, maxWords, maxChars);
            if (slice) onTranscriptReady(slice);
          }
        }
        setVoiceState('idle'); setInterimText('');
      }, 700);
    };
  }, [
    startAnimations,
    clearTimers,
    onTranscriptReady,
    getCurrentText,
    maxWords,
    maxChars,
    blockSimulatedTranscript,
    onSimulatedTranscriptBlocked,
    scheduleMaxDurationStop,
    maxRecordingSeconds,
  ]);

  const stopSimulation  = useCallback(() => simStopRef.current?.(), []);
  const cancelSimulation = useCallback(() => {
    cancelledRef.current = true;
    simStopRef.current?.();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  const useNative = hasNativeSpeechRecognition;

  const startRecording = useCallback(async () => {
    if (useNative) { await startNative(); }
    else           { startSimulation(); }
  }, [useNative, startNative, startSimulation]);

  const stopRecording = useCallback(() => {
    if (useNative) stopNative();
    else           stopSimulation();
  }, [useNative, stopNative, stopSimulation]);

  const cancelRecording = useCallback(() => {
    if (useNative) cancelNative();
    else           cancelSimulation();
  }, [useNative, cancelNative, cancelSimulation]);

  return {
    voiceState,
    interimText,
    elapsedSeconds,
    volumeLevel,
    isAvailable: useNative,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
