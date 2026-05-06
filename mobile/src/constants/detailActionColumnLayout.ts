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
  /** Tamaño base de cada icono (px) — sólo para el modo fallback. */
  iconSize: 28,
  /**
   * Ancho máximo del badge de clan (px).
   * Define también el ancho fijo de la columna (COL_FIXED_WIDTH = maxClanW).
   * Para caber en pantalla con un inset de columnCenterInset:
   *   panelVisualRight - columnCenterInset + maxClanW/2 ≤ screenW
   *   ≈ 353 - 20 + 60 = 393 ✓ en un teléfono de 393 px.
   */
  maxClanW: 120,
  /**
   * Cuántos px a la izquierda del borde del panel se centra la columna.
   * Necesario para que la columna más ancha no sobresalga de la pantalla.
   */
  columnCenterInset: 20,
};

// Fallback scales (usados antes de que containerHeight esté disponible).
const _FB_CLAN_SCALE = 2.8;
const _FB_OTHER_SCALE = _FB_CLAN_SCALE / 2.2;

/** Botón CLAN (insignia) — fallback. */
export const DETAIL_CLAN_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: _FB_CLAN_SCALE,
};

/** Botón UPVOTE — fallback. */
export const DETAIL_UPVOTE_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: _FB_OTHER_SCALE,
};

/** Botón DOWNVOTE — fallback. */
export const DETAIL_DOWNVOTE_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: _FB_OTHER_SCALE,
};

/** Botón SAVE (guardar / bookmark) — fallback. */
export const DETAIL_SAVE_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: _FB_OTHER_SCALE * 0.92,
};

/** Botón MÁS (tres puntitos) — fallback. */
export const DETAIL_MORE_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: _FB_OTHER_SCALE * 0.92,
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
