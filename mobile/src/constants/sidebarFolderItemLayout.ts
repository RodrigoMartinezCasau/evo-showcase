/**
 * Editores de posición/tamaño para cada fila de carpeta dentro del sidebar (tab CARPETAS).
 */
export const SIDEBAR_FOLDER_ITEM_LAYOUT = {
  /** Desplazamiento global de toda la lista de carpetas. */
  listOffsetX: 0,
  listOffsetY: 0,

  /** Padding izquierdo de la lista — alinea todos los títulos en el mismo punto horizontal. */
  listPaddingLeft: 8,

  /** Separación vertical entre filas de carpeta. */
  rowGap: 8,

  /** Desplazamiento de cada fila individual. */
  rowOffsetX: -5,
  rowOffsetY: 0,

  /** Título de la carpeta. */
  titleOffsetX: 0,
  titleOffsetY: 0,
  titleFontSize: 11,
  titleLineHeight: 0,

  /** Icono de edición (lápiz) a la derecha del título. */
  pencilSize: 23,
  pencilGapLeft: 6,
  pencilOffsetX: -29,
  pencilOffsetY: 0,
  pencilColor: '#D1D5DB',
} as const;
