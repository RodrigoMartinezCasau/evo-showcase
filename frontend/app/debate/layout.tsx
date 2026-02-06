import type { ReactNode } from 'react'

/**
 * Layout for /debate. Ensures the route segment is explicit so Next.js
 * always resolves /debate on hard refresh (avoids intermittent 404 in Safari).
 */
export default function DebateLayout({
  children,
}: {
  children: ReactNode
}) {
  return <>{children}</>
}
