export const BOTTOM_BAR_LAYOUT = {
  /** Move the whole bar up/down (positive = up, negative = closer to bottom edge). */
  BOTTOM_BAR_BOTTOM_OFFSET: -10,

  BOTTOM_BAR_HORIZONTAL_PADDING: 0,
  BOTTOM_BAR_INTERNAL_PADDING_VERTICAL: 0,

  /** Used for list padding so content never hides under the bar. */
  BOTTOM_BAR_HEIGHT: 52,

  BOTTOM_BAR_BORDER_RADIUS: 0,
  BOTTOM_BAR_ITEM_GAP: 0,

  /** Extra px on top of safe-area bottom inset. */
  BOTTOM_BAR_SAFE_AREA_COMPENSATION: 0,

  // ----- Texto: SIGUIENDO, PARA TI (+ icono perfil y búsqueda) -----
  /** Tamaño de fuente de las 3 pestañas de texto (activa e inactiva). */
  BOTTOM_BAR_TAB_TEXT_SIZE: 14,

  // ----- Línea bajo tab activa -----
  /** Grosor de la línea (px). */
  BOTTOM_BAR_UNDERLINE_THICKNESS: 2,
  /** Separación extra hacia abajo respecto al borde inferior del slot (px). */
  BOTTOM_BAR_UNDERLINE_TRANSLATE_Y: 5,
  /**
   * Largo de la línea (px). `null` = todo el ancho de la columna de esa tab (como hasta ahora).
   * Solo afecta a SIGUIENDO / MÁS VOTADAS / PARA TI.
   */
  BOTTOM_BAR_UNDERLINE_WIDTH_TEXT: 80,
  /**
   * Largo de la línea bajo la lupa (px). `null` = ancho completo de la columna.
   * Pon un valor cercano al tamaño del icono (p. ej. 20–28) para que no sobresalga.
   */
  BOTTOM_BAR_UNDERLINE_WIDTH_SEARCH: 64,

  // ----- Icono búsqueda (lupa, SVG por clan) -----
  /** Tamaño base (px) del marco de la lupa; se multiplica por SEARCH_ICON_FRAME_SCALE y por `BOTTOM_BAR_LUPITA_EDITOR.scale`. */
  BOTTOM_BAR_SEARCH_ICON_SIZE: 26,

  /** Escala base del asset (padding transparente del SVG). */
  SEARCH_ICON_FRAME_SCALE: 1.0,

  /**
   * Editor independiente: solo la lupa (no afecta a SIGUIENDO / MÁS VOTADAS / PARA TI).
   * Valores iniciales = offsets que antes eran SEARCH_ICON_OFFSET_*.
   */
  BOTTOM_BAR_LUPITA_EDITOR: {
    offsetX: -10,
    offsetY: 0,
    scale: 1,
  },

  /**
   * Solo la línea bajo la lupa: posición horizontal relativa (px).
   * Positivo = derecha, negativo = izquierda. No afecta a SIGUIENDO / MÁS VOTADAS / PARA TI.
   */
  BOTTOM_BAR_LUPITA_UNDERLINE_EDITOR: {
    offsetX: -10,
  },

  /** Botón + crear (entre MÁS VOTADAS y PARA TI). */
  BOTTOM_BAR_CREATE_BUTTON_SIZE: 34,
  BOTTOM_BAR_CREATE_BUTTON_BORDER_RADIUS: 10,
  BOTTOM_BAR_CREATE_BUTTON_BORDER_WIDTH: 1.5,

  // ----- Desplegable orden Siguiendo (fila SVG + texto) -----
  /**
   * Altura mínima de cada fila; si el texto pide más, la fila crece y el SVG se estira.
   * El texto se centra en ese rectángulo (misma idea que las tabs: ranura estirada + centro en Y).
   */
  FOLLOWING_SORT_DROPDOWN_ROW_MIN_HEIGHT: 52,
  /**
   * Desplazamiento en Y del bloque de texto en **todas** las filas (positivo = abajo).
   * Un solo valor para mantener la misma posición relativa al asset en todos los dispositivos.
   */
  FOLLOWING_SORT_DROPDOWN_TEXT_UNIVERSAL_OFFSET_Y: 0,
} as const;
