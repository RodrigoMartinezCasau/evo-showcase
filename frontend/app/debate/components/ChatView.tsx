'use client'

import { useRef, useEffect } from 'react'
import { t } from '@/src/i18n'
import type { Message } from '../types'
import { MessageBubble } from './MessageBubble'

const containerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  padding: '20px',
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
  maxWidth: 768,
  margin: '0 auto',
  width: '100%',
}


type Props = {
  messages: Message[]
  loading: boolean
  creatorLoading: boolean
  onGenerateCreator: (messageIndex: number) => void
  onFactsLoaded?: (messageIndex: number, data: import('../types').FactsLayer) => void
  onQuotesLoaded?: (messageIndex: number, data: import('../types').AuthorLayer) => void
  onCreatorLoaded?: (messageIndex: number, data: import('../types').CreatorResponse) => void
}

export function ChatView({
  messages,
  loading,
  creatorLoading,
  onGenerateCreator,
  onFactsLoaded,
  onQuotesLoaded,
  onCreatorLoaded,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const isEmpty = messages.length === 0 && !loading

  return (
    <div style={containerStyle}>
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
              creatorLoading={creatorLoading}
              onGenerateCreator={onGenerateCreator}
              onFactsLoaded={onFactsLoaded}
              onQuotesLoaded={onQuotesLoaded}
              onCreatorLoaded={onCreatorLoaded}
            />
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  )
}
