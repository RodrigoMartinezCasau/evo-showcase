'use client'

import { useRef, useEffect } from 'react'
import { t } from '@/src/i18n'
import { ChatInput } from './ChatInput'

const mainStyle: React.CSSProperties = {
  flex: 1,
  width: '100%',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  background: '#0f0f12',
  position: 'relative',
}

const errorStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'rgba(239,68,68,0.15)',
  borderBottom: '1px solid #ef4444',
  color: '#fca5a5',
  fontSize: 13,
}

const INPUT_MAX_WIDTH = 896
const BOTTOM_INPUT_PADDING = 88

const inputWrapperBottom: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  transform: 'translateY(0)',
  background: '#0f0f12',
  display: 'flex',
  justifyContent: 'center',
}

const inputInnerWrap: React.CSSProperties = {
  width: '100%',
  maxWidth: INPUT_MAX_WIDTH,
  margin: 0,
  padding: '0 16px',
  boxSizing: 'border-box',
}

const landingContainerStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 40,
}

const landingInputWrapStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: INPUT_MAX_WIDTH,
}

const landingHeaderStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: '100%',
  transform: 'translateY(-10px)',
  textAlign: 'center',
  padding: 0,
}

const landingHeadlineStyle: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 600,
  color: '#fafafa',
  margin: 0,
  marginBottom: 6,
}

const landingSubtitleStyle: React.CSSProperties = {
  color: '#737373',
  fontSize: 14,
  margin: 0,
  marginTop: 4,
}

export type ReflexionMainContentProps = {
  children: React.ReactNode
  inputValue: string
  onInputChange: (v: string) => void
  onSend: (message: string) => void
  loading: boolean
  placeholder: string
  error?: string | null
  isEmptyChat?: boolean
  landingHeadline?: string
  landingSubtitle?: string
}

export function ReflexionMainContent({
  children,
  inputValue,
  onInputChange,
  onSend,
  loading,
  placeholder,
  error,
  isEmptyChat = false,
  landingHeadline = t('landingHeadline'),
  landingSubtitle = t('landingSubtitle'),
}: ReflexionMainContentProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [isEmptyChat])

  const chatInputProps = {
    value: inputValue,
    onChange: onInputChange,
    onSend,
    loading,
    placeholder,
  }

  return (
    <div style={mainStyle}>
      {error && <div style={errorStyle}>{error}</div>}
      {isEmptyChat ? (
        <div style={landingContainerStyle} className="empty-state-landing">
          <div style={landingInputWrapStyle}>
            <div style={landingHeaderStyle}>
              <h2 style={landingHeadlineStyle}>{landingHeadline}</h2>
              <p style={landingSubtitleStyle}>{landingSubtitle}</p>
            </div>
            <ChatInput ref={inputRef} {...chatInputProps} hideTopBorder />
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              flex: 1,
              width: '100%',
              minWidth: 0,
              minHeight: 0,
              overflow: 'auto',
              paddingBottom: BOTTOM_INPUT_PADDING,
            }}
          >
            {children}
          </div>
          <div style={inputWrapperBottom}>
            <div style={inputInnerWrap}>
              <ChatInput ref={inputRef} {...chatInputProps} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
