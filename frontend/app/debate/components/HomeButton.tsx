'use client'

import { t } from '@/src/i18n'

type Props = {
  onGoHome: () => void
  inline?: boolean
}

const baseStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  minWidth: 40,
  minHeight: 40,
  padding: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 0.15s',
}

const fixedStyle: React.CSSProperties = {
  position: 'fixed',
  left: 56,
  top: 12,
  zIndex: 51,
}

export function HomeButton({ onGoHome, inline }: Props) {
  const buttonStyle: React.CSSProperties = inline ? baseStyle : { ...baseStyle, ...fixedStyle }
  return (
    <button
      type="button"
      onClick={onGoHome}
      style={buttonStyle}
      title={t('homeButtonTitle')}
      aria-label={t('homeButtonTitle')}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.9'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1'
      }}
    >
      <img
        src="/logo-star.png"
        alt=""
        width={80}
        height={80}
        style={{ display: 'block', width: 80, height: 80, objectFit: 'contain' }}
      />
    </button>
  )
}
