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

// ─── In __DEV__ (simulator / Expo Go) always use simulation ──────────────────
// The iOS Simulator does not support Speech Recognition and the native module
// hangs forever if called there. Force the simulation path in dev mode so the
// UX works correctly during development.
const FORCE_SIMULATION = __DEV__;

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

export function useVoiceInput({ onTranscriptReady }: Options): UseVoiceInputResult {
  const [voiceState, setVoiceState]   = useState<VoiceState>('idle');
  const [interimText, setInterimText] = useState('');
  const [elapsedSeconds, setElapsed]  = useState(0);
  const [volumeLevel, setVolume]      = useState(0);

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const volumeRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenersRef = useRef<Array<{ remove: () => void }>>([]);
  const cancelledRef = useRef(false);
  const simStopRef   = useRef<(() => void) | null>(null);

  // ── cleanup ───────────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (volumeRef.current) { clearInterval(volumeRef.current); volumeRef.current = null; }
  }, []);

  const removeListeners = useCallback(() => {
    listenersRef.current.forEach((l) => l.remove());
    listenersRef.current = [];
  }, []);

  useEffect(() => () => { clearTimers(); removeListeners(); }, [clearTimers, removeListeners]);

  const startAnimations = useCallback(() => {
    setElapsed(0);
    timerRef.current  = setInterval(() => setElapsed((s) => s + 1), 1000);
    volumeRef.current = setInterval(() => setVolume(Math.random()), 140);
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
          // Keep updating the best known transcript so stopRecording works too.
          if (text) finalTranscriptRef.current = text;
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
          onTranscriptReady(transcript);
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

    speechModule.start({ lang: 'es-ES', interimResults: true, continuous: false });
  }, [startAnimations, clearTimers, removeListeners, onTranscriptReady]);

  const stopNative = useCallback(() => {
    speechModule?.stop();
    clearTimers(); setVolume(0);
    setVoiceState('transcribing');
  }, [clearTimers]);

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

    const autoStopTimer = setTimeout(() => simStopRef.current?.(), 30_000);

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
        if (!cancelledRef.current) onTranscriptReady(nextSimPhrase());
        setVoiceState('idle'); setInterimText('');
      }, 700);
    };
  }, [startAnimations, clearTimers, onTranscriptReady]);

  const stopSimulation  = useCallback(() => simStopRef.current?.(), []);
  const cancelSimulation = useCallback(() => {
    cancelledRef.current = true;
    simStopRef.current?.();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  const useNative = !FORCE_SIMULATION && speechModule !== null;

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
    isAvailable: true,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
