import { chatCreationScrollBottomInset } from './chatKeyboardScrollLayout';

/**
 * Espaciado vertical en la pantalla de creación de frases (`PhraseCreationScreen`).
 *
 * El padding horizontal *dentro* del botón «▲ PUBLICAR» y el aviso informativo
 * están en `phrasePublishHintLayout.ts`.
 * El campo «AÑADE EL AUTOR…» y el padding del bloque compartido siguen en
 * `debateResponseLayout.ts` → `publishInputPaddingH`, `outerPaddingH`.
 *
 * CÓMO EDITAR: cambia números aquí; Fast Refresh aplica en línea en la pantalla.
 */

/**
 * Hueco mínimo entre el último bloque (Publicar) y la burbuja de entrada inferior.
 * Ajusta aquí si en un dispositivo queda muy pegado o muy lejos.
 */
export const PHRASE_GAP_ABOVE_CHAT_INPUT_PX = 6;

/** @deprecated Usa `chatCreationScrollBottomInset()` en `chatKeyboardScrollLayout.ts`. */
export function phraseCreationScrollBottomInset(): number {
  return chatCreationScrollBottomInset();
}

export const PHRASE_CREATION_STACK_LAYOUT = {
  // ── Burbuja del usuario ───────────────────────────────────────────────────
  /** Margen inferior de la burbuja del usuario (separación respecto al bloque siguiente). */
  userBubbleBottomGapPx: 10,
  /** Margen superior entre turnos (p. ej. tras bloque Publicar de la frase anterior). */
  phraseTurnTopGapPx: 24,

  // ── Secciones apiladas ────────────────────────────────────────────────────
  /**
   * Margen superior uniforme: intro, Apuntes, Carpetas y Publicar (misma
   * separación Apuntes→Carpetas que Carpetas→Publicar).
   */
  sectionGapPx: 10,

  /** Margen inferior del bloque Publicar (el scroll ya reserva hueco con `phraseCreationScrollBottomInset`). */
  publishBottomGapPx: 0,

  // ── Intro IA ──────────────────────────────────────────────────────────────
  /** Padding horizontal del bloque de texto del intro IA. */
  introHorizontalPaddingPx: 12,

  // ── ScrollView ────────────────────────────────────────────────────────────
  scrollPaddingHorizontal: 16,
  scrollPaddingTop: 16,
  /**
   * No se suma al padding inferior del scroll; el hueco bajo Publicar lo fija
   * `phraseCreationScrollBottomInset()` (barra + degradé + gap).
   */
  scrollPaddingBottom: 0,
} as const;
