/**
 * Bloque «Añadir a carpeta…» (Nueva frase) — misma línea visual que Cita textual.
 */
export const PHRASE_FOLDER_MANAGER_LAYOUT = {
  /** Altura fija del área interna (solo la lista; scroll interno). */
  height: 220,
  contentOffsetX: 0,
  contentOffsetY: 0,
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
    fontSize: 18,
    lineHeight: 22,
  },
  content: {
    offsetX: 0,
    offsetY: 0,
    widthScale: 1,
  },
} as const;
