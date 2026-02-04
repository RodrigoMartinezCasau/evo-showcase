'use client'

import { useRef, useEffect } from 'react'
import { t } from '@/src/i18n'
import type { Thread } from '../types'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
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

/** Same max-width as chat column (ChatView columnWrapStyle) so input aligns with messages. */
const INPUT_MAX_WIDTH = 896

const inputWrapperBase: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  transition: 'bottom 0.35s ease-out, transform 0.35s ease-out, opacity 0.35s ease-out',
}

const inputWrapperBottom: React.CSSProperties = {
  ...inputWrapperBase,
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

/** Empty state: relative container that fills height; input is true vertical center. */
const landingContainerStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 40,
}

/** Wrapper around input only; centered in viewport. Header is absolutely positioned above. */
const landingInputWrapStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: INPUT_MAX_WIDTH,
}

/** Header (headline + subtitle) above input; absolutely positioned and moved up. */
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

export type MainLayoutProps = {
  threads: Thread[]
  currentThreadId: string | null
  onNewDebate: () => void
  onSelectThread: (id: string) => void
  onGoHome: () => void
  onUpdateTitle?: (id: string, title: string) => void
  topBarLeftRef: React.RefObject<HTMLDivElement | null>
  topBarReady: boolean
  children: React.ReactNode
  inputValue: string
  onInputChange: (v: string) => void
  onSend: (message: string) => void
  loading: boolean
  placeholder: string
  newButtonLabel?: string
  error?: string | null
  isEmptyChat?: boolean
  landingHeadline?: string
  landingSubtitle?: string
}

const BOTTOM_INPUT_PADDING = 88

export function MainLayout({
  threads,
  currentThreadId,
  onNewDebate,
  onSelectThread,
  onGoHome,
  onUpdateTitle,
  topBarLeftRef,
  topBarReady,
  children,
  inputValue,
  onInputChange,
  onSend,
  loading,
  placeholder,
  newButtonLabel = t('newDebate'),
  error,
  isEmptyChat = false,
  landingHeadline = t('landingHeadline'),
  landingSubtitle = t('landingSubtitle'),
}: MainLayoutProps) {
  const sidebarNewLabel = newButtonLabel
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar onGoHome={onGoHome} topBarLeftRef={topBarLeftRef} />
      <div style={{ flex: 1, paddingTop: 56, display: 'flex', minHeight: 0 }}>
        <Sidebar
          currentThreadId={currentThreadId}
          onNewDebate={onNewDebate}
          onSelectThread={onSelectThread}
          onGoHome={onGoHome}
          threads={threads}
          onUpdateTitle={onUpdateTitle}
          topBarLeftRef={topBarLeftRef}
          topBarReady={topBarReady}
          newButtonLabel={sidebarNewLabel}
        />
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
      </div>
    </div>
  )
}
