/**
 * Barra de búsqueda del sidebar (PNG + TextInput). Parámetros independientes.
 */
export const SIDEBAR_SEARCH_BAR_LAYOUT = {
  /**
   * Desplazamiento vertical del bloque de búsqueda (position:absolute en el drawer).
   * No usar transform para el bloque: deja la hitbox en el layout original y bloquea filas.
   */
  /** Igual que Nueva reflexión / Nueva frase (`SIDEBAR_PNG_MENU_BLOCK_OFFSET_X`). */
  SEARCH_BAR_BLOCK_OFFSET_X: -5,
  SEARCH_BAR_BLOCK_OFFSET_Y: -142,
  SEARCH_BAR_BLOCK_SCALE: 1,

  SEARCH_BAR_IMAGE_WIDTH: 290,
  SEARCH_BAR_IMAGE_HEIGHT: 145,
  SEARCH_BAR_OFFSET_X: 0,
  SEARCH_BAR_OFFSET_Y: 0,

  SEARCH_BAR_CROP_TOP: 58,
  SEARCH_BAR_CROP_BOTTOM: 50,
  SEARCH_BAR_CROP_LEFT: 0,
  SEARCH_BAR_CROP_RIGHT: 0,

  SEARCH_BAR_HORIZONTAL_STRETCH: 1,

  SEARCH_BAR_TEXT_BOX_WIDTH: 220,
  SEARCH_BAR_TEXT_BOX_HEIGHT: 40,
  SEARCH_BAR_TEXT_CONTAINER_OFFSET_X: -24,
  SEARCH_BAR_TEXT_CONTAINER_OFFSET_Y: -4,
  SEARCH_BAR_TEXT_OFFSET_X: 0,
  SEARCH_BAR_TEXT_OFFSET_Y: 0,
  SEARCH_BAR_TEXT_FONT_SIZE: 12,
  SEARCH_BAR_TEXT_LETTER_SPACING: 0,
  SEARCH_BAR_PLACEHOLDER_COLOR: '#6B7280',
  SEARCH_BAR_TEXT_COLOR: '#FFFFFF',
  SEARCH_BAR_TEXT_MAX_CHARS: 42,

  /**
   * Separación visual entre la búsqueda y el marco de conversaciones.
   * La capa de búsqueda no ocupa altura en flex (height:0); el bloque inferior
   * usa marginTop negativo = BLOCK_OFFSET_Y + GAP + altura visible del PNG.
   */
  SIDEBAR_SEARCH_TO_CONVERSATIONS_GAP_PX: 6,
} as const;

const SEARCH_BAR_VISIBLE_HEIGHT_PX = Math.max(
  1,
  SIDEBAR_SEARCH_BAR_LAYOUT.SEARCH_BAR_IMAGE_HEIGHT -
    SIDEBAR_SEARCH_BAR_LAYOUT.SEARCH_BAR_CROP_TOP -
    SIDEBAR_SEARCH_BAR_LAYOUT.SEARCH_BAR_CROP_BOTTOM,
);

/** marginTop del bloque de conversaciones respecto a la capa de búsqueda (altura 0 en flex). */
export const SIDEBAR_CONVERSATIONS_AFTER_SEARCH_MARGIN_TOP_PX =
  SIDEBAR_SEARCH_BAR_LAYOUT.SEARCH_BAR_BLOCK_OFFSET_Y +
  SIDEBAR_SEARCH_BAR_LAYOUT.SIDEBAR_SEARCH_TO_CONVERSATIONS_GAP_PX +
  SEARCH_BAR_VISIBLE_HEIGHT_PX;
