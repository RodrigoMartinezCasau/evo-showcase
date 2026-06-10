/**
 * Orquesta hold-to-talk → STT → ChatGPT (backend) → reproducción TTS.
 *
 * Flujo:
 *   1. Pulsar el orbe → grabación + waveform (máx. 60 s)
 *   2. Volver a pulsar → transcripción (sin mostrar texto)
 *   3. Spinner → POST /assistant/chat (consume 1 uso IA, no racha)
 *   4. Si el backend devuelve una acción de navegación → ActionExecutor
 *   5. Reproducir respuesta por voz (OpenAI TTS)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { usePathname } from 'expo-router';
import {
  ActionExecutor,
  combineContexts,
  evoManifest,
  grantAssistantConsent,
  hasConsentedToAssistant,
  logAgentEvent,
  sanitizeForLLM,
  type AgentAction,
  type AgentScreenContext,
} from '@evoconn/agent';
import { useDebugStats } from '@evoconn/debug/DebugStatsContext';
import { useDailyUsesGate } from '@evoconn/hooks/useDailyUsesGate';
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import {
  hasNativeSpeechRecognition,
  speechRecognitionUnavailableMessage,
  useVoiceInput,
} from '@evoconn/hooks/useVoiceInput';
import { useClassification } from '@evoconn/hooks/ClassificationContext';
import { useQuotes } from '@evoconn/hooks/QuotesContext';
import {
  resumeFeedAudioAfterVoiceAssistant,
  suspendFeedAudioForVoiceAssistant,
} from '@evoconn/hooks/useFeedAudio';
import { useVoiceAssistantPreferences } from '@evoconn/hooks/VoiceAssistantPreferencesContext';
import {
  useVoiceAssistantScreenContextReader,
  useVoiceAssistantScreenSnapshotReader,
} from '@evoconn/hooks/VoiceAssistantScreenContext';
import {
  fetchAssistantTtsBase64,
  isAssistantTimeoutError,
  sendVoiceAssistantTurn,
} from '@evoconn/services/voiceAssistantApi';
import { normalizeVoiceAssistantVoiceId } from '@evoconn/constants/voiceAssistantVoices';
import {
  applyVoiceAssistantPlayerVolume,
  ensureVoiceAssistantSpeakAudioMode,
} from '@evoconn/utils/voiceAssistantAudio';
import { showOutOfUsesAlert } from '@evoconn/utils/dailyUsesGate';
import { CLAN_LABELS } from '@evoconn/services/clanClassifier';
import { useAuth } from '../../mobile/lib/AuthContext';

/** Transcripciones más cortas que esto no se envían al backend (ruido/STT vacío). */
const MIN_TRANSCRIPT_CHARS = 3;

/**
 * WATCHDOG de fase 'thinking' — fix del cuelgue del orbe.
 *
 * CAUSA RAÍZ: requestStopRecording pone phase='thinking' ANTES de tener el
 * transcript. Si el módulo nativo de STT no emite ni 'end' ni 'error' (ocurre
 * en iOS tras varias sesiones seguidas de reconocimiento + reproducción TTS),
 * voiceState se queda en 'transcribing' y ningún path resetea la fase: el orbe
 * queda en 'thinking' para siempre e ignora pulsaciones. Este watchdog
 * garantiza que 'thinking' nunca dure más que STT + request (10 s) + margen.
 */
const THINKING_WATCHDOG_MS = 20_000;

/**
 * TESTEO: el asistente no gasta usos diarios (ni bloquea sin usos).
 * Debe ir en sync con ASSISTANT_QUOTA_DISABLED=1 del backend (.env).
 * PONER A false ANTES DE LANZAR A USUARIOS REALES.
 */
const ASSISTANT_USES_DISABLED_FOR_TESTING = true;

export type VoiceAssistantPhase = 'idle' | 'listening' | 'thinking' | 'speaking';

const MAX_LISTENING_SECONDS = 60;

type Options = {
  enabled?: boolean;
};

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

/** Log de diagnóstico del ciclo de invocación (solo dev): timestamp + nº de invocación. */
function logTurn(invocationId: number, step: string, extra?: string): void {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.log(
    `[VoiceAssistant][#${invocationId}][${new Date().toISOString().slice(11, 23)}] ${step}${extra ? ` — ${extra}` : ''}`,
  );
}

export function useVoiceAssistant({ enabled = true }: Options = {}) {
  const { voiceId } = useVoiceAssistantPreferences();
  const getScreenContextText = useVoiceAssistantScreenContextReader();
  const getScreenSnapshot = useVoiceAssistantScreenSnapshotReader();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  const { decrementUses, streakDays, remainingUses } = useDebugStats();
  const { blockIfNoUses } = useDailyUsesGate();
  const { profile } = useAuth();
  const classification = useClassification();
  const { totalUnlocked } = useQuotes();
  const [phase, setPhase] = useState<VoiceAssistantPhase>('idle');
  const [consentModalVisible, setConsentModalVisible] = useState(false);
  /**
   * Acción 'execute' sensible esperando confirmación por modal (Sprint 2).
   * Se resuelve FUERA del turno: el turno termina hablando la pregunta de
   * confirmación (así el watchdog de 'thinking' no la mata) y la ejecución
   * ocurre después, desde los botones del modal.
   */
  const [pendingConfirmationMessage, setPendingConfirmationMessage] = useState<string | null>(null);
  const pendingConfirmationRef = useRef<{
    action: AgentAction;
    context: AgentScreenContext;
    userMessage: string;
    routeAtInvocation: string;
    latencyMs: number;
    latencySttMs: number | null;
    wasTruncated: boolean;
    contextChars: number;
    redactions: string[];
  } | null>(null);
  const phaseRef = useRef<VoiceAssistantPhase>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const speechEndResolverRef = useRef<(() => void) | null>(null);
  const awaitingTranscriptRef = useRef(false);
  const pendingEndRef = useRef(false);
  /** Timestamp en que el usuario paró de hablar — para medir latencia del STT. */
  const sttStopAtRef = useRef<number | null>(null);
  /** Identificador incremental de invocación para correlacionar logs. */
  const invocationIdRef = useRef(0);

  const setPhaseSafe = useCallback((next: VoiceAssistantPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // La música de los posts se cuela por el micrófono y degrada el STT (y se
  // mezcla con el TTS de la respuesta). Pausa mientras el asistente está
  // activo; se reanuda sola al volver a idle.
  useEffect(() => {
    if (phase === 'idle') resumeFeedAudioAfterVoiceAssistant();
    else suspendFeedAudioForVoiceAssistant();
    return () => {
      resumeFeedAudioAfterVoiceAssistant();
    };
  }, [phase]);

  /**
   * Datos globales del usuario que viajan en cada turno: permiten al agente
   * responder "¿de qué clan soy?", "¿cuántas frases tengo desbloqueadas?", etc.
   * desde cualquier pantalla, sin tener que navegar para "leerlo".
   */
  const getUserContextText = useCallback((): string | null => {
    try {
      const parts: string[] = [];
      if (profile?.username) parts.push(`- Usuario: @${profile.username}`);
      const clanId = classification.getVisibleClanId();
      parts.push(`- Clan visible: ${clanId ? CLAN_LABELS[clanId] : 'sin clan revelado todavía'}`);
      const pcts = classification
        .getPercentages()
        .filter((p) => p.pct > 0)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5)
        .map((p) => `${p.label} ${Math.round(p.pct)}%`);
      if (pcts.length) parts.push(`- Porcentajes filosóficos (mayores): ${pcts.join(', ')}`);
      parts.push(
        `- Frases desbloqueadas de la base de datos: ${totalUnlocked} (es el número junto al lápiz en la barra superior)`,
      );
      parts.push(`- Racha actual: ${streakDays} día(s)`);
      parts.push(`- Usos de IA restantes hoy: ${remainingUses}`);
      return `Datos del usuario actual (úsalos para responder directamente, sin navegar):\n${parts.join('\n')}`;
    } catch {
      return null;
    }
  }, [profile?.username, classification, totalUnlocked, streakDays, remainingUses]);

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
          volume: 1,
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
      await ensureVoiceAssistantSpeakAudioMode();

      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[VoiceAssistant] reply:', reply.slice(0, 120));
      }

      if (audioBase64?.length) {
        const uri = `${FileSystem.cacheDirectory}evo-assistant-${Date.now()}.mp3`;
        try {
          await FileSystem.writeAsStringAsync(uri, audioBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const player = createAudioPlayer(null, { keepAudioSessionActive: true });
          playerRef.current = player;
          player.replace(uri);
          await waitForPlayerLoaded(player);
          if (phaseRef.current !== 'speaking') return;
          applyVoiceAssistantPlayerVolume(player);
          player.play();
          await waitForPlaybackToFinish(player);
          disposePlayer();
          if (phaseRef.current === 'speaking') setPhaseSafe('idle');
          return;
        } catch (e) {
          disposePlayer();
          if (__DEV__) console.warn('[VoiceAssistant] OpenAI TTS playback failed, fallback:', e);
        } finally {
          // Un MP3 por turno: borrarlo para no acumular archivos en cache.
          void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
      }

      await speakWithDeviceTts(reply);
      if (phaseRef.current === 'speaking') setPhaseSafe('idle');
    },
    [disposePlayer, setPhaseSafe, speakWithDeviceTts, stopSpeech],
  );

  const handleTranscript = useCallback(
    async (text: string) => {
      const turnId = invocationIdRef.current;
      awaitingTranscriptRef.current = false;
      const sttLatencyMs =
        sttStopAtRef.current != null ? Date.now() - sttStopAtRef.current : null;
      sttStopAtRef.current = null;
      const msg = text.trim();
      logTurn(turnId, 'transcript recibido', `${msg.length} chars, stt=${sttLatencyMs ?? '?'}ms`);
      if (!enabled) {
        setPhaseSafe('idle');
        return;
      }
      if (msg.length < MIN_TRANSCRIPT_CHARS) {
        logTurn(turnId, 'reset idle', 'transcript demasiado corto');
        setPhaseSafe('idle');
        void logAgentEvent({
          eventType: 'agent_stt_empty',
          userMessage: msg || undefined,
          currentRoute: pathnameRef.current,
          latencySttMs: sttLatencyMs,
        });
        showAssistantError('No te he escuchado. Inténtalo de nuevo.');
        return;
      }

      setPhaseSafe('thinking');
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const startedAt = Date.now();
      const routeAtInvocation = pathnameRef.current;
      logTurn(turnId, 'request start', `route=${routeAtInvocation}`);
      void logAgentEvent({
        eventType: 'agent_invoked',
        userMessage: msg,
        currentRoute: routeAtInvocation,
      });

      try {
        // Snapshot estructurado del momento de la invocación: las acciones
        // type 'execute' operan sobre el post que el usuario veía AL HABLAR,
        // aunque haga scroll mientras el backend responde.
        const screenSnapshotAtInvocation = getScreenSnapshot();
        // U2: usuario primero (estable), pantalla absorbe el recorte si excede.
        // U3: saneado de patrones sensibles SOLO sobre el contexto de la app
        // (la transcripción del usuario nunca se redacta).
        const rawContext = combineContexts(getUserContextText(), getScreenContextText() ?? null);
        const { sanitized, redactions } = rawContext
          ? sanitizeForLLM(rawContext)
          : { sanitized: null, redactions: [] };
        const contextChars = sanitized?.length ?? 0;
        if (redactions.length) {
          logTurn(turnId, 'contexto redactado', redactions.join(','));
        }
        const { reply, audio_base64, action, wasTruncated } = await sendVoiceAssistantTurn(msg, {
          signal: controller.signal,
          voice: voiceId,
          screenContext: sanitized ?? undefined,
          currentRoute: routeAtInvocation,
        });
        logTurn(
          turnId,
          'response recibida',
          `${Date.now() - startedAt}ms, action=${action?.intent ?? action?.type ?? 'none'}, truncated=${wasTruncated}`,
        );
        if (controller.signal.aborted) {
          logTurn(turnId, 'descartado', 'request abortado (cancelación o watchdog)');
          return;
        }
        if (!reply.trim()) {
          logTurn(turnId, 'reset idle', 'reply vacío');
          showAssistantError('No he recibido respuesta del asistente.');
          setPhaseSafe('idle');
          return;
        }
        if (!ASSISTANT_USES_DISABLED_FOR_TESTING) decrementUses();

        const latencyMs = Date.now() - startedAt;
        // Qué se habla al final: por defecto el reply del LLM con su TTS. Si
        // una acción 'execute' resulta idempotente o falla, el reply del LLM
        // ("Listo, le he dado like") sería falso → se habla el mensaje real
        // del handler con el TTS del dispositivo.
        let spokenReply = reply;
        let spokenAudio: string | null | undefined = audio_base64;

        if (action && action.type === 'navigate') {
          const actionStartedAt = Date.now();
          logTurn(turnId, 'action exec start', action.intent ?? action.type);
          const result = await ActionExecutor.execute(action);
          const latencyActionMs = Date.now() - actionStartedAt;
          logTurn(turnId, 'action exec end', `success=${result.success}${result.error ? `, ${result.error}` : ''}`);
          void logAgentEvent({
            eventType: result.success ? 'navigation_executed' : 'navigation_failed',
            userMessage: msg,
            intentDetected: action.intent ?? null,
            actionExecuted: { type: action.type, intent: action.intent ?? null },
            currentRoute: routeAtInvocation,
            latencyMs,
            latencySttMs: sttLatencyMs,
            latencyActionMs,
            wasTruncated,
            contextChars,
            redactionsApplied: redactions,
          });
        } else if (action && action.type === 'execute') {
          const executeContext: AgentScreenContext = {
            feed: screenSnapshotAtInvocation?.feed,
          };
          // Fuente de verdad de la confirmación: el MANIFEST, nunca el LLM
          // (validación doble — el backend instruye, el cliente exige).
          const manifestAction = evoManifest.actions.find((a) => a.intent === action.intent);
          const needsConfirmation = manifestAction?.requireConfirmation === true;

          if (needsConfirmation) {
            // Precheck (contexto + idempotencia) ANTES de molestar con el
            // modal: "haz mi cuenta privada" ya privada → respuesta directa.
            const pre = await ActionExecutor.precheck(action, executeContext);
            if (pre.kind === 'done') {
              const result = pre.result;
              logTurn(
                turnId,
                'action precheck done',
                `idempotent=${result.idempotent === true}${result.error ? `, ${result.error}` : ''}`,
              );
              void logAgentEvent({
                eventType: result.idempotent
                  ? 'action_idempotent'
                  : result.success
                    ? 'action_executed'
                    : 'action_failed',
                userMessage: msg,
                intentDetected: action.intent ?? null,
                actionExecuted: {
                  type: action.type,
                  intent: action.intent ?? null,
                  ...(result.error ? { error: result.error } : {}),
                },
                currentRoute: routeAtInvocation,
                latencyMs,
                latencySttMs: sttLatencyMs,
                wasTruncated,
                contextChars,
                redactionsApplied: redactions,
              });
              if (result.message) {
                spokenReply = result.message;
                spokenAudio = null;
              }
            } else {
              // Mensaje canónico del manifest; el del LLM solo como fallback.
              const confirmationMessage =
                manifestAction?.confirmationMessageTemplate ??
                action.confirmationMessage ??
                '¿Confirmar esta acción?';
              pendingConfirmationRef.current = {
                action,
                context: executeContext,
                userMessage: msg,
                routeAtInvocation,
                latencyMs,
                latencySttMs: sttLatencyMs,
                wasTruncated,
                contextChars,
                redactions,
              };
              setPendingConfirmationMessage(confirmationMessage);
              logTurn(turnId, 'confirmation modal shown', action.intent);
              // Se habla la pregunta de confirmación (el prompt instruye al
              // LLM a que su reply SEA la pregunta; si se desvió, el modal
              // muestra el texto canónico igualmente).
              spokenReply = reply;
            }
          } else {
            const actionStartedAt = Date.now();
            logTurn(turnId, 'action exec start', action.intent ?? action.type);
            const result = await ActionExecutor.execute(action, executeContext);
            const latencyActionMs = Date.now() - actionStartedAt;
            logTurn(
              turnId,
              'action exec end',
              `success=${result.success}, idempotent=${result.idempotent === true}${result.error ? `, ${result.error}` : ''}`,
            );
            void logAgentEvent({
              eventType: result.idempotent
                ? 'action_idempotent'
                : result.success
                  ? 'action_executed'
                  : 'action_failed',
              userMessage: msg,
              intentDetected: action.intent ?? null,
              actionExecuted: {
                type: action.type,
                intent: action.intent ?? null,
                ...(result.error ? { error: result.error } : {}),
              },
              currentRoute: routeAtInvocation,
              latencyMs,
              latencySttMs: sttLatencyMs,
              latencyActionMs,
              wasTruncated,
              contextChars,
              redactionsApplied: redactions,
            });
            if ((result.idempotent || !result.success) && result.message) {
              spokenReply = result.message;
              spokenAudio = null;
            } else if (
              result.success &&
              result.message &&
              result.data?.useNewVoiceForFeedback === true
            ) {
              // Cambio de voz: el feedback debe sonar CON la voz nueva (el
              // audio del LLM viene con la antigua). Síntesis corta sin cuota;
              // si falla, speakReply degrada al TTS del dispositivo.
              const newVoice = normalizeVoiceAssistantVoiceId(
                typeof result.data.voiceId === 'string' ? result.data.voiceId : null,
              );
              spokenReply = result.message;
              spokenAudio = await fetchAssistantTtsBase64(newVoice, result.message);
            }
          }
        } else {
          void logAgentEvent({
            eventType: 'question_only',
            userMessage: msg,
            currentRoute: routeAtInvocation,
            latencyMs,
            latencySttMs: sttLatencyMs,
            wasTruncated,
            contextChars,
            redactionsApplied: redactions,
          });
        }

        logTurn(turnId, 'speak start');
        await speakReply(spokenReply, spokenAudio);
        logTurn(turnId, 'speak end / turno completado');
      } catch (e) {
        if (controller.signal.aborted) {
          logTurn(turnId, 'descartado', 'error tras abort (cancelación o watchdog)');
          return;
        }
        const rawMsg = e instanceof Error ? e.message : String(e);
        logTurn(turnId, 'ERROR', rawMsg);
        if (isAssistantTimeoutError(e)) {
          void logAgentEvent({
            eventType: 'agent_timeout',
            userMessage: msg,
            currentRoute: routeAtInvocation,
            latencyMs: Date.now() - startedAt,
          });
          showAssistantError('No pude responder ahora. Inténtalo de nuevo.');
          setPhaseSafe('idle');
          return;
        }
        const errMsg = e instanceof Error ? e.message : 'Error desconocido';
        if (errMsg.includes('sin usos') || errMsg.toLowerCase().includes('quota')) {
          showOutOfUsesAlert();
        } else if (errMsg.includes('autenticar') || errMsg.includes('401')) {
          showAssistantError('Sesión expirada. Vuelve a iniciar sesión.');
        } else if (
          errMsg.includes('conexión') ||
          errMsg.includes('conectar') ||
          errMsg.includes('internet') ||
          errMsg.includes('Network') ||
          errMsg.includes('fetch')
        ) {
          showAssistantError('Sin conexión con el servidor. Comprueba tu internet e inténtalo de nuevo.');
        } else {
          showAssistantError(errMsg || 'Ha ocurrido un error. Inténtalo de nuevo.');
        }
        setPhaseSafe('idle');
      }
    },
    [decrementUses, enabled, getScreenContextText, getScreenSnapshot, getUserContextText, setPhaseSafe, speakReply, voiceId],
  );

  const onSimulatedTranscriptBlocked = useCallback(() => {
    awaitingTranscriptRef.current = false;
    setPhaseSafe('idle');
    void logAgentEvent({
      eventType: 'agent_stt_failed',
      currentRoute: pathnameRef.current,
    });
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
    sttStopAtRef.current = Date.now();
    setPhaseSafe('thinking');
    stopRecording();
  }, [setPhaseSafe, stopRecording]);

  const beginListening = useCallback(async () => {
    if (!enabled) return;
    // Consentimiento explícito (Apple 5.1.2(i) + GDPR): nada sale del
    // dispositivo hasta que el usuario acepte. El modal continúa el flujo.
    if (!(await hasConsentedToAssistant())) {
      setConsentModalVisible(true);
      return;
    }
    if (!ASSISTANT_USES_DISABLED_FOR_TESTING && blockIfNoUses()) return;
    if (!hasNativeSpeechRecognition) {
      void logAgentEvent({ eventType: 'agent_stt_failed', currentRoute: pathnameRef.current });
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
    invocationIdRef.current += 1;
    logTurn(invocationIdRef.current, 'beginListening');
    pendingEndRef.current = false;
    awaitingTranscriptRef.current = false;
    abortRef.current?.abort();
    setPhaseSafe('listening');
    await startRecording();
    // Si el STT no arrancó (permiso denegado, módulo caído), voiceState nunca
    // sale de 'idle' y ningún efecto se dispara → la fase quedaría en
    // 'listening' para siempre. Comprobación diferida para liberarla.
    setTimeout(() => {
      if (phaseRef.current === 'listening' && voiceStateRef.current === 'idle') {
        logTurn(invocationIdRef.current, 'reset idle', 'STT no arrancó (permiso o módulo)');
        setPhaseSafe('idle');
      }
    }, 1000);
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
        void logAgentEvent({
          eventType: 'agent_stt_empty',
          currentRoute: pathnameRef.current,
        });
        showAssistantError('No se ha entendido lo que dijiste. Pulsa el botón y habla un poco más.');
        setPhaseSafe('idle');
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [voiceState, setPhaseSafe]);

  // WATCHDOG: 'thinking' jamás puede durar más de THINKING_WATCHDOG_MS.
  // Cubre el cuelgue del STT nativo (ni 'end' ni 'error' → nadie resetea la
  // fase) y cualquier path de error no contemplado. Sin esto el orbe queda
  // bloqueado para siempre porque toggleListening ignora pulsaciones en thinking.
  useEffect(() => {
    if (phase !== 'thinking') return;
    const t = setTimeout(() => {
      if (phaseRef.current !== 'thinking') return;
      logTurn(invocationIdRef.current, 'WATCHDOG reset', `thinking > ${THINKING_WATCHDOG_MS}ms`);
      awaitingTranscriptRef.current = false;
      pendingEndRef.current = false;
      abortRef.current?.abort();
      cancelRecording();
      void logAgentEvent({
        eventType: 'agent_watchdog_reset',
        currentRoute: pathnameRef.current,
        latencyMs: THINKING_WATCHDOG_MS,
      });
      showAssistantError('No pude responder ahora. Inténtalo de nuevo.');
      setPhaseSafe('idle');
    }, THINKING_WATCHDOG_MS);
    return () => clearTimeout(t);
  }, [phase, cancelRecording, setPhaseSafe]);

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

  /** El usuario aceptó el consentimiento: persistir y arrancar la escucha. */
  const acceptConsent = useCallback(async () => {
    setConsentModalVisible(false);
    try {
      await grantAssistantConsent();
    } catch {
      /* el flujo sigue; el modal volverá a salir si no se pudo persistir */
    }
    void logAgentEvent({ eventType: 'agent_consent_granted', currentRoute: pathnameRef.current });
    await beginListening();
  }, [beginListening]);

  /** El usuario rechazó el consentimiento: no se inicia el STT. */
  const declineConsent = useCallback(() => {
    setConsentModalVisible(false);
    void logAgentEvent({ eventType: 'agent_consent_declined', currentRoute: pathnameRef.current });
  }, []);

  /**
   * Habla el resultado de una acción confirmada (fuera del turno): intenta
   * el TTS de OpenAI con la voz activa y degrada al TTS del dispositivo.
   */
  const speakActionFeedback = useCallback(
    async (text: string) => {
      const audio = await fetchAssistantTtsBase64(voiceId, text);
      await speakReply(text, audio);
    },
    [speakReply, voiceId],
  );

  /** El usuario pulsó "Confirmar" en el modal: ejecutar la acción pendiente. */
  const confirmPendingAction = useCallback(async () => {
    const pending = pendingConfirmationRef.current;
    pendingConfirmationRef.current = null;
    setPendingConfirmationMessage(null);
    if (!pending) return;

    const { action, context } = pending;
    const actionStartedAt = Date.now();
    logTurn(invocationIdRef.current, 'confirmed action exec start', action.intent);
    const result = await ActionExecutor.execute(action, context);
    const latencyActionMs = Date.now() - actionStartedAt;
    logTurn(
      invocationIdRef.current,
      'confirmed action exec end',
      `success=${result.success}${result.error ? `, ${result.error}` : ''}`,
    );
    void logAgentEvent({
      eventType: result.idempotent
        ? 'action_idempotent'
        : result.success
          ? 'action_executed'
          : 'action_failed',
      userMessage: pending.userMessage,
      intentDetected: action.intent ?? null,
      actionExecuted: {
        type: action.type,
        intent: action.intent ?? null,
        confirmed: true,
        ...(result.error ? { error: result.error } : {}),
      },
      currentRoute: pending.routeAtInvocation,
      latencyMs: pending.latencyMs,
      latencySttMs: pending.latencySttMs,
      latencyActionMs,
      wasTruncated: pending.wasTruncated,
      contextChars: pending.contextChars,
      redactionsApplied: pending.redactions,
    });
    if (result.message) await speakActionFeedback(result.message);
  }, [speakActionFeedback]);

  /** El usuario canceló (botón, toque fuera o atrás): no se ejecuta nada. */
  const cancelPendingAction = useCallback(() => {
    const pending = pendingConfirmationRef.current;
    pendingConfirmationRef.current = null;
    setPendingConfirmationMessage(null);
    if (!pending) return;
    logTurn(invocationIdRef.current, 'action cancelled', pending.action.intent);
    void logAgentEvent({
      eventType: 'action_cancelled',
      userMessage: pending.userMessage,
      intentDetected: pending.action.intent ?? null,
      actionExecuted: { type: pending.action.type, intent: pending.action.intent ?? null },
      currentRoute: pending.routeAtInvocation,
    });
    // Feedback inmediato y barato: TTS del dispositivo (frase de una palabra).
    void speakReply('Cancelado.', null);
  }, [speakReply]);

  return {
    phase,
    isListening,
    showWaveform,
    showThinking,
    volumeLevel,
    toggleListening,
    cancelAll,
    isBusy: showThinking || phase === 'speaking',
    consentModalVisible,
    acceptConsent,
    declineConsent,
    confirmationModalVisible: pendingConfirmationMessage !== null,
    confirmationMessage: pendingConfirmationMessage ?? '',
    confirmPendingAction,
    cancelPendingAction,
  };
}
