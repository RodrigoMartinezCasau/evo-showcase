import Link from 'next/link'
import { t } from '@/src/i18n'

export default function Home() {
  return (
    <main style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>{t('homeTitle')}</h1>
      <p style={{ color: '#a1a1aa', marginBottom: '1.5rem' }}>
        {t('homeDescription')}
      </p>
      <Link
        href="/debate"
        style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          background: '#3b82f6',
          color: 'white',
          borderRadius: 6,
        }}
      >
        {t('homeGoChat')}
      </Link>
    </main>
  )
}
