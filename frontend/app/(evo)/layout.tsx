'use client'

import { Suspense, type ReactNode } from 'react'
import { UserProvider } from '@/src/context/UserContext'
import { ConversationsProvider } from '@/src/context/ConversationsContext'
import { AppShell } from '../components/AppShell'

function ShellFallback() {
  return (
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', background: '#0f0f12', color: '#737373' }}>
      Cargando…
    </div>
  )
}

export default function EvoLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <ConversationsProvider>
        <Suspense fallback={<ShellFallback />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </ConversationsProvider>
    </UserProvider>
  )
}
