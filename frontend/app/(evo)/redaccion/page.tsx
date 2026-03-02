'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { t } from '@/src/i18n'
import { useConversations } from '@/src/context/ConversationsContext'
import { ChatInput } from '@/app/debate/components/ChatInput'

const INPUT_MAX_WIDTH = 896

const containerStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 40,
}

const inputWrapStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: INPUT_MAX_WIDTH,
}

const headerStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: '100%',
  transform: 'translateY(-10px)',
  textAlign: 'center',
  padding: 0,
}

const headlineStyle: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 600,
  color: '#fafafa',
  margin: 0,
  marginBottom: 6,
}

const subtitleStyle: React.CSSProperties = {
  color: '#737373',
  fontSize: 14,
  margin: 0,
  marginTop: 4,
}

const outputCardStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 32,
  background: '#1a1a1a',
  border: '1px solid #404040',
  borderRadius: 16,
  maxWidth: 600,
  width: '100%',
  textAlign: 'center',
  color: '#a3a3a3',
  fontSize: 18,
  fontWeight: 500,
}

export default function RedaccionPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const idFromUrl = searchParams.get('id')
  const { addEssay, getEssayById } = useConversations()

  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const selectedEssay = idFromUrl ? getEssayById(idFromUrl) : null

  useEffect(() => {
    if (selectedEssay) {
      setInput(selectedEssay.input)
    } else {
      setInput('')
    }
  }, [idFromUrl, selectedEssay])

  const handleSend = (text: string) => {
    const trimmed = (text || '').trim()
    if (!trimmed) return
    const essay = addEssay(trimmed)
    setInput('')
    router.push(`/redaccion?id=${essay.id}`)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#0f0f12' }}>
      <div style={containerStyle}>
        {selectedEssay ? (
          <div style={{ width: '100%', maxWidth: INPUT_MAX_WIDTH }}>
            <div style={{ marginBottom: 12, color: '#a3a3a3', fontSize: 13 }}>Tema: {selectedEssay.title}</div>
            <div style={outputCardStyle}>{t('proximamente')}</div>
          </div>
        ) : (
          <div style={inputWrapStyle}>
            <div style={headerStyle}>
              <h2 style={headlineStyle}>{t('redaccionLandingHeadline')}</h2>
              <p style={subtitleStyle}>{t('redaccionLandingSubtitle')}</p>
            </div>
            <ChatInput
              ref={inputRef}
              value={input}
              onChange={setInput}
              onSend={handleSend}
              loading={false}
              placeholder={t('placeholderDebateExample')}
              hideTopBorder
            />
          </div>
        )}
      </div>
    </div>
  )
}
