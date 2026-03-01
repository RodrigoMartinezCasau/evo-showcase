/**
 * API base URL — única fuente de verdad para todas las llamadas al backend.
 *
 * Reglas:
 * 1) Si existe NEXT_PUBLIC_API_URL (y no está vacía), se usa (sin barra final).
 * 2) En LOCAL (NODE_ENV === 'development'): backend en http://127.0.0.1:8000.
 * 3) En producción en el navegador sin env: same-origin /api (Vercel single project).
 * 4) En SSR en Vercel sin env: https://${VERCEL_URL}/api.
 * 5) Fallback: http://127.0.0.1:8000.
 *
 * Variable en local (opcional): en frontend/.env.local pon
 *   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
 * para forzar la URL del backend (por defecto ya es esa en dev).
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (raw != null && raw !== '') {
    return typeof raw === 'string' ? raw.replace(/\/$/, '') : ''
  }
  const isDev =
    typeof process !== 'undefined' && process.env.NODE_ENV === 'development'
  if (isDev) {
    return 'http://127.0.0.1:8000'
  }
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api'
  }
  if (typeof process !== 'undefined' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api`
  }
  return 'http://127.0.0.1:8000'
}
