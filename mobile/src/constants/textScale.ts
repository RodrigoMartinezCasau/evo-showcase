/**
 * ─────────────────────────────────────────────────────────────
 *  EDITOR DE FUENTES — EVO APP
 *  Cambia aquí los tamaños de fuente de todos los textos de la IA.
 *  Guarda el archivo y recarga la app para ver los cambios.
 * ─────────────────────────────────────────────────────────────
 */

export const AI_TEXT_SCALE = {
  // ── Introducción de la IA (texto que aparece antes de las cards) ──

  /** Texto de introducción de la IA (typewriter) */
  introFontSize: 19,
  introLineHeight: 22,

  // ── Output de la IA (reflexiones) ────────────────────────────

  /** Títulos numerados: "1. Influencia de la contemporaneidad" */
  pointTitleFontSize: 20,
  pointTitleLineHeight: 22,

  /** Texto de los bullets / puntos grises */
  pointBulletFontSize: 18,
  pointBulletLineHeight: 23,

  /** Label del resumen rápido ("RESUMEN RÁPIDO") */
  summaryLabelFontSize: 15,
  summaryLabelLineHeight: 16,

  /** Cuerpo del resumen rápido */
  summaryBodyFontSize: 17,
  summaryBodyLineHeight: 22,

  // ── Cabeceras de sección ("TU POSTURA", "CONTRAPUNTO"…) ───────

  /** Título de sección en la barra superior de cada card */
  sectionHeaderFontSize: 26,

  // ── Pregunta reflexiva y cita filosófica ──────────────────────

  /** Texto de la pregunta reflexiva */
  questionFontSize: 17,
  questionLineHeight: 18,

  /** Texto de la cita filosófica */
  quoteFontSize: 17,
  quoteLineHeight: 18,
} as const;
