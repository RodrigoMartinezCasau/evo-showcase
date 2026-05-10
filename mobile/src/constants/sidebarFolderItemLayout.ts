/**
 * Editores de posición/tamaño para cada fila de carpeta dentro del sidebar (tab CARPETAS).
 */
export const SIDEBAR_FOLDER_ITEM_LAYOUT = {
  /** Desplazamiento global de toda la lista de carpetas. */
  listOffsetX: 0,
  listOffsetY: 0,

  /** Mismo margen relativo que las conversaciones (~3% del ancho de columna). */
  listPaddingLeft: '3%',

  /** Separación vertical entre filas de carpeta. */
  rowGap: 8,

  rowOffsetX: 0,
  rowOffsetY: 0,

  /** Título de la carpeta. */
  titleOffsetX: 0,
  titleOffsetY: 0,
  titleFontSize: 11,
  titleLineHeight: 0,

  /** Icono de edición (lápiz) a la derecha del título. */
  pencilSize: 23,
  pencilGapLeft: 6,
  /** 0 = lápiz pegado al borde derecho del contenedor (misma columna que conversaciones). */
  pencilOffsetX: 0,
  pencilOffsetY: 0,
  pencilColor: '#D1D5DB',
} as const;
