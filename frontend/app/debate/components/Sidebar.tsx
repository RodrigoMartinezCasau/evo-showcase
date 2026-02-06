'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { t } from '@/src/i18n'
import type { Thread } from '../types'

const SIDEBAR_COLLAPSED_KEY = 'debate_sidebar_collapsed'
const SIDEBAR_FAVORITES_OPEN_KEY = 'debate_sidebar_favorites_open'
const SIDEBAR_FOLDERS_OPEN_KEY = 'debate_sidebar_folders_open'
const FAVORITES_KEY = 'debate_favorites'
const FOLDERS_KEY = 'debate_folders'

export type Folder = { id: string; name: string; chatIds: string[] }

function foldersFromList(list: { id: string; name: string; chatIds: string[] }[]): Folder[] {
  return list.map((f) => ({ id: f.id, name: f.name, chatIds: f.chatIds || [] }))
}

function loadFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadFolders(): Folder[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(FOLDERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((f: unknown) => f && typeof f === 'object' && 'id' in f && 'name' in f && 'chatIds' in f)
  } catch {
    return []
  }
}

function saveFavorites(favorites: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  } catch {}
}

function saveFolders(folders: Folder[]) {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
  } catch {}
}

const sidebarBaseStyle = (collapsed: boolean): React.CSSProperties => ({
  width: collapsed ? 64 : 260,
  minWidth: collapsed ? 64 : 260,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: '#171717',
  borderRight: '1px solid #262626',
  transition: 'width 0.2s ease',
  overflow: 'hidden',
  flexShrink: 0,
})

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px',
  borderBottom: '1px solid #262626',
  minHeight: 52,
}

const toggleButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  minWidth: 40,
  borderRadius: 8,
  background: '#262626',
  border: '1px solid #404040',
  color: '#fafafa',
  fontSize: 18,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 0.15s',
}

const toggleButtonFixedStyle: React.CSSProperties = {
  ...toggleButtonStyle,
  position: 'fixed',
  left: 12,
  top: 12,
  zIndex: 50,
}

const homeButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  minWidth: 40,
  borderRadius: '50%',
  background: 'linear-gradient(90deg, #c7ff02 0%, #7000ff 100%)',
  border: 'none',
  color: '#fff',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 0.15s, transform 0.15s',
}

const newButtonStyle: React.CSSProperties = {
  margin: '12px 12px 8px',
  padding: '10px 14px',
  background: '#262626',
  border: '1px solid #404040',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const newButtonCollapsedStyle: React.CSSProperties = {
  margin: '8px',
  padding: 0,
  width: 40,
  height: 40,
  minWidth: 40,
  borderRadius: 8,
  background: '#262626',
  border: '1px solid #404040',
  color: '#fafafa',
  fontSize: 18,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const searchStyle: React.CSSProperties = {
  margin: '0 12px 8px',
  padding: '8px 12px',
  background: '#262626',
  border: '1px solid #404040',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 13,
  outline: 'none',
  width: 'calc(100% - 24px)',
  boxSizing: 'border-box',
}

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '4px 8px',
  minWidth: 0,
}

const threadItemStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  marginBottom: 2,
  background: active ? '#262626' : 'transparent',
  color: active ? '#fafafa' : '#a3a3a3',
  fontSize: 13,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
  width: '100%',
  textAlign: 'left',
  border: 'none',
  borderLeft: active ? '3px solid #7000ff' : '3px solid transparent',
})

const threadIconStyle = (active: boolean): React.CSSProperties => ({
  width: 40,
  height: 40,
  minWidth: 40,
  borderRadius: 8,
  margin: '0 auto 4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: active ? '#262626' : 'transparent',
  border: 'none',
  borderLeft: active ? '3px solid #7000ff' : '3px solid transparent',
  color: active ? '#fafafa' : '#a3a3a3',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
})

const userBlockStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid #262626',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  color: '#a3a3a3',
  fontSize: 13,
}

const userBlockCollapsedStyle: React.CSSProperties = {
  padding: '12px',
  borderTop: '1px solid #262626',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 12px',
  marginTop: 2,
  fontSize: 12,
  fontWeight: 600,
  color: '#fafafa',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  cursor: 'pointer',
  background: 'transparent',
  border: 'none',
  width: '100%',
  textAlign: 'left',
}

const sectionHeaderStyleStatic: React.CSSProperties = {
  ...sectionHeaderStyle,
  cursor: 'default',
}

const sectionContentStyle: React.CSSProperties = {
  paddingLeft: 4,
  paddingBottom: 2,
}

const folderHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  fontSize: 13,
  color: '#e4e4e7',
  cursor: 'pointer',
  background: 'transparent',
  border: 'none',
  width: '100%',
  textAlign: 'left',
}

const menuStyle: React.CSSProperties = {
  position: 'absolute' as const,
  top: '100%',
  right: 0,
  marginTop: 2,
  minWidth: 180,
  background: '#262626',
  border: '1px solid #404040',
  borderRadius: 8,
  padding: '4px 0',
  zIndex: 100,
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  color: '#e4e4e7',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
}

const menuSubmenuBlockStyle: React.CSSProperties = {
  maxHeight: 200,
  overflowY: 'auto',
  padding: '4px 0',
  borderTop: '1px solid #404040',
  marginTop: 4,
  background: '#1f1f1f',
  borderRadius: 4,
  marginLeft: 8,
  marginRight: 8,
}

const menuItemDangerStyle: React.CSSProperties = {
  ...menuItemStyle,
  color: '#f87171',
}

const avatarStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: '#404040',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fafafa',
  fontSize: 12,
  fontWeight: 600,
}

type Props = {
  currentThreadId: string | null
  onNewDebate: () => void
  onSelectThread: (id: string) => void
  onGoHome: () => void
  threads: Thread[]
  setThreads?: (t: Thread[] | ((prev: Thread[]) => Thread[])) => void
  onUpdateTitle?: (id: string, title: string) => void
  topBarLeftRef?: React.RefObject<HTMLDivElement | null>
  topBarReady?: boolean
  /** e.g. "New debate", "New students", "New script". Default: "New debate". */
  newButtonLabel?: string
  /** When provided, favorites/folders are controlled from backend (no localStorage). */
  favorites?: string[]
  folders?: { id: string; name: string; chatIds: string[] }[]
  onToggleFavorite?: (debateId: string) => void | Promise<void>
  /** Create folder; when used from "move to folder", return new folder id. */
  onCreateFolder?: (name?: string) => void | Promise<void | string>
  onRenameFolder?: (folderId: string, name: string) => void | Promise<void>
  onMoveToFolder?: (debateId: string, folderId: string | null) => void | Promise<void>
  onDeleteDebate?: (debateId: string) => void | Promise<void>
  onDeleteFolder?: (folderId: string) => void | Promise<void>
}

const DEFAULT_NEW_LABEL = t('newDebate')

export function Sidebar({
  currentThreadId,
  onNewDebate,
  onSelectThread,
  onGoHome,
  threads,
  onUpdateTitle,
  topBarLeftRef,
  topBarReady,
  newButtonLabel = DEFAULT_NEW_LABEL,
  favorites: favoritesProp,
  folders: foldersProp,
  onToggleFavorite: onToggleFavoriteProp,
  onCreateFolder: onCreateFolderProp,
  onRenameFolder: onRenameFolderProp,
  onMoveToFolder: onMoveToFolderProp,
  onDeleteDebate: onDeleteDebateProp,
  onDeleteFolder: onDeleteFolderProp,
}: Props) {
  const useBackend = favoritesProp !== undefined && onToggleFavoriteProp !== undefined
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [favoritesLocal, setFavoritesLocal] = useState<string[]>([])
  const [foldersLocal, setFoldersLocal] = useState<Folder[]>([])
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [folderOpenIds, setFolderOpenIds] = useState<Set<string>>(new Set())
  const [menuThreadId, setMenuThreadId] = useState<string | null>(null)
  const [moveSubmenuForThreadId, setMoveSubmenuForThreadId] = useState<string | null>(null)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editFolderValue, setEditFolderValue] = useState('')
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'debate'; id: string } | { type: 'folder'; id: string } | null>(null)
  const [creatingFolderForThreadId, setCreatingFolderForThreadId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderError, setNewFolderError] = useState('')
  const newFolderInputRef = useRef<HTMLInputElement>(null)
  const newFolderFormRef = useRef<HTMLDivElement>(null)
  const folderMenuRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const favorites = useBackend ? (favoritesProp ?? []) : favoritesLocal
  const folders = useBackend ? foldersFromList(foldersProp ?? []) : foldersLocal

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (raw !== null) setCollapsed(raw === 'true')
      const favOpen = localStorage.getItem(SIDEBAR_FAVORITES_OPEN_KEY)
      if (favOpen !== null) setFavoritesOpen(favOpen === 'true')
      const folOpen = localStorage.getItem(SIDEBAR_FOLDERS_OPEN_KEY)
      if (folOpen !== null) setFoldersOpen(folOpen === 'true')
    } catch {}
  }, [])

  useEffect(() => {
    if (!useBackend) {
      setFavoritesLocal(loadFavorites())
      setFoldersLocal(loadFolders())
    }
  }, [useBackend])

  const setFavoritesOpenAndPersist = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setFavoritesOpen((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      try {
        localStorage.setItem(SIDEBAR_FAVORITES_OPEN_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  const setFoldersOpenAndPersist = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setFoldersOpen((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      try {
        localStorage.setItem(SIDEBAR_FOLDERS_OPEN_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  useEffect(() => {
    if (!useBackend) saveFavorites(favoritesLocal)
  }, [useBackend, favoritesLocal])

  useEffect(() => {
    if (!useBackend) saveFolders(foldersLocal)
  }, [useBackend, foldersLocal])

  const toggleFavorite = useCallback(
    (threadId: string) => {
      if (useBackend && onToggleFavoriteProp) {
        void onToggleFavoriteProp(threadId)
        return
      }
      setFavoritesLocal((prev) =>
        prev.includes(threadId) ? prev.filter((id) => id !== threadId) : [...prev, threadId]
      )
    },
    [useBackend, onToggleFavoriteProp]
  )

  const getThreadFolderId = useCallback(
    (threadId: string) => folders.find((f) => f.chatIds.includes(threadId))?.id ?? null,
    [folders]
  )

  const assignToFolder = useCallback(
    (threadId: string, folderId: string | null) => {
      if (useBackend && onMoveToFolderProp) {
        void onMoveToFolderProp(threadId, folderId)
        setMoveSubmenuForThreadId(null)
        return
      }
      setFoldersLocal((prev) => {
        const next = prev.map((f) => ({
          ...f,
          chatIds: f.chatIds.filter((id) => id !== threadId),
        }))
        if (folderId) {
          const idx = next.findIndex((f) => f.id === folderId)
          if (idx !== -1) next[idx] = { ...next[idx], chatIds: [...next[idx].chatIds, threadId] }
        }
        return next
      })
      setMoveSubmenuForThreadId(null)
    },
    [useBackend, onMoveToFolderProp]
  )

  const addFolder = useCallback(
    (name?: string): string => {
      if (useBackend && onCreateFolderProp) {
        void onCreateFolderProp(name)
        return `folder-pending`
      }
      const n = (name || t('sidebarNewFolder')).trim() || t('sidebarNewFolder')
      const id = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setFoldersLocal((prev) => [...prev, { id, name: n, chatIds: [] }])
      setFolderOpenIds((prev) => new Set(prev).add(id))
      return id
    },
    [useBackend, onCreateFolderProp]
  )

  const toggleFolderOpen = useCallback((folderId: string) => {
    setFolderOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])

  const updateFolderName = useCallback(
    (folderId: string, name: string) => {
      const trimmed = name.trim().slice(0, 30)
      if (!trimmed) return
      if (useBackend && onRenameFolderProp) {
        void onRenameFolderProp(folderId, trimmed)
        setEditingFolderId(null)
        return
      }
      setFoldersLocal((prev) => prev.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f)))
      setEditingFolderId(null)
    },
    [useBackend, onRenameFolderProp]
  )

  useEffect(() => {
    if (!menuThreadId) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuThreadId(null)
        setMoveSubmenuForThreadId(null)
        setCreatingFolderForThreadId(null)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuThreadId])

  useEffect(() => {
    if (!folderMenuId) return
    const handleClick = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setFolderMenuId(null)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [folderMenuId])

  useEffect(() => {
    if (creatingFolderForThreadId) {
      setNewFolderName('')
      setNewFolderError('')
      queueMicrotask(() => {
        newFolderFormRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        newFolderInputRef.current?.focus()
      })
    }
  }, [creatingFolderForThreadId])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {}
      return next
    })
  }

  const filtered = search.trim()
    ? threads.filter((thread) => thread.title.toLowerCase().includes(search.trim().toLowerCase()))
    : threads

  const favoriteThreads = filtered.filter((t) => favorites.includes(t.id))
  const generalThreads = filtered.filter((t) => !getThreadFolderId(t.id))
  const threadsInFolder = (folderId: string) =>
    filtered.filter((t) => folders.find((f) => f.id === folderId)?.chatIds.includes(t.id) ?? false)

  const portalTarget =
    mounted && typeof document !== 'undefined' && topBarReady && topBarLeftRef?.current
      ? topBarLeftRef.current
      : mounted && typeof document !== 'undefined'
        ? document.body
        : null
  const toggleStyle = portalTarget && portalTarget !== document.body ? toggleButtonStyle : toggleButtonFixedStyle
  const toggleButton = (
    <button
      type="button"
      onClick={toggleCollapsed}
      style={toggleStyle}
      title={collapsed ? t('sidebarExpand') : t('sidebarCollapse')}
      aria-label={collapsed ? t('sidebarExpand') : t('sidebarCollapse')}
    >
      ≡
    </button>
  )

  return (
    <>
      {portalTarget && createPortal(toggleButton, portalTarget)}
      <aside style={sidebarBaseStyle(collapsed)}>
      {collapsed ? (
        <button
          type="button"
          onClick={onNewDebate}
          style={newButtonCollapsedStyle}
          title={newButtonLabel}
        >
          +
        </button>
      ) : (
        <button type="button" onClick={onNewDebate} style={newButtonStyle}>
          <span style={{ fontSize: 16 }}>+</span>
          {newButtonLabel}
        </button>
      )}

      {!collapsed && (
        <input
          type="text"
          placeholder={t('sidebarSearchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchStyle}
        />
      )}

      <div className="debate-sidebar-list" style={listStyle}>
        {collapsed
          ? filtered.map((thread) => (
              <button
                type="button"
                key={thread.id}
                style={threadIconStyle(currentThreadId === thread.id)}
                onClick={() => onSelectThread(thread.id)}
                title={thread.title}
              >
                {(thread.title || t('sidebarDefaultTitle')).charAt(0).toUpperCase()}
              </button>
            ))
          : (() => {
              const renderRow = (thread: Thread) => {
                const isEditing = editingId === thread.id
                const isFavorite = favorites.includes(thread.id)
                const menuOpen = menuThreadId === thread.id
                const moveSubOpen = moveSubmenuForThreadId === thread.id
                const title = thread.title || t('sidebarDefaultTitle')
                if (isEditing) {
                  return (
                    <input
                      key={thread.id}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value.slice(0, 30))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const v = editValue.trim()
                          if (v && onUpdateTitle) {
                            onUpdateTitle(thread.id, v)
                            setEditingId(null)
                          }
                        } else if (e.key === 'Escape') {
                          setEditingId(null)
                        }
                      }}
                      onBlur={() => {
                        const v = editValue.trim()
                        if (v && onUpdateTitle) onUpdateTitle(thread.id, v)
                        setEditingId(null)
                      }}
                      autoFocus
                      style={{
                        ...threadItemStyle(currentThreadId === thread.id),
                        padding: '8px 10px',
                        width: '100%',
                        boxSizing: 'border-box',
                        font: 'inherit',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )
                }
                return (
                  <div key={thread.id} style={{ position: 'relative', width: '100%', minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        minWidth: 0,
                        width: '100%',
                      }}
                    >
                      <button
                        type="button"
                        style={{ ...threadItemStyle(currentThreadId === thread.id), flex: 1, minWidth: 0 }}
                        onClick={() => onSelectThread(thread.id)}
                        title={title}
                      >
                        {title.length > 18 ? title.slice(0, 17) + '…' : title}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(thread.id)
                        }}
                        style={{
                          flexShrink: 0,
                          width: 22,
                          height: 22,
                          padding: 0,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={isFavorite ? t('sidebarUnmarkFavorite') : t('sidebarMarkFavorite')}
                        aria-label={isFavorite ? t('sidebarUnmarkFavorite') : t('sidebarMarkFavorite')}
                      >
                        <img
                          src={isFavorite ? '/icons/star-outline-light.png' : '/icons/star-outline-dark.png'}
                          alt=""
                          role="presentation"
                          style={{ display: 'block', width: 'var(--sidebar-icon-size-favorite)', height: 'var(--sidebar-icon-size-favorite)' }}
                        />
                      </button>
                      {onUpdateTitle && (
                        <div style={{ position: 'relative', flexShrink: 0 }} ref={menuOpen ? menuRef : undefined}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuThreadId((id) => (id === thread.id ? null : thread.id))
                              setMoveSubmenuForThreadId(null)
                            }}
                            style={{
                              width: 'var(--sidebar-icon-size-pencil)',
                              height: 'var(--sidebar-icon-size-pencil)',
                              padding: 0,
                              background: 'transparent',
                              border: 'none',
                              color: '#737373',
                              cursor: 'pointer',
                              fontSize: 'var(--sidebar-icon-size-pencil)',
                              opacity: 0.6,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title={t('sidebarEditTitle')}
                            aria-label={t('sidebarEditTitle')}
                          >
                            ✎
                          </button>
                          {menuOpen && (
                            <div style={menuStyle} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                style={menuItemStyle}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#404040'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                }}
                                onClick={() => {
                                  toggleFavorite(thread.id)
                                  setMenuThreadId(null)
                                }}
                              >
                                {isFavorite ? t('sidebarUnmarkFavorite') : t('sidebarMarkFavorite')}
                              </button>
                              <button
                                type="button"
                                style={menuItemStyle}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#404040'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                }}
                                onClick={() => {
                                  setEditingId(thread.id)
                                  setEditValue(title)
                                  setMenuThreadId(null)
                                }}
                              >
                                {t('sidebarRename')}
                              </button>
                              {onDeleteDebateProp && (
                                <button
                                  type="button"
                                  style={menuItemDangerStyle}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#404040'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent'
                                  }}
                                  onClick={() => {
                                    setMenuThreadId(null)
                                    setDeleteConfirm({ type: 'debate', id: thread.id })
                                  }}
                                >
                                  {t('sidebarDeleteDebate')}
                                </button>
                              )}
                              <div>
                                <button
                                  type="button"
                                  style={menuItemStyle}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#404040'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent'
                                  }}
                                  onClick={() =>
                                    setMoveSubmenuForThreadId((id) => (id === thread.id ? null : thread.id))
                                  }
                                >
                                  {t('sidebarMoveToFolder')} {moveSubOpen ? '▲' : '↓'}
                                </button>
                                {moveSubOpen && (
                                  <div style={menuSubmenuBlockStyle}>
                                    {/* Panel nueva carpeta: siempre primero cuando está activo para que sea visible */}
                                    {creatingFolderForThreadId === thread.id ? (
                                      <div
                                        ref={newFolderFormRef}
                                        style={{
                                          padding: '8px 12px',
                                          borderBottom: '1px solid #404040',
                                          marginBottom: 4,
                                          background: '#262626',
                                          borderRadius: 6,
                                          marginLeft: 4,
                                          marginRight: 4,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <input
                                          ref={newFolderInputRef}
                                          type="text"
                                          value={newFolderName}
                                          onChange={(e) => {
                                            setNewFolderName(e.target.value.slice(0, 30))
                                            setNewFolderError('')
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                              setCreatingFolderForThreadId(null)
                                              setNewFolderName('')
                                              setNewFolderError('')
                                            }
                                            if (e.key === 'Enter') {
                                              e.preventDefault()
                                              const trimmed = newFolderName.trim()
                                              if (!trimmed) return
                                              const lower = trimmed.toLowerCase()
                                              if (folders.some((f) => f.name.trim().toLowerCase() === lower)) {
                                                setNewFolderError(t('newFolderDuplicateError'))
                                                return
                                              }
                                              if (useBackend && onCreateFolderProp) {
                                                void (async () => {
                                                  try {
                                                    const id = await onCreateFolderProp(trimmed)
                                                    if (id) {
                                                      assignToFolder(thread.id, id)
                                                      setCreatingFolderForThreadId(null)
                                                      setNewFolderName('')
                                                      setNewFolderError('')
                                                    }
                                                  } catch (err) {
                                                    setNewFolderError(err instanceof Error ? err.message : t('errorCreateFolder'))
                                                  }
                                                })()
                                              } else {
                                                const id = addFolder(trimmed)
                                                assignToFolder(thread.id, id)
                                                setCreatingFolderForThreadId(null)
                                                setNewFolderName('')
                                                setNewFolderError('')
                                              }
                                            }
                                          }}
                                          placeholder={t('newFolderNamePlaceholder')}
                                          style={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            padding: '6px 10px',
                                            fontSize: 13,
                                            background: '#1a1a1a',
                                            border: '1px solid #404040',
                                            borderRadius: 6,
                                            color: '#e4e4e7',
                                            outline: 'none',
                                            marginBottom: 8,
                                          }}
                                        />
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCreatingFolderForThreadId(null)
                                              setNewFolderName('')
                                              setNewFolderError('')
                                            }}
                                            style={{
                                              padding: '6px 12px',
                                              fontSize: 12,
                                              background: 'transparent',
                                              border: '1px solid #404040',
                                              borderRadius: 6,
                                              color: '#a3a3a3',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            {t('confirmCancel')}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const trimmed = newFolderName.trim()
                                              if (!trimmed) {
                                                newFolderInputRef.current?.focus()
                                                return
                                              }
                                              const lower = trimmed.toLowerCase()
                                              if (folders.some((f) => f.name.trim().toLowerCase() === lower)) {
                                                setNewFolderError(t('newFolderDuplicateError'))
                                                return
                                              }
                                              if (useBackend && onCreateFolderProp) {
                                                void (async () => {
                                                  try {
                                                    const id = await onCreateFolderProp(trimmed)
                                                    if (id) {
                                                      assignToFolder(thread.id, id)
                                                      setCreatingFolderForThreadId(null)
                                                      setNewFolderName('')
                                                      setNewFolderError('')
                                                    }
                                                  } catch (err) {
                                                    setNewFolderError(err instanceof Error ? err.message : t('errorCreateFolder'))
                                                  }
                                                })()
                                              } else {
                                                const id = addFolder(trimmed)
                                                assignToFolder(thread.id, id)
                                                setCreatingFolderForThreadId(null)
                                                setNewFolderName('')
                                                setNewFolderError('')
                                              }
                                            }}
                                            style={{
                                              padding: '6px 12px',
                                              fontSize: 12,
                                              background: '#404040',
                                              border: 'none',
                                              borderRadius: 6,
                                              color: '#fafafa',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            {t('newFolderCreate')}
                                          </button>
                                        </div>
                                        {newFolderError && (
                                          <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>
                                            {newFolderError}
                                          </div>
                                        )}
                                      </div>
                                    ) : null}
                                    <button
                                      type="button"
                                      style={menuItemStyle}
                                      onMouseEnter={(e) => (e.currentTarget.style.background = '#404040')}
                                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        assignToFolder(thread.id, null)
                                        setMenuThreadId(null)
                                      }}
                                    >
                                      {t('sidebarNoFolder')}
                                    </button>
                                    {folders.map((f) => (
                                      <button
                                        key={f.id}
                                        type="button"
                                        style={menuItemStyle}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#404040')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => {
                                          assignToFolder(thread.id, f.id)
                                          setMenuThreadId(null)
                                        }}
                                      >
                                        {f.name}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      style={menuItemStyle}
                                      onMouseEnter={(e) => (e.currentTarget.style.background = '#404040')}
                                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setCreatingFolderForThreadId(thread.id)
                                      }}
                                    >
                                      + {t('sidebarNewFolderPrompt')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
              return (
                <>
                  <button
                    type="button"
                    className="sbHeaderRow"
                    style={sectionHeaderStyle}
                    onClick={() => setFavoritesOpenAndPersist((o) => !o)}
                  >
                    <span className="sbHeaderIconSlot">
                      <img
                        src="/icons/star-outline-gray.png"
                        alt=""
                        role="presentation"
                        className="sbHeaderIcon"
                        style={{ width: 'var(--sidebar-header-icon-size-favorites)', height: 'var(--sidebar-header-icon-size-favorites)' }}
                      />
                    </span>
                    <span className="sbHeaderTitle">{t('sidebarFavorites')}</span>
                  </button>
                  {favoritesOpen && (
                    <div style={sectionContentStyle}>
                      {favoriteThreads.length > 0 && favoriteThreads.map((thread) => (
                          <div key={thread.id} style={{ marginBottom: 2, paddingLeft: 20 }}>
                            {renderRow(thread)}
                          </div>
                        ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="sbHeaderRow"
                    style={sectionHeaderStyle}
                    onClick={() => setFoldersOpenAndPersist((o) => !o)}
                  >
                    <span className="sbHeaderIconSlot">
                      <img
                        src="/icons/folder-gray.png"
                        alt=""
                        role="presentation"
                        className="sbHeaderIcon"
                        style={{ width: 'var(--sidebar-header-icon-size-folders)', height: 'var(--sidebar-header-icon-size-folders)' }}
                      />
                    </span>
                    <span className="sbHeaderTitle">{t('sidebarFolders')}</span>
                  </button>
                  {foldersOpen && (
                    <div style={sectionContentStyle}>
                      {folders.map((folder) => {
                        const open = folderOpenIds.has(folder.id)
                        const list = threadsInFolder(folder.id)
                        const isEditingFolder = editingFolderId === folder.id
                        return (
                          <div key={folder.id} style={{ marginBottom: 4, paddingLeft: 20 }}>
                            {isEditingFolder ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}>
                                <input
                                  value={editFolderValue}
                                  onChange={(e) => setEditFolderValue(e.target.value.slice(0, 30))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      updateFolderName(folder.id, editFolderValue)
                                    } else if (e.key === 'Escape') {
                                      setEditingFolderId(null)
                                    }
                                  }}
                                  onBlur={() => {
                                    updateFolderName(folder.id, editFolderValue)
                                  }}
                                  autoFocus
                                  style={{
                                    flex: 1,
                                    padding: '6px 10px',
                                    background: '#262626',
                                    border: '1px solid #404040',
                                    borderRadius: 6,
                                    color: '#e4e4e7',
                                    fontSize: 13,
                                    outline: 'none',
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  minWidth: 0,
                                  position: 'relative',
                                }}
                                ref={folderMenuId === folder.id ? folderMenuRef : undefined}
                              >
                                <button
                                  type="button"
                                  style={{ ...folderHeaderStyle, flex: 1, minWidth: 0 }}
                                  onClick={() => toggleFolderOpen(folder.id)}
                                >
                                  <span style={{ opacity: open ? 1 : 0.6 }}>{open ? '▼' : '▶'}</span>
                                  {folder.name}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setFolderMenuId((id) => (id === folder.id ? null : folder.id))
                                  }}
                                  style={{
                                    flexShrink: 0,
                                    width: 'var(--sidebar-icon-size-pencil-folder)',
                                    height: 'var(--sidebar-icon-size-pencil-folder)',
                                    padding: 0,
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#737373',
                                    cursor: 'pointer',
                                    fontSize: 'var(--sidebar-icon-size-pencil-folder)',
                                    opacity: 0.6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title={t('sidebarRenameFolder')}
                                  aria-label={t('sidebarRenameFolder')}
                                >
                                  ✎
                                </button>
                                {folderMenuId === folder.id && (
                                  <div style={{ ...menuStyle, right: 0 }} onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      style={menuItemStyle}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#404040'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent'
                                      }}
                                      onClick={() => {
                                        setEditingFolderId(folder.id)
                                        setEditFolderValue(folder.name)
                                        setFolderMenuId(null)
                                      }}
                                    >
                                      {t('sidebarRenameFolder')}
                                    </button>
                                    {onDeleteFolderProp && (
                                      <button
                                        type="button"
                                        style={menuItemDangerStyle}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#404040'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'transparent'
                                        }}
                                        onClick={() => {
                                          setFolderMenuId(null)
                                          setDeleteConfirm({ type: 'folder', id: folder.id })
                                        }}
                                      >
                                        {t('sidebarDeleteFolder')}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {open && (
                              <div style={{ paddingLeft: 8 }}>
                                {list.length > 0 && list.map((thread) => (
                                    <div key={thread.id} style={{ marginBottom: 2 }}>
                                      {renderRow(thread)}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="sbHeaderRow" style={sectionHeaderStyleStatic}>
                    <span className="sbHeaderIconSlot">
                      <img
                        src="/icons/chevron-right.png"
                        alt=""
                        role="presentation"
                        className="sbHeaderIcon"
                        style={{ opacity: 0.6, width: 'var(--sidebar-header-icon-size-debates)', height: 'var(--sidebar-header-icon-size-debates)' }}
                      />
                    </span>
                    <span className="sbHeaderTitle">{t('sidebarYourDebates')}</span>
                  </div>
                  <div style={sectionContentStyle}>
                    {generalThreads.map((thread) => (
                      <div key={thread.id} style={{ marginBottom: 2 }}>
                        {renderRow(thread)}
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
      </div>

      <div style={collapsed ? userBlockCollapsedStyle : userBlockStyle}>
        <div style={avatarStyle}>R</div>
        {!collapsed && <span>Rodrigo</span>}
      </div>
    </aside>
    {deleteConfirm && (deleteConfirm.type === 'debate' ? onDeleteDebateProp : onDeleteFolderProp) && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={() => setDeleteConfirm(null)}
      >
        <div
          style={{
            background: '#262626',
            border: '1px solid #404040',
            borderRadius: 12,
            padding: 20,
            maxWidth: 360,
            width: '90%',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#fafafa' }}>
            {deleteConfirm.type === 'debate' ? t('confirmDeleteDebateTitle') : t('confirmDeleteFolderTitle')}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#a3a3a3', lineHeight: 1.45 }}>
            {deleteConfirm.type === 'debate' ? t('confirmDeleteDebateBody') : t('confirmDeleteFolderBody')}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                color: '#e4e4e7',
                background: '#404040',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {t('confirmCancel')}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (deleteConfirm.type === 'debate') {
                    await onDeleteDebateProp?.(deleteConfirm.id)
                  } else {
                    await onDeleteFolderProp?.(deleteConfirm.id)
                  }
                  setDeleteConfirm(null)
                } catch (e) {
                  const msg = e instanceof Error ? e.message : deleteConfirm.type === 'debate' ? t('errorDeleteDebate') : t('errorDeleteFolder')
                  window.alert(msg)
                }
              }}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                color: '#fafafa',
                background: '#dc2626',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {t('confirmDelete')}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
