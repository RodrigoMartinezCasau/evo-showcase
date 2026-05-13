/**
 * Layout editors for the "new comment" input box at the bottom of the
 * comments panel, and for its send button.
 */

export const NEW_COMMENT_BOX_LAYOUT = {
  offsetX: 0,
  offsetY: 2,
  /** Fixed height of the input pill (px). */
  height: 40,
  borderRadius: 14,
  backgroundColor: '#15151A',
  fontSize: 14,
  placeholderColor: '#888888',
  /** Horizontal padding inside the text input pill. */
  paddingHorizontal: 14,
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
