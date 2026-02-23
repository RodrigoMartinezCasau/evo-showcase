'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { t } from '@/src/i18n'
import {
  type Message,
  type Thread,
  type DebateResponse,
  type CreatorResponse,
} from './types'
import {
  fetchDebates,
  fetchFolders,
  fetchHealth,
  getApiBaseUrl,
  createDebate,
  getDebate,
  sendMessage,
  updateDebateTitle,
  toggleFavorite,
  createFolder,
  updateFolderName,
  moveDebateToFolder,
  deleteDebate,
  deleteFolder,
  type DebateListItem,
  type FolderListItem,
} from './api'
import { MainLayout } from './components/MainLayout'
import { ChatView } from './components/ChatView'

function toThreadItem(d: DebateListItem): Thread {
  return {
    id: d.id,
    title: d.title,
    messages: [],
    createdAt: new Date(d.updated_at).getTime(),
  }
}

export default function DebatePage() {
  const [debateList, setDebateList] = useState<DebateListItem[]>([])
  const [folders, setFolders] = useState<FolderListItem[]>([])
  const [currentThread, setCurrentThread] = useState<Thread | null>(null)
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingDebate, setLoadingDebate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState(false)
  const [creatorLoading, setCreatorLoading] = useState(false)
  const topBarLeftRef = useRef<HTMLDivElement>(null)
  const setLoadingRef = useRef(setLoading)
  setLoadingRef.current = setLoading
  const placeholderIdRef = useRef<string | null>(null)
  const fullTextRef = useRef<string>('')
  const typewriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [topBarReady, setTopBarReady] = useState(false)

  useEffect(() => {
    setTopBarReady(true)
  }, [])

  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current)
        typewriterIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchDebates(), fetchFolders()])
      .then(([debates, folderList]) => {
        setDebateList(debates)
        setFolders(folderList)
        setConnectionError(false)
      })
      .catch(() => {
        setDebateList([])
        setFolders([])
      })
  }, [])

  useEffect(() => {
    fetchHealth()
      .then((ok) => setConnectionError(!ok))
      .catch(() => setConnectionError(true))
  }, [])

  const threads: Thread[] = debateList.map(toThreadItem)
  const messages: Message[] = currentThread?.messages ?? []
  const isEmptyChat = messages.length === 0

  const loadDebate = useCallback(async (id: string) => {
    setLoadingDebate(true)
    setError(null)
    try {
      const t = await getDebate(id)
      if (t) setCurrentThread(t)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorLoadDebate'))
    } finally {
      setLoadingDebate(false)
    }
  }, [])

  /** "Nuevo debate": solo resetea la UI a pantalla inicial. No crea debate hasta que el usuario envíe el primer mensaje. */
  const handleNewDebate = useCallback(() => {
    setError(null)
    setCurrentThreadId(null)
    setCurrentThread(null)
    setInput('')
  }, [])

  const handleSelectThread = useCallback(
    (id: string) => {
      setCurrentThreadId(id)
      loadDebate(id)
    },
    [loadDebate]
  )

  const handleUpdateTitle = useCallback(async (id: string, title: string) => {
    const newTitle = title.trim().slice(0, 30)
    if (!newTitle) return
    setDebateList((prev) => prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d)))
    if (currentThread?.id === id) setCurrentThread((prev) => (prev ? { ...prev, title: newTitle } : null))
    try {
      await updateDebateTitle(id, newTitle)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorUpdateTitle'))
      fetchDebates().then(setDebateList).catch(() => {})
    }
  }, [currentThread?.id])

  const handleGoHome = useCallback(() => {
    setCurrentThreadId(null)
    setCurrentThread(null)
  }, [])

  const favorites = debateList.filter((d) => d.is_favorite).map((d) => d.id)

  const handleToggleFavorite = useCallback(async (id: string) => {
    try {
      await toggleFavorite(id)
      const list = await fetchDebates()
      setDebateList(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al marcar favorito')
    }
  }, [])

  const handleCreateFolder = useCallback(async (name?: string): Promise<string | undefined> => {
    try {
      const folder = await createFolder(name ?? 'Nueva carpeta')
      const list = await fetchFolders()
      setFolders(list)
      return folder.id
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear carpeta')
      return undefined
    }
  }, [])

  const handleRenameFolder = useCallback(async (folderId: string, name: string) => {
    try {
      await updateFolderName(folderId, name)
      const list = await fetchFolders()
      setFolders(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al renombrar carpeta')
    }
  }, [])

  const handleMoveToFolder = useCallback(async (debateId: string, folderId: string | null) => {
    try {
      await moveDebateToFolder(debateId, folderId)
      const [debates, folderList] = await Promise.all([fetchDebates(), fetchFolders()])
      setDebateList(debates)
      setFolders(folderList)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al mover a carpeta')
    }
  }, [])

  const handleDeleteDebate = useCallback(
    async (id: string) => {
      try {
        await deleteDebate(id)
        setDebateList((prev) => prev.filter((d) => d.id !== id))
        if (currentThreadId === id) {
          setCurrentThreadId(null)
          setCurrentThread(null)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('errorDeleteDebate'))
        throw e
      }
    },
    [currentThreadId]
  )

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    try {
      await deleteFolder(folderId)
      setFolders((prev) => prev.filter((f) => f.id !== folderId))
      setDebateList((prev) =>
        prev.map((d) => (d.folder_id === folderId ? { ...d, folder_id: null } : d))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorDeleteFolder'))
      throw e
    }
  }, [])

  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

  const handleSend = useCallback(async (message: string) => {
    const text = (message || '').trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    const userMsg: Message = { role: 'user', content: text }
    let debateId = currentThreadId

    if (!debateId) {
      if (isDev) console.debug('[debate] Home send: creating conversation then sending', { text: text.slice(0, 40) })
      try {
        const { id, title } = await createDebate(text)
        debateId = id
        if (isDev) console.debug('[debate] conversation created', { id, title })
        setDebateList((prev) => [{ id, title, updated_at: new Date().toISOString() }, ...prev])
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

    if (isDev) console.debug('[debate] message send called', { debateId, textLength: text.length })

    try {
      const data = await sendMessage(debateId!, text)
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

  const handleGenerateCreator = useCallback((_messageIndex: number) => {
    // Creator is now fetched via AssistantCard -> fetchMessageCreator
  }, [])

  const handleFactsLoaded = useCallback((messageIndex: number, data: import('./types').FactsLayer) => {
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

  const handleQuotesLoaded = useCallback((messageIndex: number, data: import('./types').AuthorLayer) => {
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

  const handleCreatorLoaded = useCallback((messageIndex: number, data: CreatorResponse) => {
    setCurrentThread((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        messages: prev.messages.map((m, i) =>
          i === messageIndex && m.role === 'assistant'
            ? { ...m, creatorResponse: data }
            : m
        ),
      }
    })
  }, [])

  return (
    <MainLayout
      threads={threads}
      currentThreadId={currentThreadId}
      onNewDebate={handleNewDebate}
      onSelectThread={handleSelectThread}
      onGoHome={handleGoHome}
      onUpdateTitle={handleUpdateTitle}
      topBarLeftRef={topBarLeftRef}
      topBarReady={topBarReady}
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
              ? ` Llamando a: ${getApiBaseUrl()} — comprueba que esa URL responda en /health. Si es la del frontend, crea el proyecto API y pon su URL en NEXT_PUBLIC_API_URL, luego Redeploy.`
              : '')
          : null)
      }
      isEmptyChat={isEmptyChat}
      favorites={favorites}
      folders={folders}
      onToggleFavorite={handleToggleFavorite}
      onCreateFolder={handleCreateFolder}
      onRenameFolder={handleRenameFolder}
      onMoveToFolder={handleMoveToFolder}
      onDeleteDebate={handleDeleteDebate}
      onDeleteFolder={handleDeleteFolder}
    >
      <ChatView
        messages={messages}
        loading={loading || loadingDebate}
        creatorLoading={creatorLoading}
        onGenerateCreator={handleGenerateCreator}
        onFactsLoaded={handleFactsLoaded}
        onQuotesLoaded={handleQuotesLoaded}
        onCreatorLoaded={handleCreatorLoaded}
      />
    </MainLayout>
  )
}
