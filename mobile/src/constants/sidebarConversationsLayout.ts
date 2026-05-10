/**
 * Lista de conversaciones del sidebar: estilo minimal (fondo negro, sin marco de clan).
 * El ancho útil coincide con `SIDEBAR_PNG_MENU_BUTTON_LAYOUT_WIDTH_PX` (misma columna
 * que «Nueva reflexión»): título al borde izquierdo del botón, lápiz al borde derecho.
 */
export const SIDEBAR_CONVERSATIONS_LAYOUT = {
  /** El panel usa ancho completo del drawer; sin márgenes negativos legacy. */
  SIDEBAR_CONVERSATIONS_BLOCK_OFFSET_X: 0,
  SIDEBAR_CONVERSATIONS_BLOCK_OFFSET_Y: 0,
  SIDEBAR_CONVERSATIONS_BLOCK_SCALE: 1,

  SIDEBAR_CONVERSATIONS_OFFSET_X: 0,
  SIDEBAR_CONVERSATIONS_OFFSET_Y: 0,

  /** Marco desactivado (diseño minimal); el área de scroll sigue usando el mismo flex. */
  SIDEBAR_CONVERSATIONS_FRAME_BORDER_WIDTH: 0,
  SIDEBAR_CONVERSATIONS_FRAME_CORNER_RADIUS: 0,
  SIDEBAR_CONVERSATIONS_FRAME_FILL_COLOR: '#000000',

  /** Inset del ScrollView respecto al contenedor (0 = alineación con bordes del botón PNG). */
  SIDEBAR_CONVERSATIONS_INSET_LEFT: 0,
  SIDEBAR_CONVERSATIONS_INSET_RIGHT: 0,
  SIDEBAR_CONVERSATIONS_INSET_TOP: 0,
  SIDEBAR_CONVERSATIONS_INSET_BOTTOM: 0,

  /** Espacio vertical entre las tres pestañas de sección (FAVORITOS / CARPETAS / PENSAMIENTOS). */
  SIDEBAR_CONVERSATIONS_SECTION_GAP_Y: 14,

  /** Hueco horizontal entre los botones FAVORITOS y CARPETAS (agrupados a la izquierda). */
  SIDEBAR_FAVORITES_FOLDERS_ROW_GAP_X: 22,

  /**
   * Hueco vertical entre la fila de filtros (fuera del marco) y el borde superior
   * del cuadro de conversaciones; también bajo «Resultados» en búsqueda.
   */
  SIDEBAR_CONVERSATIONS_SECTIONS_TO_LIST_GAP_Y: 16,

  /** FAVORITOS — alineados al borde izquierdo de la columna (mismo eje que el botón PNG). */
  SIDEBAR_FAVORITES_OFFSET_X: 0,
  SIDEBAR_FAVORITES_OFFSET_Y: 2,
  SIDEBAR_FAVORITES_FONT_SIZE: 11,
  SIDEBAR_FAVORITES_SCALE: 1,
  SIDEBAR_FAVORITES_LETTER_SPACING: 0.6,
  /** Hueco horizontal entre icono PNG y etiqueta FAVORITOS. */
  FAVORITES_ICON_TEXT_GAP_X: 6,
  FAVORITES_ICON_OFFSET_X: 0,
  FAVORITES_ICON_OFFSET_Y: 0,
  FAVORITES_ICON_SCALE: 1.8,
  FAVORITES_ICON_BASE_SIZE: 18,

  /** CARPETAS */
  SIDEBAR_FOLDERS_OFFSET_X: 0,
  SIDEBAR_FOLDERS_OFFSET_Y: 0,
  SIDEBAR_FOLDERS_FONT_SIZE: 11,
  SIDEBAR_FOLDERS_SCALE: 1,
  SIDEBAR_FOLDERS_LETTER_SPACING: 0.6,
  FOLDERS_ICON_TEXT_GAP_X: 6,
  FOLDERS_ICON_OFFSET_X: 0,
  FOLDERS_ICON_OFFSET_Y: 0,
  FOLDERS_ICON_SCALE: 1.5,
  FOLDERS_ICON_BASE_SIZE: 18,

  /** PENSAMIENTOS */
  SIDEBAR_THOUGHTS_OFFSET_X: 2,
  SIDEBAR_THOUGHTS_OFFSET_Y: 0,
  SIDEBAR_THOUGHTS_FONT_SIZE: 11,
  SIDEBAR_THOUGHTS_SCALE: 1,
  SIDEBAR_THOUGHTS_LETTER_SPACING: 0.6,
  THOUGHTS_ICON_TEXT_GAP_X: 6,
  THOUGHTS_ICON_OFFSET_X: 0,
  THOUGHTS_ICON_OFFSET_Y: 0,
  THOUGHTS_ICON_SCALE: 1.5,
  THOUGHTS_ICON_BASE_SIZE: 18,

  /**
   * Padding izquierdo del contenido del ScrollView (porcentaje del ancho de la columna).
   * ~3% separa el inicio del texto del borde; antes estaba en 0.
   */
  SIDEBAR_CONVERSATIONS_ITEM_OFFSET_X: '1%',
  SIDEBAR_CONVERSATIONS_ITEM_OFFSET_Y: 4,
  /** Separación vertical entre filas de conversación. */
  SIDEBAR_CONVERSATIONS_ITEM_GAP_Y: 6,
  SIDEBAR_CONVERSATIONS_ITEM_TEXT_FONT_SIZE: 13,
  SIDEBAR_CONVERSATIONS_ITEM_TITLE_COLOR: '#E5E5E5',
  SIDEBAR_CONVERSATIONS_ITEM_TEXT_LINE_HEIGHT: 18,
  /** Una sola línea en lista; título corto p. ej. ~3 palabras (resto con «…»). */
  SIDEBAR_CONVERSATIONS_ITEM_TEXT_MIN_HEIGHT: 18,

  SIDEBAR_CONVERSATIONS_TITLE_ICONS_GAP_X: 8,
  /** 0 = lápiz al borde derecho de la columna (coincide con borde derecho del botón PNG). */
  SIDEBAR_CONVERSATIONS_ICONS_STRIP_MARGIN_END: 0,
  SIDEBAR_CONVERSATIONS_ICONS_INNER_GAP_X: -2,

  SIDEBAR_CONVERSATIONS_STAR_OFFSET_Y: -4,
  SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_Y: -2,

  SIDEBAR_CONVERSATIONS_STAR_SIZE: 20,
  SIDEBAR_CONVERSATIONS_PENCIL_SIZE: 24,

  SIDEBAR_CONVERSATIONS_STAR_OFFSET_X: 89,
  SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_X: 106,
} as const;
