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
