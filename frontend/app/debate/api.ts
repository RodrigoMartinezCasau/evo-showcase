/**
 * Debates API client. Backend is source of truth.
 * GET /debates, POST /debates, GET /debates/{id}, POST /debates/{id}/chat, DELETE /debates/{id}
 *
 * Base URL:
 * - Production (Vercel, single project): same-origin "/api" when NEXT_PUBLIC_API_URL is unset.
 * - Production (Vercel, two projects): set NEXT_PUBLIC_API_URL to the API project URL (e.g. https://your-api.vercel.app).
 * - Local dev: http://localhost:8000 when NEXT_PUBLIC_API_URL is unset.
 */
import type { AuthorLayer, CreatorResponse, DebateResponse, FactsLayer, Message, Thread } from './types'

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (raw != null && raw !== '') {
    return typeof raw === 'string' ? raw.replace(/\/$/, '') : ''
  }
  // Browser: same-origin backend at /api (single Vercel project)
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api'
  }
  // Server / SSR (e.g. Vercel): same-origin /api when no env set
  if (typeof process !== 'undefined' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api`
  }
  return 'http://localhost:8000'
}

const API_URL = getApiBaseUrl()

const TESTER_API_KEY = process.env.NEXT_PUBLIC_TESTER_API_KEY

/** User-facing messages for API errors (401/403/429/500). */
async function getApiErrorMessage(res: Response): Promise<string> {
  const status = res.status
  let body: { detail?: string; error?: string; message?: string } = {}
  try {
    const text = await res.text()
    if (text) body = JSON.parse(text) as typeof body
  } catch {
    // ignore
  }
  const detail = body.detail ?? body.error ?? body.message
  if (status === 401) return 'Clave de API inválida o faltante.'
  if (status === 403) return detail && typeof detail === 'string' ? detail : 'Acceso denegado.'
  if (status === 429) {
    if (detail && typeof detail === 'string' && (detail.includes('quota') || detail.toLowerCase().includes('daily')))
      return 'Te has quedado sin usos por hoy.'
    return detail && typeof detail === 'string' ? detail : 'Demasiadas peticiones. Espera un momento.'
  }
  if (status >= 500) return 'Error del servidor. Inténtalo más tarde.'
  return typeof detail === 'string' ? detail : res.statusText || `Error (${status})`
}

function withApiKey(init?: RequestInit): RequestInit | undefined {
  const headers = new Headers(init?.headers ?? {})
  if (TESTER_API_KEY) {
    headers.set('x-api-key', TESTER_API_KEY)
  }
  if (headers.keys().next().done) {
    // no headers set
    return init
  }
  return { ...init, headers }
}

export type UsageInfo = {
  dailyLimit: number
  used: number
  remaining: number
  date: string
}

export async function fetchUsage(): Promise<UsageInfo> {
  const url = `${API_URL}/usage`
  const res = await fetch(url, withApiKey())
  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res))
  }
  return res.json()
}

/** Check backend is reachable. Use on load to show banner without blocking UI. */
export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { method: 'GET', ...withApiKey() })
    return res.ok
  } catch {
    return false
  }
}

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'
function logRequestFailure(url: string, status?: number, error?: string): void {
  if (isDev) console.error('[api] request failed', { url, status, error })
}

export type DebateListItem = {
  id: string
  title: string
  updated_at: string
  is_favorite?: boolean
  folder_id?: string | null
}

export type FolderListItem = { id: string; name: string; created_at: string; chatIds: string[] }

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

export async function fetchDebates(): Promise<DebateListItem[]> {
  const url = `${API_URL}/debates`
  const res = await fetch(url, withApiKey())
  if (!res.ok) {
    logRequestFailure(url, res.status, res.statusText)
    throw new Error(await getApiErrorMessage(res))
  }
  const data = await res.json()
  return (data.debates || []) as DebateListItem[]
}

export async function fetchFolders(): Promise<FolderListItem[]> {
  const url = `${API_URL}/folders`
  const res = await fetch(url, withApiKey())
  if (!res.ok) {
    logRequestFailure(url, res.status, res.statusText)
    throw new Error('Failed to fetch folders')
  }
  const data = await res.json()
  return data.folders || []
}

export async function toggleFavorite(debateId: string): Promise<boolean> {
  const url = `${API_URL}/debates/${debateId}/favorite`
  const res = await fetch(
    url,
    withApiKey({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  )
  if (!res.ok) throw new Error('Failed to toggle favorite')
  const data = await res.json()
  return data.favorited === true
}

export async function createFolder(name: string): Promise<FolderListItem> {
  const url = `${API_URL}/folders`
  const res = await fetch(
    url,
    withApiKey({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || 'Nueva carpeta' }),
    })
  )
  if (!res.ok) throw new Error('Failed to create folder')
  const data = await res.json()
  return { id: data.id, name: data.name, created_at: data.created_at || '', chatIds: data.chatIds || [] }
}

export async function updateFolderName(folderId: string, name: string): Promise<void> {
  const url = `${API_URL}/folders/${folderId}`
  const res = await fetch(
    url,
    withApiKey({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  )
  if (!res.ok) throw new Error('Failed to rename folder')
}

export async function deleteFolder(folderId: string): Promise<void> {
  const res = await fetch(`${API_URL}/folders/${folderId}`, withApiKey({ method: 'DELETE' }))
  if (!res.ok) throw new Error('Failed to delete folder')
}

export async function moveDebateToFolder(debateId: string, folderId: string | null): Promise<void> {
  const url = `${API_URL}/debates/${debateId}/move-to-folder`
  const res = await fetch(
    url,
    withApiKey({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId }),
    })
  )
  if (!res.ok) throw new Error('Failed to move to folder')
}

function networkErrorMessage(msg: string): string {
  return msg.includes('fetch') || msg === 'NetworkError when attempting to fetch resource'
    ? 'No se pudo conectar con el servidor. Comprueba que el backend esté en marcha y la URL sea correcta.'
    : msg
}

export async function createDebate(initialMessage?: string): Promise<{ id: string; title: string }> {
  const url = `${API_URL}/debates`
  let res: Response
  try {
    res = await fetch(
      url,
      withApiKey({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_message: initialMessage || null,
        }),
      })
    ) as Response
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : 'Network error'
    logRequestFailure(url, undefined, msg)
    throw new Error(networkErrorMessage(msg))
  }
  if (!res.ok) {
    logRequestFailure(url, res.status, res.statusText)
    throw new Error(await getApiErrorMessage(res))
  }
  const data = await res.json().catch(() => ({} as { id?: string; title?: string }))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('usage-updated'))
  }
  return { id: data.id!, title: data.title! }
}

export async function getDebate(id: string): Promise<Thread | null> {
  const url = `${API_URL}/debates/${id}`
  const res = await fetch(url, withApiKey())
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
  message: string
): Promise<SendMessageResponse> {
  const url = `${API_URL}/debates/${debateId}/chat`
  const payload = { message }
  let res: Response
  try {
    res = await fetch(
      url,
      withApiKey({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    ) as Response
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : 'Network error'
    logRequestFailure(url, undefined, msg)
    throw new Error(networkErrorMessage(msg))
  }
  if (!res.ok) {
    logRequestFailure(url, res.status, res.statusText)
    throw new Error(await getApiErrorMessage(res))
  }
  const responseBody = await res.json() as SendMessageResponse
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('usage-updated'))
  }
  return responseBody
}

export async function deleteDebate(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/debates/${id}`, withApiKey({ method: 'DELETE' }))
  if (!res.ok) throw new Error('Failed to delete debate')
}

export async function fetchMessageFacts(messageId: string): Promise<FactsLayer> {
  const res = await fetch(`${API_URL}/messages/${messageId}/facts`, withApiKey({ method: 'POST' }))
  if (!res.ok) throw new Error('Failed to fetch facts')
  const data = await res.json()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('usage-updated'))
  }
  return data
}

export async function fetchMessageQuotes(messageId: string): Promise<AuthorLayer> {
  const res = await fetch(`${API_URL}/messages/${messageId}/quotes`, withApiKey({ method: 'POST' }))
  if (!res.ok) throw new Error('Failed to fetch quotes')
  const data = await res.json()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('usage-updated'))
  }
  return data
}

export async function fetchMessageCreator(messageId: string): Promise<CreatorResponse> {
  const res = await fetch(`${API_URL}/messages/${messageId}/creator`, withApiKey({ method: 'POST' }))
  if (!res.ok) throw new Error('Failed to fetch creator')
  const data = await res.json()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('usage-updated'))
  }
  return data
}

export async function updateDebateTitle(id: string, title: string): Promise<string> {
  const res = await fetch(
    `${API_URL}/debates/${id}/title`,
    withApiKey({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to update title')
  }
  const data = await res.json()
  return data.title
}
