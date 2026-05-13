/**
 * Editores para las tarjetas de comentario del panel inferior.
 * Solo afecta a los comentarios — no toca el resto del layout.
 */

/** Diseño base de la tarjeta de comentario. */
export const COMMENT_CARD_LAYOUT = {
  backgroundColor: '#15151A',
  borderRadius: 16,
  paddingX: 14,
  paddingY: 12,
  /** Espacio vertical entre tarjetas de comentario (px). */
  gapBetweenComments: 12,
  /** Ancho del acento lateral del clan (px). */
  clanAccentWidth: 4,
  /** Líneas máximas antes de truncar con "Leer más". */
  maxLines: 3,
  /** Tamaño del username. */
  usernameFontSize: 13,
  /** Tamaño del texto del comentario. */
  bodyFontSize: 13,
} as const;

/** Expansión progresiva del texto del comentario. */
export const COMMENT_EXPANSION_CONFIG = {
  /** Caracteres visibles inicialmente. */
  initialLimit: 90,
  /** Caracteres adicionales por cada tap. */
  step: 90,
  /** Máximo absoluto de caracteres visibles. */
  maxLimit: 500,
} as const;

/** Botón de upvote del comentario (posición relativa a su tarjeta). */
export const COMMENT_UPVOTE_LAYOUT = {
  /** Desplazamiento X respecto al borde derecho de la tarjeta. */
  offsetX: 6,
  /** Desplazamiento Y respecto al centro vertical de la tarjeta. */
  offsetY: 0,
  /** Escala del icono. */
  scale: 0.9,
  /** Tamaño del texto del contador. */
  countFontSize: 14,
} as const;
