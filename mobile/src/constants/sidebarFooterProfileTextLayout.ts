/**
 * Texto inferior del sidebar (nombre / clan / rango).
 *
 * ─── POSICIÓN DEL BLOQUE COMPLETO ───────────────────────────────────────────
 * `BLOCK_POSITION_MODE`:
 * - `after_insignia`: el bloque queda a la derecha de la insignia.
 *   - `BLOCK_POS_X`: px adicionales a la derecha del hueco (insignia + GAP_AFTER_INSIGNIA).
 *   - `BLOCK_POS_Y`: px sumados al `bottom` de la insignia (positivo = el bloque sube).
 * - `drawer_edges`: posición fija respecto al drawer (ignora la insignia para colocar).
 *   - `BLOCK_POS_X`: px desde el borde IZQUIERDO del drawer.
 *   - `BLOCK_POS_Y`: px desde el borde INFERIOR del drawer (igual que `bottom` en RN).
 *
 * `GAP_AFTER_INSIGNIA` solo aplica en modo `after_insignia`.
 *
 * ─── POSICIÓN POR LÍNEA (relativa al bloque; se multiplican por BLOCK_SCALE) ───
 * Cada línea: OFFSET_X, OFFSET_Y (márgenes respecto al flujo vertical del bloque).
 *
 * ─── ESCALA ───
 * `BLOCK_SCALE` multiplica fuentes y offsets de líneas 1–3.
 */

export type SidebarFooterProfileTextBlockPositionMode = 'after_insignia' | 'drawer_edges';

export const SIDEBAR_FOOTER_PROFILE_TEXT_LAYOUT = {
  // ── A) Bloque: modo + posición ─────────────────────────────────────────────
  SIDEBAR_FOOTER_PROFILE_TEXT_BLOCK_POSITION_MODE: 'after_insignia' as SidebarFooterProfileTextBlockPositionMode,

  /** Solo modo `after_insignia`: px entre el borde derecho de la insignia (600×scale) y el texto. */
  SIDEBAR_FOOTER_PROFILE_TEXT_GAP_AFTER_INSIGNIA: 8,

  /**
   * Posición X del bloque (ver `BLOCK_POSITION_MODE`).
   * - `after_insignia`: suma horizontal tras el gap.
   * - `drawer_edges`: distancia al borde izquierdo del drawer.
   */
  SIDEBAR_FOOTER_PROFILE_TEXT_BLOCK_POS_X: -29,
  /**
   * Posición Y del bloque (ver `BLOCK_POSITION_MODE`).
   * - `after_insignia`: se suma al bottom de la insignia.
   * - `drawer_edges`: distancia al borde inferior del drawer.
   */
  SIDEBAR_FOOTER_PROFILE_TEXT_BLOCK_POS_Y: 40,

  /** Escala global del bloque: multiplica tamaños de fuente y offsets de cada línea. */
  SIDEBAR_FOOTER_PROFILE_TEXT_BLOCK_SCALE: 1.4,

  // ── B) Línea 1 — nombre (sans, gris) ───────────────────────────────────────
  SIDEBAR_FOOTER_PROFILE_TEXT_LINE1_OFFSET_X: 0,
  SIDEBAR_FOOTER_PROFILE_TEXT_LINE1_OFFSET_Y: 0,
  SIDEBAR_FOOTER_PROFILE_TEXT_LINE1_FONT_SIZE: 12,
  SIDEBAR_FOOTER_PROFILE_TEXT_LINE1_COLOR: '#B8BCC6',

  // ── C) Línea 2 — clan (Inria Serif) ────────────────────────────────────────
  SIDEBAR_FOOTER_PROFILE_TEXT_LINE2_OFFSET_X: 0,
  SIDEBAR_FOOTER_PROFILE_TEXT_LINE2_OFFSET_Y: 4,
  SIDEBAR_FOOTER_PROFILE_TEXT_LINE2_FONT_SIZE: 13,

  // ── D) Línea 3 — rango (Inria Serif, blanco) ───────────────────────────────
  SIDEBAR_FOOTER_PROFILE_TEXT_LINE3_OFFSET_X: 0,
  SIDEBAR_FOOTER_PROFILE_TEXT_LINE3_OFFSET_Y: 2,
  SIDEBAR_FOOTER_PROFILE_TEXT_LINE3_FONT_SIZE: 13,
  SIDEBAR_FOOTER_PROFILE_TEXT_LINE3_COLOR: '#FFFFFF',
};
