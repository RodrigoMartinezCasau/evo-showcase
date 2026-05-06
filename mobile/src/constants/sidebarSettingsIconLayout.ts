/**
 * Icono de ajustes (footer derecho del drawer). Capa absoluta; no afecta al flex.
 *
 * Posición: `OFFSET_X` = inset desde el borde DERECHO del drawer; `OFFSET_Y` = inset desde ABAJO.
 *
 * Tamaño: viewBox del SVG ≈ 600×600.
 * - Con `WIDTH` y `HEIGHT` en 0: lado = 600 × `SCALE` (cuadrado, sin deformar).
 * - Con `WIDTH` > 0: ancho fijo; si `HEIGHT` > 0 se usa ese alto (puede deformar ligeramente si no cuadra el ratio);
 *   si `HEIGHT` es 0, el alto iguala el ancho (cuadrado).
 * - Con solo `HEIGHT` > 0: alto fijo y ancho = alto (cuadrado).
 */
export const SIDEBAR_SETTINGS_ICON_LAYOUT = {
  SIDEBAR_SETTINGS_ICON_OFFSET_X: 10,
  SIDEBAR_SETTINGS_ICON_OFFSET_Y: 44,
  SIDEBAR_SETTINGS_ICON_SCALE: 0.062,
  /** 0 = derivar del scale; >0 fuerza ancho en px. */
  SIDEBAR_SETTINGS_ICON_WIDTH: 0,
  /** 0 = derivar del ancho o del scale; >0 fuerza alto en px. */
  SIDEBAR_SETTINGS_ICON_HEIGHT: 0,
};
