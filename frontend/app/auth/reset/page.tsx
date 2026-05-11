import { Suspense } from 'react'
import { SupabaseAuthBridge } from '@/components/SupabaseAuthBridge'

export const dynamic = 'force-dynamic'

export default function AuthResetPage() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ''
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    ''

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
      <SupabaseAuthBridge
        mode="reset"
        supabaseUrl={supabaseUrl}
        supabaseAnonKey={supabaseAnonKey}
      />
    </Suspense>
  )
}
