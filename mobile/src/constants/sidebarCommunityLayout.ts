/**
 * Solo el botón "COMUNIDAD" del sidebar (PNG + texto encima).
 * Ajusta aquí posición, tamaño y tipografía sin tocar el resto del drawer.
 */
export const SIDEBAR_COMMUNITY_LAYOUT = {
  // A) Bloque completo (traslación + escala respecto al punto de anclaje del menú)
  SIDEBAR_COMMUNITY_BLOCK_OFFSET_X: -15,
  SIDEBAR_COMMUNITY_BLOCK_OFFSET_Y: -60,
  SIDEBAR_COMMUNITY_BLOCK_SCALE: 1,

  // B) PNG del botón: el asset se estira a este rectángulo; los CROP_* recortan píxeles de verdad.
  // Ajusta ancho/alto a la proporción del PNG si no quieres deformación leve.
  SIDEBAR_COMMUNITY_BUTTON_WIDTH: 268,
  SIDEBAR_COMMUNITY_BUTTON_HEIGHT: 145,
  SIDEBAR_COMMUNITY_BUTTON_OFFSET_X: 0,
  SIDEBAR_COMMUNITY_BUTTON_OFFSET_Y: 0,

  /** Recorte visual (px ocultos por lado). No modifica el PNG en disco. */
  SIDEBAR_COMMUNITY_CROP_TOP: 40,
  SIDEBAR_COMMUNITY_CROP_BOTTOM: 40,
  SIDEBAR_COMMUNITY_CROP_LEFT: 0,
  SIDEBAR_COMMUNITY_CROP_RIGHT: 0,

  /**
   * Estira el botón en horizontal (solo el PNG recortado). 1 = sin cambio; 1.2 ≈ 20 % más ancho.
   * El layout del bloque y el centrado del texto usan este ancho extendido.
   */
  SIDEBAR_COMMUNITY_HORIZONTAL_STRETCH: 1,

  // C) Texto "COMUNIDAD" (capa independiente del crop; caja amplia evita clipping)
  SIDEBAR_COMMUNITY_TEXT_BOX_WIDTH: 220,
  SIDEBAR_COMMUNITY_TEXT_BOX_HEIGHT: 48,
  /** Desplaza la caja de texto respecto al centro del área visible recortada. */
  SIDEBAR_COMMUNITY_TEXT_CONTAINER_OFFSET_X: -40,
  SIDEBAR_COMMUNITY_TEXT_CONTAINER_OFFSET_Y: -0,
  SIDEBAR_COMMUNITY_TEXT_OFFSET_X: 0,
  SIDEBAR_COMMUNITY_TEXT_OFFSET_Y: 0,
  SIDEBAR_COMMUNITY_TEXT_FONT_SIZE: 18,
  SIDEBAR_COMMUNITY_TEXT_LETTER_SPACING: 0,
} as const;
