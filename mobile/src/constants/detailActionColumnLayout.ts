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
   * Con columnCenterInset=0 el borde derecho de la columna queda en
   *   panelVisualRight + maxClanW/2 ≈ 353 + 60 = 413 px en un teléfono de 393 px.
   * Los ~20 px que sobresalen por la derecha son recortados por el borde de pantalla,
   * lo que es aceptable (el borde derecho del badge apenas se ve).
   */
  maxClanW: 120,
  /**
   * Cuántos px a la izquierda del borde visual del panel se centra la columna.
   * 0 = centrado exactamente sobre el borde del panel (posición original).
   */
  columnCenterInset: 0,
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

