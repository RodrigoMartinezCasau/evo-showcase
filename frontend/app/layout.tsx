import type { Metadata } from 'next'
import { Inria_Serif, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inria = Inria_Serif({
  weight: ['300', '400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-inria',
  display: 'swap',
})

const mono = JetBrains_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'EVO — evoconn.com',
  description: 'EVO: reflexión, comunidad y crecimiento personal.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inria.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
