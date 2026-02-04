'use client'

import { forwardRef } from 'react'
import { t } from '@/src/i18n'

const wrapStyleBase: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  padding: '16px 0',
  background: '#0f0f12',
}

const wrapStyleWithBorder: React.CSSProperties = {
  ...wrapStyleBase,
  borderTop: '1px solid #262626',
}

const innerStyle: React.CSSProperties = {
  width: 'min(900px, calc(100% - 32px))',
  maxWidth: 900,
  boxSizing: 'border-box',
  display: 'flex',
  gap: 12,
  alignItems: 'flex-end',
}

const textareaStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  background: '#262626',
  border: '1px solid #404040',
  borderRadius: 12,
  color: '#fafafa',
  fontSize: 14,
  fontFamily: 'inherit',
  resize: 'none',
  minHeight: 44,
  maxHeight: 200,
  outline: 'none',
}

const sendStyle = (disabled: boolean): React.CSSProperties => ({
  width: 44,
  height: 44,
  minWidth: 44,
  borderRadius: 12,
  background: disabled ? '#404040' : 'linear-gradient(90deg, #c7ff02 0%, #7000ff 100%)',
  border: 'none',
  color: '#fff',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
})

type Props = {
  value: string
  onChange: (v: string) => void
  /** Called with the current trimmed message when user submits (Enter or send button). */
  onSend: (message: string) => void
  loading: boolean
  placeholder?: string
  /** When true, omit the top border (e.g. for landing empty state). */
  hideTopBorder?: boolean
}

export const ChatInput = forwardRef<HTMLTextAreaElement, Props>(function ChatInput(
  { value, onChange, onSend, loading, placeholder = t('placeholderMessage'), hideTopBorder = false },
  ref
) {
  const wrapStyle = hideTopBorder ? wrapStyleBase : wrapStyleWithBorder
  const trimmed = value.trim()
  const isEmpty = trimmed.length === 0
  const sendDisabled = isEmpty // only disable when input is empty

  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (trimmed) {
      if (isDev) console.debug('[ChatInput] send submitted (Enter or button)', { length: trimmed.length })
      onSend(trimmed)
    }
  }

  return (
    <div style={wrapStyle}>
      <form
        style={{ ...innerStyle, width: '100%' }}
        onSubmit={handleSubmit}
      >
        <textarea
          ref={ref}
          className="debate-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              const v = value.trim()
              if (v) {
                if (isDev) console.debug('[ChatInput] send submitted (Enter)', { length: v.length })
                onSend(v)
              }
            }
          }}
          placeholder={placeholder}
          disabled={loading}
          rows={1}
          style={textareaStyle}
          aria-label={t('ariaMessageInput')}
        />
        <button
          type="submit"
          disabled={sendDisabled}
          style={sendStyle(sendDisabled)}
          aria-label={t('ariaSend')}
        >
          ↑
        </button>
      </form>
    </div>
  )
})
