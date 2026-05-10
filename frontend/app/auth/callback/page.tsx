import { Suspense } from 'react'
import { SupabaseAuthBridge } from '@/components/SupabaseAuthBridge'

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b0b0f',
            color: '#e8e8ec',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Cargando…
        </main>
      }
    >
      <SupabaseAuthBridge mode="callback" />
    </Suspense>
  )
}
