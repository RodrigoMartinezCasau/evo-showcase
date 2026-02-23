'use client'

import { t } from '@/src/i18n'
import { HomeButton } from './HomeButton'
import { ModelBadge } from './ModelBadge'
import { UsageCounter } from './UsageCounter'
const TOP_BAR_HEIGHT = 56

/** Premium button image size — change this to resize the button (height in px; width scales automatically). */
const PREMIUM_BUTTON_HEIGHT = 200

/** Espacio entre el botón Home (estrella) y el badge "Evo 0.1". Cambia este valor para ajustar el gap. */
const MODEL_BADGE_GAP_FROM_LEFT = 1

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
  padding: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
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
        <span style={{ marginLeft: MODEL_BADGE_GAP_FROM_LEFT, display: 'flex', alignItems: 'center' }}>
          <ModelBadge />
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <UsageCounter inline />
        <button type="button" style={premiumStyle} aria-label={t('premiumUpgrade')}>
        <img
          src="/premium-button.png"
          alt="Mejorar a Premium"
          style={{ display: 'block', height: PREMIUM_BUTTON_HEIGHT, width: 'auto', objectFit: 'contain' }}
        />
      </button>
      </div>
    </header>
  )
}
