'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { t } from '@/src/i18n'
import type { Thread } from '../types'

const SIDEBAR_COLLAPSED_KEY = 'debate_sidebar_collapsed'

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
}: Props) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (raw !== null) setCollapsed(raw === 'true')
    } catch {}
  }, [])

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
          : filtered.map((thread) => (
              <div key={thread.id} style={{ width: '100%', minWidth: 0 }}>
                {editingId === thread.id ? (
                  <input
                    type="text"
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
                      if (v && onUpdateTitle) {
                        onUpdateTitle(thread.id, v)
                      }
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
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      minWidth: 0,
                      width: '100%',
                    }}
                  >
                    <button
                      type="button"
                      style={{ ...threadItemStyle(currentThreadId === thread.id), flex: 1, minWidth: 0 }}
                      onClick={() => onSelectThread(thread.id)}
                      title={thread.title || t('sidebarDefaultTitle')}
                    >
                      {(thread.title || t('sidebarDefaultTitle')).length > 18
                        ? (thread.title || '').slice(0, 17) + '…'
                        : thread.title || t('sidebarDefaultTitle')}
                    </button>
                    {onUpdateTitle && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(thread.id)
                          setEditValue(thread.title || t('sidebarDefaultTitle'))
                        }}
                        style={{
                          flexShrink: 0,
                          width: 24,
                          height: 24,
                          padding: 0,
                          background: 'transparent',
                          border: 'none',
                          color: '#737373',
                          cursor: 'pointer',
                          fontSize: 12,
                          opacity: 0.6,
                        }}
                        title={t('sidebarEditTitle')}
                        aria-label={t('sidebarEditTitle')}
                      >
                        ✎
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
      </div>

      <div style={collapsed ? userBlockCollapsedStyle : userBlockStyle}>
        <div style={avatarStyle}>R</div>
        {!collapsed && <span>Rodrigo</span>}
      </div>
    </aside>
    </>
  )
}
