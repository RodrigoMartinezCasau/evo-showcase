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
        title: 'Cookies — Evo',
        description: 'Información sobre cookies y almacenamiento local.',
      }
    : {
        title: 'Cookies — Evo',
        description: 'Information about cookies and local storage.',
      }
}

export default function CookiesPage() {
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
        {isEs ? 'Política de cookies' : 'Cookies policy'}
      </h1>

      <section style={{ display: 'grid', gap: 16 }}>
        {isEs ? (
          <>
            <p style={{ opacity: 0.85 }}>
              Fuente: sección 9 (“Cookies y almacenamiento local”) de la{' '}
              <a
                href="https://docs.google.com/document/d/e/2PACX-1vTpn9XyiqyZS-6Jxx7k3TeyewkMe0e6Jodo5lymcFeoo3SjF8iBQ1CiGX5-wHQr4RPriTpnmwFF0NmQ/pub"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'underline' }}
              >
                Política de Privacidad (ES)
              </a>
              .
            </p>
            <h2 style={{ fontSize: 22, marginTop: 10 }}>Cookies y almacenamiento local</h2>
            <p>
              Evo es una aplicación móvil nativa y <strong>no utiliza cookies</strong> en el sentido tradicional de las páginas web.
            </p>
            <p>
              El almacenamiento local de datos en el dispositivo se realiza mediante:
            </p>
            <ul style={{ paddingLeft: 18, opacity: 0.95 }}>
              <li>
                <strong>AsyncStorage</strong>: mantener tokens de sesión y preferencias de la app.
              </li>
              <li>
                <strong>SecureStore</strong>: guardar de forma cifrada credenciales temporales durante verificación de email.
              </li>
            </ul>
            <p>
              En esta web, la landing guarda una preferencia de idioma en el navegador mediante{' '}
              <code>localStorage</code> (clave <code>evo-lang</code>) para recordar si elegiste ES o EN.
            </p>
            <h2 style={{ fontSize: 22, marginTop: 10 }}>Contacto</h2>
            <p>
              Email:{' '}
              <a href="mailto:hello@evoconn.com" style={{ textDecoration: 'underline' }}>
                hello@evoconn.com
              </a>
            </p>
          </>
        ) : (
          <>
            <p style={{ opacity: 0.95 }}>
              Evo’s cookies/local storage details are currently available in Spanish.
            </p>
            <p style={{ opacity: 0.95 }}>
              Read the official document here:{' '}
              <a
                href="https://docs.google.com/document/d/e/2PACX-1vTpn9XyiqyZS-6Jxx7k3TeyewkMe0e6Jodo5lymcFeoo3SjF8iBQ1CiGX5-wHQr4RPriTpnmwFF0NmQ/pub"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'underline' }}
              >
                Privacy Policy (ES)
              </a>
              .
            </p>
            <p style={{ opacity: 0.95 }}>
              This website stores a language preference using <code>localStorage</code> (key <code>evo-lang</code>) to remember whether you chose ES or EN.
            </p>
            <p style={{ opacity: 0.95 }}>
              Contact:{' '}
              <a href="mailto:hello@evoconn.com" style={{ textDecoration: 'underline' }}>
                hello@evoconn.com
              </a>
            </p>
          </>
        )}
      </section>
    </main>
  )
}

