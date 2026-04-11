/**
 * Celda individual de carpeta (bloque «Añadir a carpeta…»).
 * Misma línea que la tarjeta interna de Cita textual: lateral izquierdo + fondo #171717.
 * El color del lateral lo pasa el padre (getBlockBorderColor('quote', clan), como DebateQuoteCard).
 */
export const PHRASE_FOLDER_ITEM_LAYOUT = {
  /** Ancho del acento izquierdo (misma idea que AI_SPECIAL_BLOCK_LAYOUT.quoteCard.accentWidth). */
  accentWidth: 4,
  borderRadius: 10,
  backgroundColor: '#171717',
  padding: 12,
  /** Separación vertical entre tarjetas de carpeta. */
  gap: 10,
  /** Icono carpeta blanca (`iconoCarpetas.svg`): posición y escala. */
  icon: {
    offsetX: -4,
    offsetY: 0,
    /** Tamaño base (px) antes de aplicar `scale`. */
    size: 22,
    scale: 0.6,
  },
  title: {
    offsetX: 0,
    offsetY: 0,
    fontSize: 14,
    lineHeight: 18,
  },
  check: {
    offsetX: 0,
    offsetY: 0,
    fontSize: 16,
  },
} as const;
