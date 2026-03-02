'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { t } from '@/src/i18n'
import { useUserStats } from '@/src/context/UserContext'
import { useConversations } from '@/src/context/ConversationsContext'
import type { ConversationItem, ConversationType } from '@/src/types/conversation'

const ACCENT_GREEN = '#c7ff02'
const ACCENT_PURPLE = '#7000ff'
const ACCENT_WHITE = '#e5e7eb'
const FAVORITES_KEY = 'evo_sidebar_favorites'
const FAVORITES_OPEN_KEY = 'evo_sidebar_favorites_open'
const FOLDERS_OPEN_KEY = 'evo_sidebar_folders_open'

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

function saveFavorites(ids: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids))
  } catch {}
}

const sidebarStyle: React.CSSProperties = {
  width: 260,
  minWidth: 260,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: '#171717',
  borderRight: '1px solid #262626',
  overflow: 'hidden',
  flexShrink: 0,
}

const modeButtonStyle = (accent: string, active: boolean): React.CSSProperties => ({
  margin: '8px 12px',
  padding: '10px 14px',
  background: active ? '#262626' : '#1a1a1a',
  border: 'none',
  borderLeft: `3px solid ${accent}`,
  borderRadius: '0 8px 8px 0',
  color: '#fafafa',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  textDecoration: 'none',
  width: 'calc(100% - 24px)',
  textAlign: 'left',
  boxSizing: 'border-box',
})

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
  display: 'flex',
  flexDirection: 'column',
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 12px',
  marginTop: 8,
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

const sectionHeaderStaticStyle: React.CSSProperties = {
  ...sectionHeaderStyle,
  cursor: 'default',
}

const sectionContentStyle: React.CSSProperties = {
  paddingLeft: 4,
  paddingBottom: 2,
}

const itemRowStyle = (active: boolean): React.CSSProperties => ({
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
  flex: 1,
  textAlign: 'left',
  border: 'none',
})

const itemLinkStyle = (active: boolean): React.CSSProperties => ({
  ...itemRowStyle(active),
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

const clanInsigniaStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  background: 'linear-gradient(135deg, #c7ff02 0%, #7000ff 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

function getRouteForItem(item: ConversationItem): string {
  switch (item.type) {
    case 'reflection': return `/reflexion?id=${item.id}`
    case 'phrase': return `/frase?id=${item.id}`
    case 'essay': return `/redaccion?id=${item.id}`
    default: return '/reflexion'
  }
}

function getAccentForType(type: ConversationType): string {
  return type === 'reflection' ? ACCENT_GREEN : type === 'phrase' ? ACCENT_PURPLE : ACCENT_WHITE
}

function ConversationItemRow({
  item,
  isActive,
  isFavorite,
  onToggleFavorite,
}: {
  item: ConversationItem
  isActive: boolean
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
}) {
  const href = getRouteForItem(item)
  const accent = getAccentForType(item.type)
  const title = item.title.length > 18 ? item.title.slice(0, 17) + '…' : item.title

  return (
    <div
      key={`${item.type}-${item.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        minWidth: 0,
        width: '100%',
        marginBottom: 2,
      }}
    >
      <Link
        href={href}
        style={{
          ...itemLinkStyle(isActive),
          borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
          textDecoration: 'none',
        }}
        title={item.title}
      >
        {title}
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggleFavorite(item.id)
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
          style={{ display: 'block', width: 16, height: 16, objectFit: 'contain' }}
        />
      </button>
      <button
        type="button"
        style={{
          flexShrink: 0,
          width: 17,
          height: 17,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: '#737373',
          cursor: 'pointer',
          fontSize: 14,
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
    </div>
  )
}

export function EvoSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const stats = useUserStats()
  const { items } = useConversations()
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [favoritesOpen, setFavoritesOpen] = useState(true)
  const [foldersOpen, setFoldersOpen] = useState(false)

  useEffect(() => {
    setFavorites(loadFavorites())
    try {
      const fo = localStorage.getItem(FAVORITES_OPEN_KEY)
      if (fo !== null) setFavoritesOpen(fo === 'true')
      const fol = localStorage.getItem(FOLDERS_OPEN_KEY)
      if (fol !== null) setFoldersOpen(fol === 'true')
    } catch {}
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      saveFavorites(next)
      return next
    })
  }, [])

  const setFavoritesOpenAndPersist = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setFavoritesOpen((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      try {
        localStorage.setItem(FAVORITES_OPEN_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  const setFoldersOpenAndPersist = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setFoldersOpen((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      try {
        localStorage.setItem(FOLDERS_OPEN_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  const currentMode: ConversationType =
    pathname.startsWith('/frase') ? 'phrase' :
    pathname.startsWith('/redaccion') ? 'essay' : 'reflection'

  const filtered = search.trim()
    ? items.filter((i) => i.title.toLowerCase().includes(search.trim().toLowerCase()))
    : items

  const activeId = searchParams.get('id')
  const favoriteItems = filtered.filter((i) => favorites.includes(i.id))
  const generalItems = filtered.filter((i) => !favorites.includes(i.id))

  return (
    <aside style={sidebarStyle}>
      <Link
        href="/reflexion"
        style={modeButtonStyle(ACCENT_GREEN, currentMode === 'reflection')}
      >
        <span>+</span>
        {t('newReflection')}
      </Link>
      <Link
        href="/frase"
        style={modeButtonStyle(ACCENT_PURPLE, currentMode === 'phrase')}
      >
        <span>+</span>
        {t('newPhrase')}
      </Link>
      <Link
        href="/redaccion"
        style={modeButtonStyle(ACCENT_WHITE, currentMode === 'essay')}
      >
        <span>+</span>
        {t('newRedaccion')}
      </Link>

      <input
        type="text"
        placeholder={t('sidebarSearchPlaceholderEvo')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchStyle}
      />

      <div className="debate-sidebar-list" style={listStyle}>
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
            {favoriteItems.map((item) => (
              <div key={`fav-${item.type}-${item.id}`} style={{ marginBottom: 2, paddingLeft: 12 }}>
                <ConversationItemRow
                  item={item}
                  isActive={activeId === item.id}
                  isFavorite={true}
                  onToggleFavorite={toggleFavorite}
                />
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
            <div style={{ padding: '8px 12px', color: '#737373', fontSize: 12 }}>
              {t('proximamente')}
            </div>
          </div>
        )}

        <div className="sbHeaderRow" style={sectionHeaderStaticStyle}>
          <span className="sbHeaderIconSlot">
            <img
              src="/icons/chevron-right.png"
              alt=""
              role="presentation"
              className="sbHeaderIcon"
              style={{ opacity: 0.6, width: 'var(--sidebar-header-icon-size-debates)', height: 'var(--sidebar-header-icon-size-debates)' }}
            />
          </span>
          <span className="sbHeaderTitle">{t('sidebarYourThoughts')}</span>
        </div>
        <div style={sectionContentStyle}>
          {generalItems.map((item) => (
            <div key={`gen-${item.type}-${item.id}`} style={{ marginBottom: 2, width: '100%' }}>
              <ConversationItemRow
                item={item}
                isActive={activeId === item.id}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={userBlockStyle}>
        <div style={clanInsigniaStyle}>
          <svg viewBox="0 0 24 24" fill="white" width={20} height={20}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <span style={{ color: '#fafafa', fontWeight: 500 }}>{stats.username}</span>
          <span style={{ fontSize: 11, opacity: 0.8 }}>{stats.rankTitle}</span>
        </div>
        <Link
          href="/ajustes"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            color: '#a3a3a3',
            textDecoration: 'none',
          }}
          aria-label="Ajustes"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18}>
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </Link>
      </div>
    </aside>
  )
}
