/**
 * Cliente del asistente de voz Evo (POST /assistant/chat — OpenAI vía backend Railway).
 * Misma URL, headers (x-api-key, x-user-id) y cuota diaria que debates/reflexiones.
 */
import * as Device from 'expo-device';
import {
  EVO_MANIFEST_VERSION,
  manifestActionsForBackend,
  manifestRoutesForBackend,
  parseAgentAction,
  type AgentAction,
} from '@evoconn/agent';
import {
  getVoiceAssistantVoiceOption,
  type VoiceAssistantVoiceId,
} from '@evoconn/constants/voiceAssistantVoices';
import { playVoiceAssistantMp3Base64 } from '@evoconn/utils/voiceAssistantAudio';
import { getApiBaseUrl } from './debateApi';
import { mergeApiHeaders } from './apiRuntimeConfig';
import { logAiUsageEvent } from './supabaseAnalytics';

export type VoiceAssistantTurnResponse = {
  reply: string;
  /** MP3 en base64 (OpenAI TTS); puede venir vacío si TTS falló en servidor. */
  audio_base64?: string | null;
  /** Acción validada del agente (navegación) o null si no hay nada que ejecutar. */
  action: AgentAction | null;
  /** True si el LLM cortó la respuesta por max_tokens (instrumentación). */
  wasTruncated: boolean;
};

/**
 * Timeout del turno del asistente. Medido en real: 3.4-10.8 s (LLM + TTS);
 * con 10 s había falsos timeouts en turnos legítimos lentos. El watchdog
 * del hook (20 s) sigue siendo la red de seguridad final.
 */
const ASSISTANT_TURN_TIMEOUT_MS = 15_000;

async function getApiErrorMessage(res: Response): Promise<string> {
  let body: { detail?: string; error?: string; message?: string; remaining?: number } = {};
  try {
    const text = await res.text();
    if (text) body = JSON.parse(text);
  } catch {
    // ignore
  }
  const detail = body.detail ?? body.error ?? body.message;
  if (res.status === 401) return 'No se pudo autenticar con el servidor. Actualiza la app.';
  if (res.status === 429) {
    if (body.error === 'Daily quota exceeded' || typeof body.remaining === 'number') {
      return 'Te has quedado sin usos';
    }
    return 'Demasiadas peticiones. Espera un momento.';
  }
  if (res.status === 404) {
    return 'El servidor aún no tiene el asistente de voz activo. Si eres desarrollador, despliega el backend; si eres usuario, espera a la próxima actualización del servidor.';
  }
  if (res.status >= 500) return 'El servidor no está disponible. Inténtalo en unos segundos.';
  return typeof detail === 'string' ? detail : res.statusText || `Error (${res.status})`;
}

function networkErrorMessage(err: unknown, apiBaseUrl?: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('abort')) return msg;
  const localDevOnDevice =
    Device.isDevice &&
    apiBaseUrl != null &&
    (apiBaseUrl.includes('127.0.0.1') || apiBaseUrl.includes('localhost'));
  if (localDevOnDevice) {
    return (
      'No llego al backend en tu Mac. Conecta el iPhone por USB y deja corriendo en el Mac: iproxy 8000 8000 ' +
      '(y uvicorn en el puerto 8000).'
    );
  }
  if (msg.includes('fetch') || msg.includes('Network') || msg.includes('Failed to connect')) {
    return 'Sin conexión con el servidor. Comprueba tu internet e inténtalo de nuevo.';
  }
  return msg;
}

/** Marcador de timeout del asistente — el hook lo distingue del resto de errores. */
export const ASSISTANT_TIMEOUT_ERROR = 'assistant_timeout';

/** True si el error es el timeout del request del asistente. */
export function isAssistantTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message === ASSISTANT_TIMEOUT_ERROR;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const extSignal = init.signal;
  if (extSignal) {
    if (extSignal.aborted) controller.abort();
    else extSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    // Distinguir timeout (mostrar mensaje + evento) de cancelación del usuario (silenciosa).
    if (timedOut) throw new Error(ASSISTANT_TIMEOUT_ERROR);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableFetchError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // Los aborts (timeout o cancelación del usuario) NUNCA se reintentan:
  // reintentar dispararía otra generación LLM+TTS que nadie espera ya.
  if (msg === ASSISTANT_TIMEOUT_ERROR || msg.toLowerCase().includes('abort')) return false;
  return (
    msg.includes('fetch') ||
    msg.includes('Network') ||
    msg.includes('Failed to connect') ||
    msg.includes('network')
  );
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: { timeoutMs: number; attempts?: number; apiBase?: string },
): Promise<Response> {
  const attempts = options.attempts ?? 3;
  const apiBase = options.apiBase;
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, options.timeoutMs);
      if (isRetryableHttpStatus(res.status) && attempt < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (!isRetryableFetchError(e) || attempt === attempts - 1) {
        throw new Error(networkErrorMessage(e, apiBase));
      }
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }
  throw new Error(networkErrorMessage(lastErr, apiBase));
}

export async function sendVoiceAssistantTurn(
  message: string,
  options?: {
    signal?: AbortSignal;
    voice?: VoiceAssistantVoiceId;
    screenContext?: string;
    /** Pathname actual (expo-router) para que el LLM sepa dónde está el usuario. */
    currentRoute?: string;
  },
): Promise<VoiceAssistantTurnResponse> {
  const apiBase = getApiBaseUrl();
  const url = `${apiBase}/assistant/chat`;
  const body: Record<string, unknown> = {
    message: message.trim(),
    voice: options?.voice,
    manifest_version: EVO_MANIFEST_VERSION,
    manifest_routes: manifestRoutesForBackend(),
    manifest_actions: manifestActionsForBackend(),
  };
  const ctx = options?.screenContext?.trim();
  if (ctx) body.screen_context = ctx;
  const route = options?.currentRoute?.trim();
  if (route) body.current_route = route;

  const init: RequestInit = {
    method: 'POST',
    headers: mergeApiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    signal: options?.signal,
  };

  // attempts: 1 — un turno de voz no se reintenta solo: cada intento dispara
  // otra generación LLM+TTS (coste + latencia) que el usuario ya no espera.
  const res = await fetchWithRetry(url, init, {
    timeoutMs: ASSISTANT_TURN_TIMEOUT_MS,
    attempts: 1,
    apiBase,
  });

  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res));
  }

  const data = (await res.json()) as {
    reply?: string;
    audio_base64?: string | null;
    action?: unknown;
    was_truncated?: boolean;
  };
  void logAiUsageEvent({ source: 'voice_assistant', model: 'gpt-4o-mini' });

  return {
    reply: (data.reply ?? '').trim(),
    audio_base64: data.audio_base64 ?? null,
    action: parseAgentAction(data.action),
    wasTruncated: data.was_truncated === true,
  };
}

export async function previewVoiceAssistantTts(voice: VoiceAssistantVoiceId): Promise<void> {
  const apiBase = getApiBaseUrl();
  const url = `${apiBase}/assistant/preview-tts`;
  const option = getVoiceAssistantVoiceOption(voice);
  const res = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: mergeApiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ voice, text: option.previewLine }),
    },
    { timeoutMs: 30_000, attempts: 3, apiBase },
  );
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res));
  }
  const data = (await res.json()) as { audio_base64?: string | null };
  if (!data.audio_base64?.length) {
    throw new Error('No se recibió audio de muestra.');
  }
  await playVoiceAssistantMp3Base64(data.audio_base64);
}
