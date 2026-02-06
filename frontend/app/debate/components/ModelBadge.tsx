'use client'

/** Nombre del modelo de IA (decorativo). */
export const MODEL_NAME = 'Evo'

/** Versión del modelo (pre-beta). */
export const MODEL_VERSION = '0.1 Beta'

/** Tamaño del badge: cambia estos valores para hacerlo más grande o pequeño. */
const BADGE_FONT_SIZE = 22   // tamaño base (nombre "Evo")
const VERSION_FONT_SIZE = 20 // tamaño de la versión "0.1"
const BADGE_GAP = 6          // espacio entre nombre y versión

const wrapperStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: BADGE_GAP,
  fontSize: BADGE_FONT_SIZE,
  fontWeight: 500,
  letterSpacing: '0.02em',
  color: '#e4e4e7',
  opacity: 0.95,
}

const nameStyle: React.CSSProperties = {
  color: '#fafafa',
  fontWeight: 600,
}

const versionStyle: React.CSSProperties = {
  color: '#a3a3a3',
  fontWeight: 400,
  fontSize: VERSION_FONT_SIZE,
}

/**
 * Badge decorativo con nombre y versión del modelo de IA.
 * No es clicable ni interactivo.
 */
export function ModelBadge() {
  return (
    <span style={wrapperStyle} aria-hidden>
      <span style={nameStyle}>{MODEL_NAME}</span>
      <span style={versionStyle}>{MODEL_VERSION}</span>
    </span>
  )
}
