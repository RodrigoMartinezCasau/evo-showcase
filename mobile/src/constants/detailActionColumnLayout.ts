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
   */
  maxClanW: 120,
  /**
   * Cuántos px a la izquierda del borde visual del panel se centra la columna.
   * 0 = centrado exactamente sobre el borde del panel (posición original).
   */
  columnCenterInset: 0,
  /**
   * Multiplicador global de tamaño de iconos (0–1).
   * Escala clan badge, flechas de voto, save y tres puntos de forma proporcional
   * sin alterar el `space-between` ni la posición de la columna.
   * 1.0 = tamaño derivado del panel. 0.65 = 35 % más pequeño.
   */
  sizeScale: 0.8,
  /**
   * Fracción del alto del panel que ocupa el grupo de iconos (0–1).
   * El grupo se centra verticalmente dentro del panel.
   * 1.0 = ocupa todo el panel (original). 0.5 = ocupa la mitad central.
   */
  verticalFillRatio: 0.7,
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

/** Mismo gap vertical que `DetailActionColumn` (count↔icon en up/down). */
export const DETAIL_ACTION_VOTE_STAT_ICON_GAP = 2;

const _ACTION_ICON_RATIO_SUM = 2.2 + 1 + 1 + 0.92 + 0.6;
const _ACTION_FIXED_TEXT_H = 3 * 18 + 2 * DETAIL_ACTION_VOTE_STAT_ICON_GAP;

/**
 * Y absoluta (coords. del ítem de feed) donde empieza el bloque de upvote
 * (contador + icono), replicando el reparto `space-between` de DetailActionColumn.
 */
export function computeDetailActionUpvoteTopY(
  reflectionPanelY: number,
  reflectionPanelHeight: number,
  options?: { hasAudio?: boolean },
): number {
  const col = DETAIL_ACTION_COLUMN_LAYOUT;
  const overhang = reflectionPanelHeight * 0.05;
  const fullH = reflectionPanelHeight * 1.05;
  const verticalShift = (fullH * (1 - col.verticalFillRatio)) / 2;
  const columnTop = reflectionPanelY - overhang + verticalShift;

  const containerHeight = reflectionPanelHeight * 1.05 * col.verticalFillRatio;
  const derivedSz = Math.max(1, (containerHeight - _ACTION_FIXED_TEXT_H) / _ACTION_ICON_RATIO_SUM);
  const rawClanH = derivedSz * 2.2;
  const clanSz = Math.min(rawClanH, col.maxClanW) * col.sizeScale;
  const effSz = clanSz / 2.2;
  const otherSz = effSz;
  const saveSz = effSz * 0.92;
  const dotsFontSz = Math.max(10, effSz * 0.6);

  const clanH = clanSz;
  const upvoteH = 18 + DETAIL_ACTION_VOTE_STAT_ICON_GAP + otherSz;
  const approvalH = 18;
  const downvoteH = otherSz + DETAIL_ACTION_VOTE_STAT_ICON_GAP + 18;
  const saveH = saveSz;
  const audioBtn = Math.max(28, saveSz * 0.78);
  const moreH = dotsFontSz * 1.35 + (options?.hasAudio ? 8 + audioBtn : 0);

  const contentH = clanH + upvoteH + approvalH + downvoteH + saveH + moreH;
  const gap = Math.max(0, (containerHeight - contentH) / 5);

  return columnTop + clanH + gap;
}
