import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { PRIVACY_POLICY_FULL_ES } from '@/lib/legal/documents'
import { renderLegalDoc } from '@/lib/legal/renderLegalDoc'

type Lang = 'es' | 'en'

function pickLangFromHeader(accept: string | null): Lang {
  if (!accept) return 'es'
  const first = accept.split(',')[0]?.trim().toLowerCase() ?? ''
  if (first.startsWith('es')) return 'es'
  if (first.startsWith('en')) return 'en'
  const lower = accept.toLowerCase()
  if (lower.includes('es')) return 'es'
  if (lower.includes('en')) return 'en'
  return 'es'
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = pickLangFromHeader(headers().get('accept-language'))
  return lang === 'es'
    ? {
        title: 'Privacidad — Evo',
        description: 'Política de privacidad de Evo (EvoConn).',
      }
    : {
        title: 'Privacy — Evo',
        description: 'Evo privacy policy (EvoConn).',
      }
}

export default function PrivacyPage() {
  const lang = pickLangFromHeader(headers().get('accept-language'))
  const isEs = lang === 'es'

  return (
    <main
      style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '56px 20px 72px',
        lineHeight: 1.65,
      }}
    >
      <h1 style={{ fontFamily: 'var(--font-inria)', fontSize: 44, marginBottom: 12 }}>
        {isEs ? 'Política de privacidad' : 'Privacy policy'}
      </h1>

      {isEs ? (
        <article style={{ display: 'grid', gap: 4 }}>{renderLegalDoc(PRIVACY_POLICY_FULL_ES)}</article>
      ) : (
        <section style={{ display: 'grid', gap: 14, opacity: 0.95 }}>
          <p>The Evo privacy policy is currently available in Spanish.</p>
          <p>
            Read the official document:{' '}
            <a href="/privacy" style={{ textDecoration: 'underline' }}>
              Privacy Policy (ES)
            </a>
          </p>
          <p>
            Contact:{' '}
            <a href="mailto:hello@evoconn.com" style={{ textDecoration: 'underline' }}>
              hello@evoconn.com
            </a>
          </p>
        </section>
      )}
    </main>
  )
}
