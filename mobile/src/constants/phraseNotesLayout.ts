/**
 * Bloque APUNTES DE FRASE (Nueva frase) — misma línea visual que Pregunta reflexiva.
 */
export const PHRASE_NOTES_LAYOUT = {
  blockMinHeight: 180,
  star: {
    offsetX: -7,
    offsetY: -3,
    scale: 2,
    size: 16,
    marginRight: 8,
  },
  title: {
    offsetX: -10,
    offsetY: -2,
    fontSize: 20,
    lineHeight: 22,
  },
  content: {
    offsetX: 0,
    offsetY: 0,
    widthScale: 1,
    minHeight: 120,
    fontSize: 13,
    lineHeight: 18,
  },
} as const;
