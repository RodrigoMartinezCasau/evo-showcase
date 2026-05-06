/**
 * Columna lateral derecha de acciones (detalle reflexión / frase).
 * Editores individuales para cada botón: posición y escala independientes.
 *
 * La columna usa un layout basado en medición del panel de reflexión:
 * el borde superior del icono de clan coincide con la esquina superior
 * del rectángulo de texto, y los tres puntitos con la esquina inferior.
 * offsetX=0 → el centro del icono queda exactamente sobre el borde del panel.
 */

/** Configuración global de la columna. */
export const DETAIL_ACTION_COLUMN_LAYOUT = {
  /** Desplazamiento X fallback (solo si reflPanelLayout no está disponible aún). */
  offsetX: -58,
  /** Desplazamiento Y fallback. */
  offsetY: -280,
  /** Espacio vertical entre botones en modo fallback (sin containerHeight). */
  gap: 12,
  /** Tamaño base de cada icono (px). Los editores de scale lo multiplican. */
  iconSize: 28,
};

/** Botón CLAN (insignia) — 20% más grande que los otros botones.
 *  Su scale define el ancho total de la columna (COL_FIXED_WIDTH). */
export const DETAIL_CLAN_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: 2.2 * 1.2, // = 2.64 (20% bigger than up/down/save/more)
};

/** Botón UPVOTE. */
export const DETAIL_UPVOTE_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: 2.2,
};

/** Botón DOWNVOTE. */
export const DETAIL_DOWNVOTE_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: 2.2,
};

/** Botón SAVE (guardar / bookmark). */
export const DETAIL_SAVE_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: 2.0,
};

/** Botón MÁS (tres puntitos). */
export const DETAIL_MORE_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: 2.0,
};

/* ──────────────────────────────────────────────
 *  Stats visuales (números de votos + porcentaje)
 *  Solo se renderizan en modo fallback (sin containerHeight).
 * ────────────────────────────────────────────── */

/** Número de upvotes. */
export const DETAIL_UPVOTE_COUNT_LAYOUT = {
  offsetX: 58,
  offsetY: 95,
  scale: 1.1,
  fontSize: 13,
  fontWeight: '700' as const,
  colorActive: '#A3FF3B',
  colorInactive: '#FFFFFF',
};

/** Número de downvotes. */
export const DETAIL_DOWNVOTE_COUNT_LAYOUT = {
  offsetX: 58,
  offsetY: 235,
  scale: 1.1,
  fontSize: 13,
  fontWeight: '700' as const,
  colorActive: '#ff4a31',
  colorInactive: '#FFFFFF',
};

/** Porcentaje de aprobación. */
export const DETAIL_APPROVAL_PERCENT_LAYOUT = {
  offsetX: 58,
  offsetY: 165,
  scale: 1.1,
  fontSize: 12,
  fontWeight: '800' as const,
  colorAbove95: '#A3FF3B',
  colorAbove90: '#C7FF6B',
  colorAbove80: '#E6FF85',
  colorAbove70: '#F4E06D',
  colorAbove50: '#FFD166',
  colorBelow50: '#FF8C42',
  colorBelow10: '#FF3B30',
};
