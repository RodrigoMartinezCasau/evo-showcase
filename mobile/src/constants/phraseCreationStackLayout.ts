/**
 * Espaciado vertical en la pantalla de creación de frases (`PhraseCreationScreen`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CÓMO EDITAR ESTOS VALORES
 * ─────────────────────────────────────────────────────────────────────────────
 * Cambia el número y guarda. Fast Refresh actualizará la vista al instante
 * porque todos estos valores se aplican como estilos **en línea** dentro del
 * componente (no dentro de StyleSheet.create, que solo se evalúa una vez).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * El padding horizontal *dentro* del botón «▲ PUBLICAR» y el aviso informativo
 * están en `phrasePublishHintLayout.ts`.
 * El campo «AÑADE EL AUTOR…» y el padding del bloque compartido siguen en
 * `debateResponseLayout.ts` → `publishInputPaddingH`, `outerPaddingH`.
 */
export const PHRASE_CREATION_STACK_LAYOUT = {
  // ── Burbuja del usuario ───────────────────────────────────────────────────
  /** Margen inferior de la burbuja del usuario (separación respecto al bloque siguiente). */
  userBubbleBottomGapPx: 10,

  // ── Secciones apiladas ────────────────────────────────────────────────────
  /**
   * Margen superior uniforme entre secciones apiladas:
   * intro (estrella / texto), Apuntes de frase, Añadir a carpeta.
   */
  sectionGapPx: 10,

  // ── Bloque Publicar ───────────────────────────────────────────────────────
  /** Margen superior del bloque Publicar (al pie de la pila, tras carpetas). */
  publishTopGapPx: 0,

  /** Margen inferior del bloque Publicar (aire antes del final del scroll). */
  publishBottomGapPx: 8,

  // ── Intro IA ──────────────────────────────────────────────────────────────
  /** Padding horizontal del bloque de texto del intro IA. */
  introHorizontalPaddingPx: 12,

  // ── ScrollView ────────────────────────────────────────────────────────────
  scrollPaddingHorizontal: 16,
  scrollPaddingTop: 16,
  scrollPaddingBottom: 24,
};
