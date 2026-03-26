/**
 * Botón FRASES: capa absoluta independiente del botón CLAN.
 *
 * Valores iniciales alineados con `sidebarClanButtonLayout` en el momento de creación
 * (misma X, escala, viewport, fuente y crop). `FRASES_BUTTON_OFFSET_Y` sitúa el botón
 * justo debajo del bloque del clan (mismas fórmulas que si se sumara alto×escala + 8).
 * Este fichero no importa el layout del clan: puedes editar cada botón por separado.
 */
export const SIDEBAR_FRASES_BUTTON_LAYOUT = {
  FRASES_BUTTON_OFFSET_X: 110,
  /** Debajo del clan: clan Y (249) + 56×4.5 + 8 */
  FRASES_BUTTON_OFFSET_Y: 400,

  FRASES_BUTTON_SCALE: 4.5,

  FRASES_BUTTON_VIEWPORT_WIDTH: 56,
  FRASES_BUTTON_VIEWPORT_HEIGHT: 56,

  FRASES_BUTTON_SOURCE_WIDTH: 576,
  FRASES_BUTTON_SOURCE_HEIGHT: 1024,

  FRASES_BUTTON_CROP_TOP: 0,
  FRASES_BUTTON_CROP_BOTTOM: 0,
  FRASES_BUTTON_CROP_LEFT: 0,
  FRASES_BUTTON_CROP_RIGHT: 0,
} as const;
