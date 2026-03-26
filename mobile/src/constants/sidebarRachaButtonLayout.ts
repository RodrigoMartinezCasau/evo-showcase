/**
 * Botón RACHA: capa absoluta independiente de CLAN y FRASES.
 *
 * X, escala, viewport, fuente y crop iniciales iguales que el clan (110, 4.5, 56×56, 576×1024, crop 0).
 * `RACHA_BUTTON_OFFSET_Y` queda bajo el botón Frases (misma X para alinear la columna).
 * Sin imports de otros layouts: cada fichero se edita por separado.
 */
export const SIDEBAR_RACHA_BUTTON_LAYOUT = {
  RACHA_BUTTON_OFFSET_X: 110,
  /** Debajo de Frases: frases Y (400) + 56×4.5 + 8 */
  RACHA_BUTTON_OFFSET_Y: 550,

  RACHA_BUTTON_SCALE: 4.5,

  RACHA_BUTTON_VIEWPORT_WIDTH: 56,
  RACHA_BUTTON_VIEWPORT_HEIGHT: 56,

  RACHA_BUTTON_SOURCE_WIDTH: 576,
  RACHA_BUTTON_SOURCE_HEIGHT: 1024,

  RACHA_BUTTON_CROP_TOP: 0,
  RACHA_BUTTON_CROP_BOTTOM: 0,
  RACHA_BUTTON_CROP_LEFT: 0,
  RACHA_BUTTON_CROP_RIGHT: 0,
} as const;
