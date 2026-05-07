/**
 * Knobs for the sidebar top header only (star + Evo / version).
 * Adjust here without hunting through StyleSheet.
 *
 * Versión del sidebar: cambia el número en `SIDEBAR_VERSION_TEXT` (ej. `'0.2 Beta'`).
 */
export const SIDEBAR_HEADER_LAYOUT = {
  /** Nombre de la app en el header del sidebar (blanco, negrita). */
  SIDEBAR_TITLE_TEXT: 'Evo',
  /**
   * Texto completo que ves al lado de "Evo" (gris). Reescribe la cadena cuando subas versión:
   * p. ej. `'0.2 Beta'`, `'1.0'`, etc.
   */
  SIDEBAR_VERSION_TEXT: '0.1 Beta',

  SIDEBAR_HEADER_PADDING_TOP: 0,
  SIDEBAR_HEADER_PADDING_LEFT: 16,
  /** Inset derecho del header (campana pegada al borde interior del drawer). */
  SIDEBAR_HEADER_PADDING_RIGHT: 16,
  SIDEBAR_HEADER_HEIGHT: 44,

  /** Campana de notificaciones (Ionicons, blanca) en la cabecera. */
  SIDEBAR_HEADER_NOTIFY_ICON_PX: 24,

  /** Tamaño base del contenedor de la estrella (px). */
  SIDEBAR_STAR_SIZE: 90,
  /** Escala uniforme aplicada sobre el tamaño base. 1 = sin cambio, 1.2 = 20% más grande. */
  SIDEBAR_STAR_SCALE: 0.5,
  SIDEBAR_STAR_OFFSET_X: -32,
  SIDEBAR_STAR_OFFSET_Y: -10,

  SIDEBAR_TEXT_OFFSET_X: -50,
  SIDEBAR_TEXT_OFFSET_Y: -10,

  SIDEBAR_TITLE_FONT_SIZE: 20,
  SIDEBAR_VERSION_FONT_SIZE: 16,
  /** Espacio horizontal entre "Evo" y "0.1 Beta" (misma línea). */
  SIDEBAR_TEXT_GAP: 6,
} as const;
