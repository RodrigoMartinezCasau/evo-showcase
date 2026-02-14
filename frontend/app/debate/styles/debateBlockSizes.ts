/**
 * =========================
 * UI_TUNING (edit me)
 * =========================
 * Cambia solo estos valores para ajustar el look del bloque Postura/Contrapunto/Pregunta.
 * No altera lógica ni contenido.
 */
export const UI_TUNING = {
  // --- Stars ---
  STAR_TITLE_SIZE_PX: 22,       // estrella al lado de "Tu postura / Contrapunto / Pregunta"
  STAR_SUB_SIZE_PX: 22,         // estrella al lado de cada subtítulo (punto 1,2,3...) y delante de la pregunta
  STAR_GAP_PX: 8,               // espacio horizontal entre estrella y texto

  // --- Star number overlay (subapartados) ---
  STAR_NUM_FONT_PX: 12,         // tamaño del número dentro de la estrella
  STAR_NUM_WEIGHT: 700,
  STAR_NUM_OFFSET_X_PX: 0,      // micro-ajuste para centrar
  STAR_NUM_OFFSET_Y_PX: 0,

  // --- Typography ---
  FONT_TITLE_PX: 15,            // "Tu postura (en su mejor versión)", "Contrapunto", "Pregunta"
  FONT_SUBTITLE_PX: 13,         // subtítulos de cada punto
  FONT_BODY_PX: 13,             // bullets
  FONT_SUMMARY_PX: 13,          // resumen rápido
  FONT_SUMMARY_LABEL_PX: 11,    // "RESUMEN RÁPIDO" label
  LINE_TITLE: 1.3,
  LINE_SUBTITLE: 1.3,
  LINE_BODY: 1.4,

  // --- Spacing (vertical rhythm) ---
  PAD_CONTAINER_V_PX: 14,
  PAD_CONTAINER_H_PX: 18,
  GAP_AFTER_MAIN_TITLE_PX: 10,   // espacio debajo del título principal
  GAP_BETWEEN_POINTS_PX: 14,     // entre un punto/subtítulo y el siguiente
  GAP_SUBTITLE_TO_BODY_PX: 6,    // entre subtítulo y bullets
  GAP_BETWEEN_BULLETS_PX: 4,     // entre bullets
  GAP_BEFORE_SUMMARY_PX: 8,
  GAP_SUMMARY_TOP_PX: 8,
  GAP_BETWEEN_SECTIONS_PX: 12,   // Postura -> Contrapunto -> Pregunta
  BODY_PADDING_LEFT_PX: 22,      // indent de la lista de bullets

  // --- Divider (resumen rápido) ---
  DIVIDER_HEIGHT_PX: 1,
  DIVIDER_MARGIN_TOP_PX: 8,
  DIVIDER_PADDING_TOP_PX: 8,
}

export const px = (n: number) => `${n}px`
