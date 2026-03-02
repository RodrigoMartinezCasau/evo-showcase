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

const cardStyle: React.CSSProperties = {
  background: 'rgba(112, 0, 255, 0.15)',
  border: '2px solid #7000ff',
  borderRadius: 16,
  padding: 24,
  marginBottom: 32,
  maxWidth: 400,
  textAlign: 'center',
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


export default function FrasePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const idFromUrl = searchParams.get('id')
  const { addPhrase, canSubmitPhraseToday, getPhraseById } = useConversations()

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const selectedPhrase = idFromUrl ? getPhraseById(idFromUrl) : null

  useEffect(() => {
    if (selectedPhrase) {
      setInput(selectedPhrase.text)
    } else {
      setInput('')
    }
  }, [idFromUrl, selectedPhrase])

  const handleSend = (text: string) => {
    const trimmed = (text || '').trim()
    if (!trimmed) return
    if (!canSubmitPhraseToday()) {
      setError(t('fraseYaEnviadoHoy'))
      return
    }
    const added = addPhrase(trimmed)
    if (added) {
      setInput('')
      setError(null)
      router.push(`/frase?id=${added.id}`)
    } else {
      setError(t('fraseYaEnviadoHoy'))
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#0f0f12' }}>
      <div style={containerStyle}>
        {selectedPhrase ? (
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa', marginBottom: 8 }}>
              Frase del día
            </div>
            <p style={{ color: '#fafafa', margin: 0, fontSize: 15 }}>{selectedPhrase.text}</p>
          </div>
        ) : null}

        {!selectedPhrase && (
          <div style={inputWrapStyle}>
            <div style={headerStyle}>
              <h2 style={headlineStyle}>{t('fraseLandingHeadline')}</h2>
              <p style={subtitleStyle}>{t('fraseLandingSubtitle')}</p>
            </div>
            {error && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.15)', borderRadius: 8, color: '#fca5a5', fontSize: 13 }}>
                {error}
              </div>
            )}
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
