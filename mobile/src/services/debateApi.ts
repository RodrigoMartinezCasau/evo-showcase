/**
 * Mobile debate API client — ported from frontend/app/debate/api.ts.
 * Talks to the same FastAPI backend (POST /debates, POST /debates/{id}/chat, etc.).
 */
import { Platform } from 'react-native';
import type {
  DebateListItem,
  DebateMessage,
  DebateResponse,
  DebateThread,
  FullDebate,
  SendMessageResponse,
} from '@evoconn/types/debate';

/**
 * Backend base URL.
 * - Optional override (physical device, otra red): `EXPO_PUBLIC_API_URL` en `mobile/mobile/.env`
 *   Ej: EXPO_PUBLIC_API_URL=http://192.168.1.42:8000 — reinicia Expo tras cambiarlo.
 * - iOS simulator: 127.0.0.1 works (shares host network).
 * - Android emulator: 10.0.2.2 maps to host loopback.
 */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

const fromEnv =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL
    ? String(process.env.EXPO_PUBLIC_API_URL).trim()
    : '';

const DEFAULT_API_URL = fromEnv
  ? stripTrailingSlash(fromEnv)
  : Platform.select({
      android: 'http://10.0.2.2:8000',
      default: 'http://127.0.0.1:8000',
    });

let _apiUrl: string = DEFAULT_API_URL;

export function setApiBaseUrl(url: string) {
  _apiUrl = url.replace(/\/$/, '');
}

export function getApiBaseUrl(): string {
  return _apiUrl;
}

const TESTER_API_KEY: string | undefined = undefined;

function withApiKey(init?: RequestInit & { requestId?: string }): RequestInit {
  const { requestId, ...rest } = init ?? {};
  const headers: Record<string, string> = {
    ...(rest?.headers as Record<string, string> | undefined),
  };
  if (TESTER_API_KEY) {
    headers['x-api-key'] = TESTER_API_KEY;
  }
  if (requestId) {
    headers['x-request-id'] = requestId;
  }
  return { ...rest, headers };
}

async function getApiErrorMessage(res: Response): Promise<string> {
  let body: { detail?: string; error?: string; message?: string } = {};
  try {
    const text = await res.text();
    if (text) body = JSON.parse(text);
  } catch {
    // ignore
  }
  const detail = body.detail ?? body.error ?? body.message;
  if (res.status === 401) return 'Clave de API inválida o faltante.';
  if (res.status === 429) return 'Demasiadas peticiones. Espera un momento.';
  if (res.status >= 500) return 'Error del servidor. Inténtalo más tarde.';
  return typeof detail === 'string' ? detail : res.statusText || `Error (${res.status})`;
}

function networkError(msg: string): string {
  return msg.includes('fetch') || msg.includes('Network')
    ? 'No se pudo conectar con el servidor. Comprueba que el backend esté en marcha.'
    : msg;
}

function mapApiMessage(m: FullDebate['messages'][0]): DebateMessage {
  if (m.role === 'user') {
    return { role: 'user', content: m.content, id: m.id };
  }
  const meta = m.meta || {};
  return {
    role: 'assistant',
    content: m.content,
    id: m.id,
    debateResponse: meta.debate_response as DebateResponse | undefined,
    nextQuestion: meta.next_question,
    topic: meta.topic,
    lang: meta.lang,
  };
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${_apiUrl}/health`, { method: 'GET', ...withApiKey() });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchDebates(): Promise<DebateListItem[]> {
  const url = `${_apiUrl}/debates`;
  const res = await fetch(url, withApiKey());
  if (!res.ok) throw new Error(await getApiErrorMessage(res));
  const data = await res.json();
  return (data.debates || []) as DebateListItem[];
}

export async function createDebate(
  initialMessage?: string,
  requestId?: string,
): Promise<{ id: string; title: string }> {
  const url = `${_apiUrl}/debates`;
  let res: Response;
  try {
    res = await fetch(
      url,
      withApiKey({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initial_message: initialMessage || null }),
        requestId,
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    throw new Error(networkError(msg));
  }
  if (!res.ok) throw new Error(await getApiErrorMessage(res));
  const data = await res.json();
  return { id: data.id, title: data.title };
}

export async function getDebate(id: string): Promise<DebateThread | null> {
  const url = `${_apiUrl}/debates/${id}`;
  const res = await fetch(url, withApiKey());
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch debate');
  const data: FullDebate = await res.json();
  return {
    id: data.id,
    title: data.title,
    messages: data.messages.map(mapApiMessage),
    createdAt: new Date(data.updated_at).getTime(),
  };
}

export async function sendMessage(
  debateId: string,
  message: string,
  requestId?: string,
): Promise<SendMessageResponse> {
  const url = `${_apiUrl}/debates/${debateId}/chat`;
  let res: Response;
  try {
    res = await fetch(
      url,
      withApiKey({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        requestId,
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    throw new Error(networkError(msg));
  }
  if (!res.ok) throw new Error(await getApiErrorMessage(res));
  return (await res.json()) as SendMessageResponse;
}

export async function deleteDebate(id: string): Promise<void> {
  const res = await fetch(`${_apiUrl}/debates/${id}`, withApiKey({ method: 'DELETE' }));
  if (!res.ok) throw new Error('Failed to delete debate');
}

export async function updateDebateTitle(id: string, title: string): Promise<string> {
  const res = await fetch(
    `${_apiUrl}/debates/${id}/title`,
    withApiKey({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }),
  );
  if (!res.ok) throw new Error('Failed to update title');
  const data = await res.json();
  return data.title;
}
