import type { Metadata } from 'next'
import { headers } from 'next/headers'

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
        title: 'Términos de uso — Evo',
        description: 'Términos de uso de Evo.',
      }
    : {
        title: 'Terms of use — Evo',
        description: 'Evo terms of use.',
      }
}

export default function TermsPage() {
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
        {isEs ? 'Términos de uso' : 'Terms of use'}
      </h1>
      <p style={{ opacity: 0.85, marginBottom: 24 }}>
        {isEs
          ? 'Pendiente de documento definitivo.'
          : 'Pending definitive document.'}
      </p>

      <section style={{ display: 'grid', gap: 16 }}>
        <p>
          {isEs
            ? 'A día de hoy solo tenemos publicado el documento de Política de Privacidad. En cuanto tengamos el documento de Términos de uso, lo sustituiremos aquí.'
            : 'At the moment we only have the Privacy Policy published. Once we have the Terms of Use document, we will replace this page.'}
        </p>

        <p style={{ opacity: 0.95 }}>
          {isEs ? 'Documento disponible ahora: ' : 'Available document now: '}
          <a
            href="https://docs.google.com/document/d/e/2PACX-1vTpn9XyiqyZS-6Jxx7k3TeyewkMe0e6Jodo5lymcFeoo3SjF8iBQ1CiGX5-wHQr4RPriTpnmwFF0NmQ/pub"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'underline' }}
          >
            {isEs ? 'Política de Privacidad (ES)' : 'Privacy Policy (ES)'}
          </a>
        </p>

        <h2 style={{ fontSize: 22, marginTop: 10 }}>
          {isEs ? 'Uso del servicio' : 'Use of the service'}
        </h2>
        <ul style={{ paddingLeft: 18, opacity: 0.95 }}>
          <li>
            {isEs
              ? 'No uses Evo para actividades ilegales, acoso o abuso.'
              : 'Do not use Evo for illegal activity, harassment, or abuse.'}
          </li>
          <li>
            {isEs
              ? 'Eres responsable del contenido que publicas y de tus interacciones.'
              : 'You are responsible for the content you post and your interactions.'}
          </li>
          <li>
            {isEs
              ? 'Podemos moderar contenido y tomar medidas si se incumplen estas normas.'
              : 'We may moderate content and take action if these rules are violated.'}
          </li>
        </ul>

        <h2 style={{ fontSize: 22, marginTop: 10 }}>
          {isEs ? 'Disponibilidad' : 'Availability'}
        </h2>
        <p>
          {isEs
            ? 'El servicio puede cambiar, interrumpirse o mejorarse. Intentaremos minimizar interrupciones, pero no podemos garantizar disponibilidad absoluta.'
            : 'The service may change, be interrupted, or improved. We aim to minimize downtime but cannot guarantee absolute availability.'}
        </p>

        <h2 style={{ fontSize: 22, marginTop: 10 }}>
          {isEs ? 'Contacto' : 'Contact'}
        </h2>
        <p>
          {isEs ? 'Email: ' : 'Email: '}
          <a href="mailto:hello@evoconn.com" style={{ textDecoration: 'underline' }}>
            hello@evoconn.com
          </a>
        </p>
      </section>
    </main>
  )
}

