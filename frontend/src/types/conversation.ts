/** Conversation type for the unified sidebar list. */
export type ConversationType = 'reflection' | 'phrase' | 'essay'

/** Unified conversation item for sidebar display. */
export type ConversationItem = {
  id: string
  type: ConversationType
  title: string
  createdAt: number
  updatedAt: number
  /** For reflections: backend id. For phrase/essay: local id. */
  backendId?: string
}

/** Stored phrase (localStorage). */
export type StoredPhrase = {
  id: string
  text: string
  date: string // YYYY-MM-DD
  createdAt: number
  title: string
}

/** Stored essay (localStorage). */
export type StoredEssay = {
  id: string
  title: string
  input: string
  guidelines?: { wordCount?: string; thinkingStyle?: string; writingLevel?: string }
  outputPlaceholder?: string
  createdAt: number
  updatedAt: number
}

/** Extract a short title from text (one representative word). */
export function getShortTitle(text: string, maxLen = 18): string {
  const raw = (text || '').trim()
  if (!raw) return 'Sin título'
  const words = raw.replace(/[¿?!.,;:()"—]/g, ' ').split(/\s+/).filter(Boolean)
  const first = words[0] ?? raw.slice(0, 1)
  const title = first.length > maxLen ? first.slice(0, maxLen - 1) + '…' : first
  return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()
}
