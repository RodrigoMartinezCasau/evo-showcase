/**
 * Layout editors for the "new comment" input box at the bottom of the
 * comments panel, and for its send button.
 */

export const NEW_COMMENT_BOX_LAYOUT = {
  offsetX: 0,
  offsetY: 2,
  /** Altura mínima del pill (una línea). */
  minHeight: 40,
  /** @deprecated Use minHeight — kept for callers that read .height */
  height: 40,
  borderRadius: 14,
  backgroundColor: '#15151A',
  fontSize: 14,
  lineHeight: 20,
  /** Mismo tope que ChatInputBar (reflexión / frase). */
  maxInputLines: 11,
  placeholderColor: '#888888',
  paddingHorizontal: 14,
  paddingVertical: 8,
  /** Espacio extra bajo la última línea para que no se corten ascendentes/descendentes. */
  textBottomInset: 4,
  /** Gap between the input pill and the send button — same on every device. */
  gap: 8,
} as const;

export const NEW_COMMENT_SEND_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  /** Diameter of the circular send button (px). */
  size: 32,
} as const;

/**
 * Overlay de comentarios (Modal + teclado). Misma idea que `CHAT_INPUT_ISLAND_LAYOUT`
 * en reflexión/frase, con lift extra para teclados OEM / predictivo / emoji.
 */
export const COMMENT_COMPOSER_KEYBOARD_LAYOUT = {
  // ── iOS (altura de teclado animada, igual que ChatInputBar) ─────────────
  keyboardBubbleGapOffsetY: 20,
  keyboardBubbleGapBlendPx: 120,
  keyboardExtraLiftOffsetY: 12,
  keyboardIosHomeIndicatorLiftRatio: 0.4,

  // ── Android (medición barra ↔ teclado con measureInWindow) ───────────────
  /** Colchón entre el borde superior del teclado y la barra (px). */
  keyboardAndroidOverlapCushionPx: 8,
  /** Fracción del inset de navegación que se suma al colchón. */
  keyboardAndroidNavInsetCushionRatio: 0.35,
  /**
   * Ajuste fino cuando la barra ya queda por encima del teclado (px).
   * Positivo = baja la barra (si en tu OEM queda demasiado alta).
   */
  keyboardAndroidFineTuneDownPx: 0,
  /**
   * Nudge global de translateY en Android (px).
   * Positivo = barra más abajo; negativo = más arriba.
   */
  keyboardAndroidGlobalTranslateNudgeY: 0,
  /** Anclaje inferior del wrapper (px). Positivo = wrapper más arriba. */
  keyboardAndroidWrapperBottomOffsetY: 0,
  /** Reintentos de medición tras abrir teclado (ms). */
  keyboardAndroidMeasureRetryMs: [48, 120, 240] as const,
  keyboardAndroidAnimateDurationMs: 220,

  /** Padding del contenedor del overlay (alineado con `CHAT_BOTTOM_AREA_LAYOUT`). */
  contentPaddingTop: 6,
  contentPaddingBottom: 12,
} as const;
