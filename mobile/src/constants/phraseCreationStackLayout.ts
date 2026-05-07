import {
  CHAT_BOTTOM_AREA_LAYOUT as AREA,
  CHAT_INPUT_LAYOUT as INP,
  CHAT_INPUT_ISLAND_LAYOUT as ISLAND,
} from './chatInputBarLayout';

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

/**
 * `paddingBottom` del ScrollView de nueva frase: una sola medida derivada de la
 * barra de chat (`chatInputBarLayout`) + un trozo del degradé (overlay), para
 * que Publicar quede siempre justo encima de la burbuja con separación mínima.
 */
export function phraseCreationScrollBottomInset(): number {
  const inputIslandRow =
    AREA.paddingTop + INP.minHeight + AREA.paddingBottom + ISLAND.extraHeight;
  const gradientClearZone = Math.round(ISLAND.gradientHeight * 0.22);
  return PHRASE_GAP_ABOVE_CHAT_INPUT_PX + inputIslandRow + gradientClearZone;
}

export const PHRASE_CREATION_STACK_LAYOUT = {
  // ── Burbuja del usuario ───────────────────────────────────────────────────
  /** Margen inferior de la burbuja del usuario (separación respecto al bloque siguiente). */
  userBubbleBottomGapPx: 10,

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
