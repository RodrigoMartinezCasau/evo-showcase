/**
 * Solo el botón "COMUNIDAD" del sidebar (PNG + texto encima).
 * Ajusta aquí posición, tamaño y tipografía sin tocar el resto del drawer.
 */
export const SIDEBAR_COMMUNITY_LAYOUT = {
  // A) Bloque completo (traslación + escala respecto al punto de anclaje del menú)
  SIDEBAR_COMMUNITY_BLOCK_OFFSET_X: -140,
  SIDEBAR_COMMUNITY_BLOCK_OFFSET_Y: -100,
  SIDEBAR_COMMUNITY_BLOCK_SCALE: 0.25,

  // B) PNG del botón
  SIDEBAR_COMMUNITY_BUTTON_WIDTH: 268,
  SIDEBAR_COMMUNITY_BUTTON_HEIGHT: 48,
  SIDEBAR_COMMUNITY_BUTTON_OFFSET_X: 0,
  SIDEBAR_COMMUNITY_BUTTON_OFFSET_Y: 0,

  // C) Texto "COMUNIDAD" (encima del PNG, centrado en el área del botón + estos offsets)
  SIDEBAR_COMMUNITY_TEXT_OFFSET_X: 250,
  SIDEBAR_COMMUNITY_TEXT_OFFSET_Y: 220,
  SIDEBAR_COMMUNITY_TEXT_FONT_SIZE: 70,
  SIDEBAR_COMMUNITY_TEXT_LETTER_SPACING: 0.8,
} as const;
