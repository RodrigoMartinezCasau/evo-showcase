'use client'

import type { AuthorLayer, FactsLayer, Message } from '../types'
import { AssistantCard } from './AssistantCard'

const wrapStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  padding: '8px 0',
  width: '100%',
  boxSizing: 'border-box',
}

const wrapAssistantStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  padding: '8px 0',
  width: '100%',
  boxSizing: 'border-box',
}

const bubbleUserStyle: React.CSSProperties = {
  maxWidth: '85%',
  padding: '12px 16px',
  borderRadius: 18,
  background: '#262626',
  borderLeft: '4px solid #7000ff',
  color: '#fff',
  fontSize: 14,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

const bubbleAssistantStreamingStyle: React.CSSProperties = {
  ...bubbleUserStyle,
  borderLeft: '1px solid #404040',
}

type Props = {
  message: Message
  messageIndex: number
  creatorLoading: boolean
  onGenerateCreator: (messageIndex: number) => void
  onFactsLoaded?: (messageIndex: number, data: FactsLayer) => void
  onQuotesLoaded?: (messageIndex: number, data: AuthorLayer) => void
  onCreatorLoaded?: (messageIndex: number, data: import('../types').CreatorResponse) => void
}

export function MessageBubble({
  message,
  messageIndex,
  creatorLoading,
  onGenerateCreator,
  onFactsLoaded,
  onQuotesLoaded,
  onCreatorLoaded,
}: Props) {
  if (message.role === 'user') {
    return (
      <div style={wrapStyle}>
        <div style={bubbleUserStyle}>{message.content}</div>
      </div>
    )
  }

  // Streaming: show simple bubble with content + cursor (no full card)
  if ('streaming' in message && message.streaming) {
    return (
      <div style={wrapAssistantStyle}>
        <div style={bubbleAssistantStreamingStyle}>
          {message.content}
          <span className="debate-streaming-cursor" style={{ display: 'inline-block', width: 2, height: 16, background: '#a3a3a3', marginLeft: 2 }} aria-hidden />
        </div>
      </div>
    )
  }

  return (
    <div style={wrapAssistantStyle}>
      <AssistantCard
        message={message}
        messageIndex={messageIndex}
        creatorLoading={creatorLoading}
        onGenerateCreator={onGenerateCreator}
        onFactsLoaded={onFactsLoaded}
        onQuotesLoaded={onQuotesLoaded}
        onCreatorLoaded={onCreatorLoaded}
      />
    </div>
  )
}
