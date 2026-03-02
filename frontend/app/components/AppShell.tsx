'use client'

import type { ReactNode } from 'react'
import { EvoSidebar } from './EvoSidebar'
import { EvoTopBar } from './EvoTopBar'

const TOP_BAR_HEIGHT = 56

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

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <EvoTopBar />
      <div style={{ flex: 1, paddingTop: TOP_BAR_HEIGHT, display: 'flex', minHeight: 0 }}>
        <EvoSidebar />
        <main style={mainStyle}>
          {children}
        </main>
      </div>
    </div>
  )
}
