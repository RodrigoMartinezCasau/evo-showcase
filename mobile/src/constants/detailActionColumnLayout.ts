/**
 * Columna lateral derecha de acciones (detalle reflexión / frase).
 * Editores individuales para cada botón: posición y escala independientes.
 */

/** Configuración global de la columna. */
export const DETAIL_ACTION_COLUMN_LAYOUT = {
  /** Desplazamiento X de toda la columna respecto al borde derecho del display. */
  offsetX: 0,
  /** Desplazamiento Y de toda la columna. */
  offsetY: -117,
  /** Espacio vertical entre botones (px). */
  gap: 6,
  /** Tamaño base de cada icono (px). Los editores de scale lo multiplican. */
  iconSize: 36,
} as const;

/** Botón CLAN (insignia). */
export const DETAIL_CLAN_BUTTON_LAYOUT = {
  offsetX: 17.5,
  offsetY: -0,
  scale: 3.3,
} as const;

/** Botón UPVOTE. */
export const DETAIL_UPVOTE_BUTTON_LAYOUT = {
  offsetX: 18.5,
  offsetY: 0,
  scale: 1.8,
} as const;

/** Botón DOWNVOTE. */
export const DETAIL_DOWNVOTE_BUTTON_LAYOUT = {
  offsetX: 18.5,
  offsetY: 0,
  scale: 1.8,
} as const;

/** Botón SAVE (guardar / bookmark). */
export const DETAIL_SAVE_BUTTON_LAYOUT = {
  offsetX: 18,
  offsetY: 0,
  scale: 1.6,
} as const;

/* ──────────────────────────────────────────────
 *  Stats visuales (números de votos + porcentaje)
 * ────────────────────────────────────────────── */

/** Número de upvotes (encima de la flecha). */
export const DETAIL_UPVOTE_COUNT_LAYOUT = {
  offsetX: 18,
  offsetY: 0,
  fontSize: 13,
  fontWeight: '700' as const,
  colorActive: '#A3FF3B',
  colorInactive: '#FFFFFF',
} as const;

/** Número de downvotes (debajo de la flecha). */
export const DETAIL_DOWNVOTE_COUNT_LAYOUT = {
  offsetX: 18,
  offsetY: 0,
  fontSize: 13,
  fontWeight: '700' as const,
  colorActive: '#ff4a31',
  colorInactive: '#FFFFFF',
} as const;

/** Porcentaje de aprobación (entre ambas flechas). */
export const DETAIL_APPROVAL_PERCENT_LAYOUT = {
  offsetX: 18,
  offsetY: 0,
  fontSize: 12,
  fontWeight: '800' as const,
  colorAbove95: '#A3FF3B',
  colorAbove90: '#C7FF6B',
  colorAbove80: '#E6FF85',
  colorAbove70: '#F4E06D',
  colorAbove50: '#FFD166',
  colorBelow50: '#FF8C42',
  colorBelow10: '#FF3B30',
} as const;
