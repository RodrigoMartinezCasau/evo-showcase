/**
 * Debates API client. Backend is source of truth.
 * GET /debates, POST /debates, GET /debates/{id}, POST /debates/{id}/chat, DELETE /debates/{id}
 * Base URL: NEXT_PUBLIC_API_URL (default http://localhost:8000), no trailing slash.
 */
import type { AuthorLayer, CreatorResponse, DebateResponse, FactsLayer, Message, Thread } from './types'

function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  return typeof raw === 'string' ? raw.replace(/\/$/, '') : 'http://localhost:8000'
}

const API_URL = getApiBaseUrl()

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'
function logRequestFailure(url: string, status?: number, error?: string): void {
  if (isDev) console.error('[api] request failed', { url, status, error })
}

export type DebateListItem = { id: string; title: string; updated_at: string; mode?: string }

export type FullDebate = {
  id: string
  title: string
  created_at: string
  updated_at: string
  messages: Array<{
    id: string
    role: string
    content: string
    created_at: string
    meta?: { debate_response?: unknown; next_question?: string; topic?: string; steelman?: string; contrarian?: string; lang?: string }
  }>
}

export type SendMessageResponse = {
  assistant_text: string
  debate_response: DebateResponse
  next_question: string
  thread_id: string
  topic: string
  message_id?: string
  lang?: string
}

function mapApiMessage(m: FullDebate['messages'][0]): Message {
  if (m.role === 'user') {
    return { role: 'user', content: m.content, id: m.id }
  }
  const meta = m.meta || {}
  return {
    role: 'assistant',
    content: m.content,
    id: m.id,
    debateResponse: meta.debate_response as DebateResponse | undefined,
    nextQuestion: meta.next_question,
    topic: meta.topic,
    lang: meta.lang,
  }
}

export async function fetchDebates(mode?: string): Promise<DebateListItem[]> {
  const url = mode ? `${API_URL}/debates?mode=${encodeURIComponent(mode)}` : `${API_URL}/debates`
  const res = await fetch(url)
  if (!res.ok) {
    logRequestFailure(url, res.status, res.statusText)
    throw new Error('Failed to fetch debates')
  }
  const data = await res.json()
  return data.debates || []
}

function networkErrorMessage(msg: string): string {
  return msg.includes('fetch') || msg === 'NetworkError when attempting to fetch resource'
    ? 'No se pudo conectar con el servidor. Comprueba que el backend esté en marcha y la URL sea correcta.'
    : msg
}

export async function createDebate(initialMessage?: string, mode?: string): Promise<{ id: string; title: string; mode?: string }> {
  const url = `${API_URL}/debates`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initial_message: initialMessage || null,
        mode: mode || 'debate',
      }),
    })
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : 'Network error'
    logRequestFailure(url, undefined, msg)
    throw new Error(networkErrorMessage(msg))
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : data?.detail?.[0]?.msg ?? data?.message ?? res.statusText
    logRequestFailure(url, res.status, detail)
    throw new Error(detail || `Error del servidor (${res.status})`)
  }
  return { id: data.id, title: data.title, mode: data.mode }
}

export async function getDebate(id: string): Promise<Thread | null> {
  const url = `${API_URL}/debates/${id}`
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) {
    logRequestFailure(url, res.status, res.statusText)
    throw new Error('Failed to fetch debate')
  }
  const data: FullDebate = await res.json()
  return {
    id: data.id,
    title: data.title,
    messages: data.messages.map(mapApiMessage),
    createdAt: new Date(data.updated_at).getTime(),
  }
}

export async function sendMessage(
  debateId: string,
  message: string,
  mode: string = 'debate'
): Promise<SendMessageResponse> {
  const url = `${API_URL}/debates/${debateId}/chat`
  const payload = { message, mode: mode || 'debate' }
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : 'Network error'
    logRequestFailure(url, undefined, msg)
    throw new Error(networkErrorMessage(msg))
  }
  const responseBody = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = typeof responseBody?.detail === 'string' ? responseBody.detail : responseBody?.detail?.[0]?.msg ?? responseBody?.message ?? res.statusText
    logRequestFailure(url, res.status, detail)
    throw new Error(detail || `Error del servidor (${res.status})`)
  }
  return responseBody as SendMessageResponse
}

export async function deleteDebate(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/debates/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete debate')
}

export async function fetchMessageFacts(messageId: string): Promise<FactsLayer> {
  const res = await fetch(`${API_URL}/messages/${messageId}/facts`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to fetch facts')
  return res.json()
}

export async function fetchMessageQuotes(messageId: string): Promise<AuthorLayer> {
  const res = await fetch(`${API_URL}/messages/${messageId}/quotes`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to fetch quotes')
  return res.json()
}

export async function fetchMessageCreator(messageId: string): Promise<CreatorResponse> {
  const res = await fetch(`${API_URL}/messages/${messageId}/creator`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to fetch creator')
  return res.json()
}

export async function updateDebateTitle(id: string, title: string): Promise<string> {
  const res = await fetch(`${API_URL}/debates/${id}/title`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to update title')
  }
  const data = await res.json()
  return data.title
}
