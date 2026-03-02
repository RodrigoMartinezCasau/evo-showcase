'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { t } from '@/src/i18n'
import {
  type Message,
  type Thread,
  type DebateResponse,
} from '@/app/debate/types'
import {
  fetchDebates,
  fetchHealth,
  getApiBaseUrl,
  createDebate,
  getDebate,
  sendMessage,
  type DebateListItem,
} from '@/app/debate/api'
import { useConversations } from '@/src/context/ConversationsContext'
import { ReflexionMainContent } from '@/app/debate/components/ReflexionMainContent'
import { ChatView } from '@/app/debate/components/ChatView'

function toThreadItem(d: DebateListItem): Thread {
  return {
    id: d.id,
    title: d.title,
    messages: [],
    createdAt: new Date(d.updated_at).getTime(),
  }
}

export default function ReflexionPage() {
  const searchParams = useSearchParams()
  const idFromUrl = searchParams.get('id')

  const { setReflectionItems } = useConversations()
  const [debateList, setDebateList] = useState<DebateListItem[]>([])
  const [currentThread, setCurrentThread] = useState<Thread | null>(null)
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingDebate, setLoadingDebate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState(false)
  const setLoadingRef = useRef(setLoading)
  setLoadingRef.current = setLoading
  const placeholderIdRef = useRef<string | null>(null)
  const fullTextRef = useRef<string>('')
  const typewriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current)
        typewriterIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    fetchDebates()
      .then((debates) => {
        setDebateList(debates)
        setConnectionError(false)
      })
      .catch(() => {
        setDebateList([])
      })
  }, [])

  useEffect(() => {
    setReflectionItems(debateList)
  }, [debateList, setReflectionItems])

  useEffect(() => {
    fetchHealth()
      .then((ok) => setConnectionError(!ok))
      .catch(() => setConnectionError(true))
  }, [])

  const loadDebate = useCallback(async (id: string) => {
    setLoadingDebate(true)
    setError(null)
    try {
      const thread = await getDebate(id)
      if (thread) setCurrentThread(thread)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorLoadDebate'))
    } finally {
      setLoadingDebate(false)
    }
  }, [])

  useEffect(() => {
    if (idFromUrl) {
      setCurrentThreadId(idFromUrl)
      loadDebate(idFromUrl)
    } else {
      setCurrentThreadId(null)
      setCurrentThread(null)
    }
  }, [idFromUrl, loadDebate])

  const messages: Message[] = currentThread?.messages ?? []
  const isEmptyChat = messages.length === 0

  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

  const handleSend = useCallback(async (message: string) => {
    const text = (message || '').trim()
    if (!text || loading) return

    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined
    setInput('')
    setError(null)
    const userMsg: Message = { role: 'user', content: text }
    let debateId = currentThreadId

    if (!debateId) {
      if (isDev) console.debug('[reflexion] Home send: creating conversation then sending', { text: text.slice(0, 40) })
      try {
        const { id, title } = await createDebate(text, requestId)
        debateId = id
        if (isDev) console.debug('[reflexion] conversation created', { id, title })
        const newItem = { id, title, updated_at: new Date().toISOString() }
        setDebateList((prev) => [newItem, ...prev])
        setCurrentThreadId(id)
        setCurrentThread((prev) => ({
          id,
          title,
          messages: prev ? [...prev.messages, userMsg] : [userMsg],
          createdAt: Date.now(),
        }))
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e)
        const msg =
          raw === 'Failed to fetch' || raw.includes('fetch') || raw === 'NetworkError when attempting to fetch resource'
            ? t('errorConnection')
            : raw || t('errorCreateDebate')
        setError(msg)
        setConnectionError(true)
        return
      }
    } else {
      setCurrentThread((prev) =>
        prev ? { ...prev, messages: [...prev.messages, userMsg] } : null
      )
    }

    const placeholderId = `typing-${Date.now()}`
    placeholderIdRef.current = placeholderId
    const streamingPlaceholder: Message = {
      role: 'assistant',
      content: '',
      streaming: true,
      id: placeholderId,
    }
    setCurrentThread((prev) =>
      prev ? { ...prev, messages: [...prev.messages, streamingPlaceholder] } : null
    )
    setLoading(true)
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current)
      typewriterIntervalRef.current = null
    }

    if (isDev) console.debug('[reflexion] message send called', { debateId, textLength: text.length })

    try {
      const data = await sendMessage(debateId!, text, requestId)
      const fullText = data.assistant_text ?? ''
      fullTextRef.current = fullText
      const realId = data.message_id
      const fullPayload: Omit<Extract<Message, { role: 'assistant' }>, 'role'> = {
        content: fullText,
        id: realId,
        debateResponse: data.debate_response as DebateResponse,
        nextQuestion: data.next_question,
        topic: data.topic,
        lang: data.lang,
        streaming: false,
      }

      setCurrentThread((prev) => {
        if (!prev) return prev
        const idx = prev.messages.findIndex((m) => m.role === 'assistant' && m.id === placeholderId)
        if (idx === -1) return prev
        const next = [...prev.messages]
        next[idx] = { role: 'assistant', ...fullPayload, content: '', streaming: true }
        return { ...prev, messages: next }
      })
      setConnectionError(false)
      setLoadingRef.current(false)

      if (fullText.length === 0) {
        setCurrentThread((prev) => {
          if (!prev) return prev
          const idx = prev.messages.findIndex((m) => m.role === 'assistant' && m.id === realId)
          if (idx === -1) return prev
          const next = [...prev.messages]
          const msg = next[idx]
          if (msg.role !== 'assistant') return prev
          next[idx] = { ...msg, content: '', streaming: false }
          return { ...prev, messages: next }
        })
        return
      }
      const chunkSize = 3
      const intervalMs = 15
      let index = 0
      typewriterIntervalRef.current = setInterval(() => {
        index += chunkSize
        const slice = fullText.slice(0, Math.min(index, fullText.length))
        const done = slice.length >= fullText.length
        setCurrentThread((prev) => {
          if (!prev) return prev
          const idx = prev.messages.findIndex((m) => m.role === 'assistant' && m.id === realId)
          if (idx === -1) return prev
          const msg = prev.messages[idx]
          if (msg.role !== 'assistant') return prev
          const next = [...prev.messages]
          next[idx] = {
            ...msg,
            content: slice,
            streaming: !done,
          }
          return { ...prev, messages: next }
        })
        if (done && typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current)
          typewriterIntervalRef.current = null
        }
      }, intervalMs)
    } catch (err) {
      const errorContent = t('errorRetry')
      const rawMessage = err instanceof Error ? err.message : String(err)
      const displayError =
        rawMessage === 'Failed to fetch' || rawMessage.includes('fetch') || rawMessage === 'NetworkError when attempting to fetch resource'
          ? t('errorConnection')
          : rawMessage
      setError(displayError)
      setCurrentThread((prev) => {
        if (!prev) return prev
        const idx = prev.messages.findIndex((m) => m.role === 'assistant' && m.id === placeholderId)
        if (idx === -1) return prev
        const next = [...prev.messages]
        const msg = next[idx]
        if (msg.role !== 'assistant') return prev
        next[idx] = { ...msg, content: errorContent, streaming: false }
        return { ...prev, messages: next }
      })
      setLoading(false)
    }
  }, [loading, currentThreadId])

  const handleFactsLoaded = useCallback((messageIndex: number, data: import('@/app/debate/types').FactsLayer) => {
    setCurrentThread((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        messages: prev.messages.map((m, i) =>
          i === messageIndex && m.role === 'assistant'
            ? { ...m, factsCache: data }
            : m
        ),
      }
    })
  }, [])

  const handleQuotesLoaded = useCallback((messageIndex: number, data: import('@/app/debate/types').AuthorLayer) => {
    setCurrentThread((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        messages: prev.messages.map((m, i) =>
          i === messageIndex && m.role === 'assistant'
            ? { ...m, quotesCache: data }
            : m
        ),
      }
    })
  }, [])

  return (
    <ReflexionMainContent
      inputValue={input}
      onInputChange={setInput}
      onSend={handleSend}
      loading={loading}
      placeholder={currentThreadId ? t('placeholderInConversation') : t('placeholderDebateExample')}
      error={
        error ||
        (connectionError
          ? t('errorConnection') +
            (typeof window !== 'undefined'
              ? ` Llamando a: ${getApiBaseUrl()} — comprueba que esa URL responda en /health.`
              : '')
          : null)
      }
      isEmptyChat={isEmptyChat}
    >
      <ChatView
        messages={messages}
        loading={loading || loadingDebate}
        onFactsLoaded={handleFactsLoaded}
        onQuotesLoaded={handleQuotesLoaded}
      />
    </ReflexionMainContent>
  )
}
