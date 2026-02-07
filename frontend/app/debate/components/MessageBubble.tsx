'use client'

import type { AuthorLayer, FactsLayer, Message } from '../types'
import { AssistantCard } from './AssistantCard'
import { TYPING_STAR_SIZE } from './starSizes'

/** Tamaño fijo del contenedor del loader (estrella). Evita que crezca por estilos heredados. */
const LOADER_BOX_SIZE = 44

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
  maxWidth: '70%',
  padding: '10px 14px',
  borderRadius: 14,
  background: '#262626',
  borderLeft: '4px solid #7000ff',
  color: '#fafafa',
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

const bubbleAssistantStreamingStyle: React.CSSProperties = {
  maxWidth: '100%',
  padding: '8px 12px',
  borderRadius: 10,
  background: '#1a1a1a',
  border: '1px solid #404040',
  borderLeft: '3px solid #525252',
  color: '#e4e4e7',
  fontSize: 14,
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

/** Contenedor fijo del loader (estrella). Tamaño explícito para que no crezca. No reutiliza estilos de botón. */
const loadingIndicatorContainerStyle: React.CSSProperties = {
  width: LOADER_BOX_SIZE,
  height: LOADER_BOX_SIZE,
  minWidth: LOADER_BOX_SIZE,
  minHeight: LOADER_BOX_SIZE,
  maxWidth: LOADER_BOX_SIZE,
  maxHeight: LOADER_BOX_SIZE,
  padding: 0,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  flexGrow: 0,
  marginLeft: 6,
  verticalAlign: 'middle',
  boxSizing: 'border-box',
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

  // Streaming: loader compacto (contenedor fijo) + bubble solo si hay contenido
  if ('streaming' in message && message.streaming) {
    const hasContent = (message.content || '').trim().length > 0
    const loaderBox = (
      <span style={loadingIndicatorContainerStyle}>
        <img
          src="/star-send.png"
          alt=""
          role="presentation"
          className="thinking-star-typing"
          width={TYPING_STAR_SIZE}
          height={TYPING_STAR_SIZE}
          style={{ display: 'block' }}
          aria-hidden
        />
      </span>
    )
    if (!hasContent) {
      return (
        <div style={wrapAssistantStyle}>
          {loaderBox}
        </div>
      )
    }
    return (
      <div style={wrapAssistantStyle}>
        <div style={bubbleAssistantStreamingStyle}>
          {message.content}
          {loaderBox}
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
