/**
 * =========================
 * STYLE CONTROLS (edit me)
 * =========================
 * Todas las constantes del bloque Postura/Contrapunto/Pregunta.
 * Iconos en posición absoluta: cambiar tamaño de estrella NO mueve el texto.
 * Texto reserva espacio con TEXT_LEFT_PADDING / ICON_GUTTER_WIDTH.
 */
export const STYLE_CONTROLS = {
  // --- Estrella títulos principales (Tu postura / Contrapunto / Pregunta) ---
  STAR_MAIN_SIZE: 80,
  STAR_MAIN_LEFT_OFFSET: -30,
  STAR_MAIN_GAP_TO_TEXT: 1,
  STAR_MAIN_TOP_OFFSET: -22,

  // --- Estrella títulos de sección (Contrapunto, Pregunta si se diferencian) ---
  STAR_SECTION_SIZE: 40,
  STAR_SECTION_LEFT_OFFSET: 0,
  STAR_SECTION_GAP_TO_TEXT: 8,
  STAR_SECTION_TOP_OFFSET: 0,

  // --- Estrella subtítulos (puntos numerados 1, 2, 3...) ---
  STAR_SUBTITLE_SIZE: 70,
  STAR_SUBTITLE_LEFT_OFFSET: -22,
  STAR_SUBTITLE_GAP_TO_TEXT: 1,
  STAR_SUBTITLE_TOP_OFFSET: -22,

  // --- Número dentro de la estrella (subapartados) ---
  NUMBER_SIZE: 11,
  NUMBER_LEFT_OFFSET: 0,   // micro-ajuste horizontal del número dentro de la estrella
  NUMBER_GAP_TO_TEXT: 0,   // no aplica (número va dentro de estrella)
  NUMBER_TOP_OFFSET: -1,    // micro-ajuste vertical del número dentro de la estrella
  NUMBER_WEIGHT: 700,

  // --- Tipografía ---
  TEXT_MAIN_TITLE_SIZE: 27,
  TEXT_SECTION_TITLE_SIZE: 15,
  TEXT_SUBTITLE_SIZE: 21,
  TEXT_BODY_SIZE: 16,
  TEXT_SUMMARY_SIZE: 16,
  TEXT_SUMMARY_LABEL_SIZE: 11,
  TEXT_QUESTION_SIZE: 16,

  // --- Line height ---
  LINE_HEIGHT_MAIN: 1.3,
  LINE_HEIGHT_BODY: 1.4,

  // --- Espaciado vertical ---
  SPACING_BETWEEN_SUBTITLE_AND_BODY: -31,
  SPACING_BETWEEN_BULLETS: 14,
  SPACING_BETWEEN_BLOCKS: 20,       // entre puntos (subtítulos)
  SPACING_BETWEEN_SECTIONS: 35,     // Postura vs Contrapunto vs Pregunta
  GAP_AFTER_PREGUNTA: 0,           // espacio entre Pregunta y Hechos científicos
  GAP_AFTER_MAIN_TITLE: -20,
  GAP_BEFORE_SUMMARY: 30,

  // --- Divider (resumen rápido) ---
  DIVIDER_HEIGHT: 1,
  DIVIDER_MARGIN_Y: 8,
  DIVIDER_PADDING_TOP: 8,

  // --- Gutter: texto NUNCA invade área de iconos ---
  TEXT_LEFT_PADDING: 38,   // padding-left del texto (independiente del tamaño de estrella)
  ICON_GUTTER_WIDTH: 38,   // ancho del canal izquierdo para iconos

  // --- Card ---
  PAD_CONTAINER_V: 14,
  PAD_CONTAINER_H: 18,
  BODY_PADDING_LEFT: 22,   // indent lista de bullets
}

/** @deprecated Use STYLE_CONTROLS */
export const UI_TUNING = STYLE_CONTROLS

export const px = (n: number) => `${n}px`
