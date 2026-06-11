/**
 * Mobile debate API client — ported from frontend/app/debate/api.ts.
 * Talks to the same FastAPI backend (POST /debates, POST /debates/{id}/chat, etc.).
 */
import type {
  DebateListItem,
  DebateMessage,
  DebateResponse,
  DebateThread,
  FullDebate,
  SendMessageResponse,
} from '@evoconn/types/debate';
import { getDefaultApiUrl, mergeApiHeaders } from './apiRuntimeConfig';
import { logAiUsageEvent } from './supabaseAnalytics';

/**
 * Backend base URL.
 * @see `./apiRuntimeConfig` — EXPO_PUBLIC_API_URL / EXPO_PUBLIC_API_KEY
 * (TestFlight needs a public HTTPS URL).
 */

let _apiUrl: string = getDefaultApiUrl();

export function setApiBaseUrl(url: string) {
  _apiUrl = url.replace(/\/$/, '');
}

export function getApiBaseUrl(): string {
  // Siempre resolver en runtime (simulador ↔ IP LAN del .env, cambios de .env sin reinicio de módulo).
  return getDefaultApiUrl();
}

function withApiKey(init?: RequestInit & { requestId?: string }): RequestInit {
  const { requestId, ...rest } = init ?? {};
  const base = mergeApiHeaders(rest?.headers as Record<string, string> | undefined);
  if (requestId) base['x-request-id'] = requestId;
  return { ...rest, headers: base };
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
  return msg.includes('fetch') || msg.includes('Network') || msg.includes('abort')
    ? 'No se pudo conectar con el servidor. Comprueba que el backend esté en marcha.'
    : msg;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

/** Fetch with a timeout. Rejects with AbortError if the deadline is exceeded. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 60_000,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort);
    }
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/** Fetch with timeout + automatic retry on network errors (not 4xx/5xx). */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  {
    timeoutMs = 60_000,
    retries = 2,
    signal,
  }: { timeoutMs?: number; retries?: number; signal?: AbortSignal } = {},
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      return await fetchWithTimeout(url, init, timeoutMs, signal);
    } catch (err) {
      lastErr = err;
      if (signal?.aborted || isAbortError(err)) throw err;
      const msg = err instanceof Error ? err.message : '';
      const isNetworkErr = msg.includes('fetch') || msg.includes('Network');
      if (!isNetworkErr || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
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
    const res = await fetchWithTimeout(`${_apiUrl}/health`, { method: 'GET', ...withApiKey() }, 10_000);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Warm up the Railway server so it's awake before the user sends a message.
 * Call this when the conversation screen mounts. Fire-and-forget (never throws).
 */
export async function warmUpBackend(): Promise<void> {
  try { await fetchHealth(); } catch { /* ignore */ }
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
    res = await fetchWithRetry(
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
  void logAiUsageEvent({ source: 'debate_create', model: 'backend' });
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

export interface AIFlags {
  /** When false the backend omits the Socratic follow-up question. */
  includeReflectiveQuestion?: boolean;
  /** When false the backend omits philosopher citations. */
  includePhilosophicalReferences?: boolean;
}

export async function sendMessage(
  debateId: string,
  message: string,
  requestId?: string,
  flags?: AIFlags,
  options?: { signal?: AbortSignal },
): Promise<SendMessageResponse> {
  const url = `${_apiUrl}/debates/${debateId}/chat`;
  const body: Record<string, unknown> = { message };
  if (flags?.includeReflectiveQuestion === false)    body.include_reflective_question    = false;
  if (flags?.includePhilosophicalReferences === false) body.include_philosophical_references = false;
  let res: Response;
  try {
    res = await fetchWithRetry(
      url,
      withApiKey({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        requestId,
      }),
      {
        timeoutMs: 90_000,
        retries: options?.signal ? 0 : 2,
        signal: options?.signal,
      },
    );
  } catch (err) {
    if (isAbortError(err) || options?.signal?.aborted) throw err;
    const msg = err instanceof Error ? err.message : 'Network error';
    throw new Error(networkError(msg));
  }
  if (!res.ok) throw new Error(await getApiErrorMessage(res));
  const data = (await res.json()) as SendMessageResponse;
  void logAiUsageEvent({ source: 'debate_chat', model: 'backend' });
  return data;
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
