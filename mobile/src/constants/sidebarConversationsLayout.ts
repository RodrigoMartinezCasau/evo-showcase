/**
 * Contenedor de conversaciones del sidebar: marco con borde de clan + lista.
 * Los SVG de «Nuevas barras conversaciones» llevan clipPaths anidados que
 * react-native-svg a menudo no compone bien; el marco visible es un View nativo
 * con los mismos colores que el arte (`getClanColor`).
 */
export const SIDEBAR_CONVERSATIONS_LAYOUT = {
  /** El panel usa ancho completo del drawer; sin márgenes negativos legacy. */
  SIDEBAR_CONVERSATIONS_BLOCK_OFFSET_X: 0,
  SIDEBAR_CONVERSATIONS_BLOCK_OFFSET_Y: 0,
  SIDEBAR_CONVERSATIONS_BLOCK_SCALE: 1,

  SIDEBAR_CONVERSATIONS_OFFSET_X: 0,
  SIDEBAR_CONVERSATIONS_OFFSET_Y: 0,

  /** Marco redondeado (View) — aproxima el grosor del borde de los SVG. */
  SIDEBAR_CONVERSATIONS_FRAME_BORDER_WIDTH: 3,
  SIDEBAR_CONVERSATIONS_FRAME_CORNER_RADIUS: 14,
  SIDEBAR_CONVERSATIONS_FRAME_FILL_COLOR: '#0b0b0f',

  /**
   * Inset del contenido (pestañas + lista) respecto al borde del marco.
   * Porcentajes respecto al contenedor del marco.
   */
  SIDEBAR_CONVERSATIONS_INSET_LEFT_PCT: '5.5%',
  SIDEBAR_CONVERSATIONS_INSET_RIGHT_PCT: '5.5%',
  SIDEBAR_CONVERSATIONS_INSET_TOP_PCT: '2.5%',
  SIDEBAR_CONVERSATIONS_INSET_BOTTOM_PCT: '3%',

  /** Espacio vertical entre las tres pestañas de sección (FAVORITOS / CARPETAS / PENSAMIENTOS). */
  SIDEBAR_CONVERSATIONS_SECTION_GAP_Y: 14,

  /** Hueco horizontal entre los botones FAVORITOS y CARPETAS (agrupados a la izquierda). */
  SIDEBAR_FAVORITES_FOLDERS_ROW_GAP_X: 22,

  /**
   * Hueco vertical entre la fila de filtros (fuera del marco) y el borde superior
   * del cuadro de conversaciones; también bajo «Resultados» en búsqueda.
   */
  SIDEBAR_CONVERSATIONS_SECTIONS_TO_LIST_GAP_Y: 16,

  /** FAVORITOS — independientes (no derivan de otros layouts). */
  SIDEBAR_FAVORITES_OFFSET_X: 2,
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
  SIDEBAR_FOLDERS_OFFSET_X: 2,
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

  SIDEBAR_CONVERSATIONS_ITEM_OFFSET_X: 4,
  SIDEBAR_CONVERSATIONS_ITEM_OFFSET_Y: 4,
  /** Separación vertical entre filas de conversación. */
  SIDEBAR_CONVERSATIONS_ITEM_GAP_Y: 6,
  SIDEBAR_CONVERSATIONS_ITEM_TEXT_FONT_SIZE: 13,
  SIDEBAR_CONVERSATIONS_ITEM_TITLE_COLOR: '#E8EAEF',
  SIDEBAR_CONVERSATIONS_ITEM_TEXT_LINE_HEIGHT: 18,
  /** Una sola línea en lista; título corto p. ej. ~3 palabras (resto con «…»). */
  SIDEBAR_CONVERSATIONS_ITEM_TEXT_MIN_HEIGHT: 18,

  SIDEBAR_CONVERSATIONS_TITLE_ICONS_GAP_X: 8,
  /** Franja de iconos: menos margen al borde derecho del marco (lista más ancha). */
  SIDEBAR_CONVERSATIONS_ICONS_STRIP_MARGIN_END: 8,
  SIDEBAR_CONVERSATIONS_ICONS_INNER_GAP_X: -2,

  SIDEBAR_CONVERSATIONS_STAR_OFFSET_Y: -4,
  SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_Y: -2,

  SIDEBAR_CONVERSATIONS_STAR_SIZE: 20,
  SIDEBAR_CONVERSATIONS_PENCIL_SIZE: 24,

  SIDEBAR_CONVERSATIONS_STAR_OFFSET_X: 89,
  SIDEBAR_CONVERSATIONS_PENCIL_OFFSET_X: 106,
} as const;
