'use client'

import { t } from '@/src/i18n'
import { HomeButton } from './HomeButton'

const TOP_BAR_HEIGHT = 56

const barStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: TOP_BAR_HEIGHT,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  borderBottom: '1px solid #262626',
  background: '#0f0f12',
}

const leftRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}

const premiumStyle: React.CSSProperties = {
  padding: '8px 14px',
  background: 'linear-gradient(90deg, #c7ff02 0%, #7000ff 100%)',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

type Props = {
  onGoHome: () => void
  topBarLeftRef: React.RefObject<HTMLDivElement | null>
}

export function TopBar({ onGoHome, topBarLeftRef }: Props) {
  return (
    <header style={barStyle}>
      <div style={leftRowStyle}>
        <div ref={topBarLeftRef as React.RefObject<HTMLDivElement>} style={{ display: 'flex', alignItems: 'center' }} />
        <HomeButton onGoHome={onGoHome} inline />
      </div>
      <button type="button" style={premiumStyle}>
        {t('premiumUpgrade')}
      </button>
    </header>
  )
}
