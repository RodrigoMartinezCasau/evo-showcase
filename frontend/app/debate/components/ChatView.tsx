'use client'

import { useRef, useEffect } from 'react'
import { t } from '@/src/i18n'
import type { Message } from '../types'
import { MessageBubble } from './MessageBubble'

/** Fills scroll area; no align-items so children can center. */
const containerStyle: React.CSSProperties = {
  flex: 1,
  width: '100%',
  minWidth: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  padding: '20px 0',
}

/** Centering layer: centers the column in the main area (like ChatGPT). */
const centerLayerStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
}

/** Centered column: max-w-4xl (~900px), horizontal padding. */
const columnWrapStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 896,
  padding: '0 16px',
  boxSizing: 'border-box',
}

const emptyWrapStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 40,
  textAlign: 'center',
}

const emptyTitleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 600,
  color: '#fafafa',
  marginBottom: 8,
}

const messagesWrapStyle: React.CSSProperties = {
  width: '100%',
}


type Props = {
  messages: Message[]
  loading: boolean
  onFactsLoaded?: (messageIndex: number, data: import('../types').FactsLayer) => void
  onQuotesLoaded?: (messageIndex: number, data: import('../types').AuthorLayer) => void
}

export function ChatView({
  messages,
  loading,
  onFactsLoaded,
  onQuotesLoaded,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const isEmpty = messages.length === 0 && !loading

  return (
    <div style={containerStyle}>
      <div style={centerLayerStyle}>
        <div style={columnWrapStyle}>
          {isEmpty ? (
            <div style={emptyWrapStyle}>
              <h2 style={emptyTitleStyle}>{t('landingHeadline')}</h2>
              <p style={{ color: '#737373', fontSize: 14, margin: 0 }}>
                {t('landingSubtitle')}
              </p>
            </div>
          ) : (
            <div style={messagesWrapStyle}>
              {messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  message={m}
                  messageIndex={i}
                  onFactsLoaded={onFactsLoaded}
                  onQuotesLoaded={onQuotesLoaded}
                />
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
