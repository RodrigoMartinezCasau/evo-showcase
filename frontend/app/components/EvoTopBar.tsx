'use client'

import Link from 'next/link'
import { useUserStats } from '@/src/context/UserContext'

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

const linkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: 'rgba(255,255,255,0.85)',
  fontSize: 13,
  fontWeight: 500,
  textDecoration: 'none',
  cursor: 'pointer',
}

const iconStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  opacity: 0.9,
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={iconStyle}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ ...iconStyle, color: '#f97316' }}>
      <path d="M12 23c5.5 0 10-4.5 10-10 0-4.5-3-8-7-10 1.5 2 2.5 4.5 2.5 7 0 3.5-2.5 6-6 6s-6-2.5-6-6c0-2.5 1-5 2.5-7-4 2-7 5.5-7 10 0 5.5 4.5 10 10 10z" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={iconStyle}>
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={iconStyle}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

export function EvoTopBar() {
  const stats = useUserStats()

  return (
    <header style={barStyle}>
      <div style={leftRowStyle}>
        <Link href="/reflexion" style={{ ...linkStyle, gap: 4 }} aria-label="Menú">
          <span style={{ fontSize: 18 }}>≡</span>
        </Link>
        <Link href="/reflexion" style={linkStyle}>
          <img src="/logo-star.png" alt="" width={24} height={24} style={{ display: 'block', width: 24, height: 24, objectFit: 'contain' }} />
        </Link>
        <Link href="/reflexion" style={linkStyle}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Evo</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>0.1</span>
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link href="/perfil" style={linkStyle} title="Grupo filosófico">
          <ShieldIcon />
          <span>{stats.groupName}</span>
        </Link>
        <Link href="/frases-record" style={linkStyle} title="Frases desbloqueadas">
          <PencilIcon />
          <span>{stats.unlockedPhrasesCount}/{stats.unlockedPhrasesTotal}</span>
        </Link>
        <Link href="/usos" style={linkStyle} title="Usos restantes">
          <HeartIcon />
          <span style={{ color: '#c7ff02' }}>{stats.usesLeft}</span>
        </Link>
        <Link href="/racha" style={linkStyle} title="Racha">
          <FlameIcon />
          <span>{stats.streakDays}</span>
        </Link>
      </div>
    </header>
  )
}
