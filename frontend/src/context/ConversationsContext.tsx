'use client'

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import type { ConversationItem, ConversationType, StoredPhrase, StoredEssay } from '@/src/types/conversation'
import { getShortTitle } from '@/src/types/conversation'

const PHRASES_KEY = 'evo_phrases'
const ESSAYS_KEY = 'evo_essays'

function loadPhrases(): StoredPhrase[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PHRASES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    return Array.isArray(parsed) ? parsed.filter(isStoredPhrase) : []
  } catch {
    return []
  }
}

function isStoredPhrase(x: unknown): x is StoredPhrase {
  return x != null && typeof x === 'object' && 'id' in x && 'text' in x && 'date' in x
}

function loadEssays(): StoredEssay[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ESSAYS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    return Array.isArray(parsed) ? parsed.filter(isStoredEssay) : []
  } catch {
    return []
  }
}

function isStoredEssay(x: unknown): x is StoredEssay {
  return x != null && typeof x === 'object' && 'id' in x && 'title' in x && 'input' in x
}

function savePhrases(phrases: StoredPhrase[]) {
  try {
    localStorage.setItem(PHRASES_KEY, JSON.stringify(phrases))
  } catch {}
}

function saveEssays(essays: StoredEssay[]) {
  try {
    localStorage.setItem(ESSAYS_KEY, JSON.stringify(essays))
  } catch {}
}

type ReflectionItem = { id: string; title: string; updated_at: string }

type ConversationsContextValue = {
  /** Unified list: reflections (from API) + phrases + essays. */
  items: ConversationItem[]
  reflectionItems: ReflectionItem[]
  phraseItems: StoredPhrase[]
  essayItems: StoredEssay[]
  setReflectionItems: (items: ReflectionItem[]) => void
  addPhrase: (text: string) => StoredPhrase | null
  addEssay: (input: string, guidelines?: StoredEssay['guidelines']) => StoredEssay
  getPhraseById: (id: string) => StoredPhrase | undefined
  getEssayById: (id: string) => StoredEssay | undefined
  canSubmitPhraseToday: () => boolean
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null)

function toConversationItem(
  r: ReflectionItem,
  type: 'reflection'
): ConversationItem
function toConversationItem(
  p: StoredPhrase,
  type: 'phrase'
): ConversationItem
function toConversationItem(
  e: StoredEssay,
  type: 'essay'
): ConversationItem
function toConversationItem(
  x: ReflectionItem | StoredPhrase | StoredEssay,
  type: ConversationType
): ConversationItem {
  if (type === 'reflection') {
    const r = x as ReflectionItem
    return {
      id: r.id,
      type: 'reflection',
      title: r.title,
      createdAt: new Date(r.updated_at).getTime(),
      updatedAt: new Date(r.updated_at).getTime(),
      backendId: r.id,
    }
  }
  if (type === 'phrase') {
    const p = x as StoredPhrase
    return {
      id: p.id,
      type: 'phrase',
      title: p.title,
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    }
  }
  const e = x as StoredEssay
  return {
    id: e.id,
    type: 'essay',
    title: e.title,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [reflectionItems, setReflectionItemsState] = useState<ReflectionItem[]>([])
  const [phraseItems, setPhraseItems] = useState<StoredPhrase[]>([])
  const [essayItems, setEssayItems] = useState<StoredEssay[]>([])

  useEffect(() => {
    setPhraseItems(loadPhrases())
    setEssayItems(loadEssays())
  }, [])

  const setReflectionItems = useCallback((items: ReflectionItem[]) => {
    setReflectionItemsState(items)
  }, [])

  const addPhrase = useCallback((text: string): StoredPhrase | null => {
    const today = new Date().toISOString().slice(0, 10)
    const existing = phraseItems.some((p) => p.date === today)
    if (existing) return null
    const id = `phrase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const title = getShortTitle(text)
    const phrase: StoredPhrase = {
      id,
      text,
      date: today,
      createdAt: Date.now(),
      title,
    }
    setPhraseItems((prev) => {
      const already = prev.some((p) => p.date === today)
      if (already) return prev
      const next = [phrase, ...prev]
      savePhrases(next)
      return next
    })
    return phrase
  }, [phraseItems])

  const addEssay = useCallback((
    input: string,
    guidelines?: StoredEssay['guidelines']
  ): StoredEssay => {
    const id = `essay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const title = getShortTitle(input)
    const essay: StoredEssay = {
      id,
      title,
      input,
      guidelines,
      outputPlaceholder: 'Próximamente',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setEssayItems((prev) => {
      const next = [essay, ...prev]
      saveEssays(next)
      return next
    })
    return essay
  }, [])

  const getPhraseById = useCallback((id: string) => phraseItems.find((p) => p.id === id), [phraseItems])
  const getEssayById = useCallback((id: string) => essayItems.find((e) => e.id === id), [essayItems])

  const canSubmitPhraseToday = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    return !phraseItems.some((p) => p.date === today)
  }, [phraseItems])

  const items: ConversationItem[] = [
    ...reflectionItems.map((r) => toConversationItem(r, 'reflection')),
    ...phraseItems.map((p) => toConversationItem(p, 'phrase')),
    ...essayItems.map((e) => toConversationItem(e, 'essay')),
  ].sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))

  const value: ConversationsContextValue = {
    items,
    reflectionItems,
    phraseItems,
    essayItems,
    setReflectionItems,
    addPhrase,
    addEssay,
    getPhraseById,
    getEssayById,
    canSubmitPhraseToday,
  }

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  )
}

export function useConversations() {
  const ctx = useContext(ConversationsContext)
  if (!ctx) throw new Error('useConversations must be used within ConversationsProvider')
  return ctx
}
