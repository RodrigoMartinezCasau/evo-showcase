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
import { Dimensions } from 'react-native';

/** Pantallas estrechas (< 420 pt): iPhones 15 / SE y Android pequeños. */
const SMALL = Dimensions.get('window').width < 420;

export const SIDEBAR_SETTINGS_ICON_LAYOUT = {
  SIDEBAR_SETTINGS_ICON_OFFSET_X: 10,
  /** Pantallas pequeñas: más bajo (menos margen desde abajo) para alinear con el icono reducido. */
  SIDEBAR_SETTINGS_ICON_OFFSET_Y: SMALL ? 44 : 65,
  /** Pantallas pequeñas: más pequeño para crear espacio entre el perfil y el panel de conversaciones. */
  SIDEBAR_SETTINGS_ICON_SCALE: SMALL ? 0.062 : 0.09,
  /** 0 = derivar del scale; >0 fuerza ancho en px. */
  SIDEBAR_SETTINGS_ICON_WIDTH: 0,
  /** 0 = derivar del ancho o del scale; >0 fuerza alto en px. */
  SIDEBAR_SETTINGS_ICON_HEIGHT: 0,
};
