/**
 * Contenedor de conversaciones del sidebar (marco PNG por clan + viewport + lista).
 * Parámetros independientes.
 */
export const SIDEBAR_CONVERSATIONS_LAYOUT = {
  SIDEBAR_CONVERSATIONS_BLOCK_OFFSET_X: -77,
  SIDEBAR_CONVERSATIONS_BLOCK_OFFSET_Y: -143,
  SIDEBAR_CONVERSATIONS_BLOCK_SCALE: 1,

  SIDEBAR_CONVERSATIONS_IMAGE_WIDTH: 270,
  SIDEBAR_CONVERSATIONS_IMAGE_HEIGHT: 444,
  SIDEBAR_CONVERSATIONS_OFFSET_X: 0,
  SIDEBAR_CONVERSATIONS_OFFSET_Y: 0,

  SIDEBAR_CONVERSATIONS_CROP_TOP: 0,
  SIDEBAR_CONVERSATIONS_CROP_BOTTOM: 0,
  SIDEBAR_CONVERSATIONS_CROP_LEFT: 0,
  SIDEBAR_CONVERSATIONS_CROP_RIGHT: 0,

  SIDEBAR_CONVERSATIONS_HORIZONTAL_STRETCH: 1,

  SIDEBAR_CONVERSATIONS_VIEWPORT_WIDTH: 160,
  SIDEBAR_CONVERSATIONS_VIEWPORT_HEIGHT: 425,
  SIDEBAR_CONVERSATIONS_VIEWPORT_OFFSET_X: 75,
  SIDEBAR_CONVERSATIONS_VIEWPORT_OFFSET_Y: 16,

  /** Espacio vertical entre las tres pestañas de sección (FAVORITOS / CARPETAS / PENSAMIENTOS). */
  SIDEBAR_CONVERSATIONS_SECTION_GAP_Y: 22,

  /**
   * Hueco entre el bloque de cabeceras (tras “PENSAMIENTOS”) y el inicio de la lista de conversaciones.
   * Sube el valor para separar más el texto PENSAMIENTOS de la primera fila (p. ej. “Dios”).
   */
  SIDEBAR_CONVERSATIONS_SECTIONS_TO_LIST_GAP_Y: 11,

  /** FAVORITOS — independientes (no derivan de otros layouts). */
  SIDEBAR_FAVORITES_OFFSET_X: 4,
  SIDEBAR_FAVORITES_OFFSET_Y: 4,
  SIDEBAR_FAVORITES_FONT_SIZE: 10,
  SIDEBAR_FAVORITES_SCALE: 1,
  SIDEBAR_FAVORITES_LETTER_SPACING: 0.5,
  /** Hueco horizontal entre icono PNG y etiqueta FAVORITOS. */
  FAVORITES_ICON_TEXT_GAP_X: 6,
  /** Icono estrella (PNG) a la izquierda del texto; independiente del bloque de texto. */
  FAVORITES_ICON_OFFSET_X: 0,
  FAVORITES_ICON_OFFSET_Y: 0,
  FAVORITES_ICON_SCALE: 1.8,
  /** Tamaño base (ancho/alto) del PNG antes de aplicar FAVORITES_ICON_SCALE. */
  FAVORITES_ICON_BASE_SIZE: 18,

  /** CARPETAS */
  SIDEBAR_FOLDERS_OFFSET_X: 4,
  SIDEBAR_FOLDERS_OFFSET_Y: 0,
  SIDEBAR_FOLDERS_FONT_SIZE: 10,
  SIDEBAR_FOLDERS_SCALE: 1,
  SIDEBAR_FOLDERS_LETTER_SPACING: 0.5,
  FOLDERS_ICON_TEXT_GAP_X: 6,
  FOLDERS_ICON_OFFSET_X: 0,
  FOLDERS_ICON_OFFSET_Y: 0,
  FOLDERS_ICON_SCALE: 1.5,
  FOLDERS_ICON_BASE_SIZE: 18,

  /** PENSAMIENTOS (antes “TUS PENSAMIENTOS”) */
  SIDEBAR_THOUGHTS_OFFSET_X: 4,
  SIDEBAR_THOUGHTS_OFFSET_Y: 0,
  SIDEBAR_THOUGHTS_FONT_SIZE: 10,
  SIDEBAR_THOUGHTS_SCALE: 1,
  SIDEBAR_THOUGHTS_LETTER_SPACING: 0.5,
  THOUGHTS_ICON_TEXT_GAP_X: 6,
  THOUGHTS_ICON_OFFSET_X: 0,
  THOUGHTS_ICON_OFFSET_Y: 0,
  THOUGHTS_ICON_SCALE: 1.5,
  THOUGHTS_ICON_BASE_SIZE: 18,

  SIDEBAR_CONVERSATIONS_ITEM_OFFSET_X: 8,
  SIDEBAR_CONVERSATIONS_ITEM_OFFSET_Y: 8,
  /** Separación vertical entre filas de conversación (solo `marginBottom` del contenedor de cada item). */
  SIDEBAR_CONVERSATIONS_ITEM_GAP_Y: -8,
  SIDEBAR_CONVERSATIONS_ITEM_TEXT_FONT_SIZE: 10,
  /** Color del título de cada conversación (antes el gris de la línea Reflexión/Frase). */
  SIDEBAR_CONVERSATIONS_ITEM_TITLE_COLOR: '#6B7280',
  SIDEBAR_CONVERSATIONS_ITEM_TEXT_WIDTH: 130,
  SIDEBAR_CONVERSATIONS_ITEM_TEXT_HEIGHT: 36,

  /** Hueco horizontal entre el título y la franja de iconos (fila flex). */
  SIDEBAR_CONVERSATIONS_TITLE_ICONS_GAP_X: 6,
  /**
   * Desplaza la franja del lápiz hacia la izquierda respecto al borde derecho de la fila.
   * Valores mayores = más a la izquierda (más hueco respecto al borde del viewport).
   */
  SIDEBAR_CONVERSATIONS_ICONS_STRIP_MARGIN_END: 34,
  /** Reservado; la fila solo muestra el lápiz (favorito va en su menú). */
  SIDEBAR_CONVERSATIONS_ICONS_INNER_GAP_X: -2,

  /** Referencia histórica (estrella retirada de la fila). */
  SIDEBAR_CONVERSATIONS_STAR_OFFSET_Y: -4,
  /** Ajuste vertical fino del lápiz respecto al título (fila flex). */
  SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_Y: -5,

  /** Referencia histórica (estrella retirada de la fila). */
  SIDEBAR_CONVERSATIONS_STAR_SIZE: 20,
  SIDEBAR_CONVERSATIONS_PENCIL_SIZE: 23,

  /**
   * Referencia histórica (layout absoluto). La lista usa fila flex; no se leen en `SidebarConversationsPanel`.
   */
  SIDEBAR_CONVERSATIONS_STAR_OFFSET_X: 89,
  SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_X: 106,
} as const;
