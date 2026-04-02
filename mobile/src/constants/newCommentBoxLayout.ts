/**
 * Layout editors for the "new comment" input box at the bottom of the
 * comments panel, and for its send button.
 */

export const NEW_COMMENT_BOX_LAYOUT = {
  offsetX: 0,
  offsetY: 2,
  /** 1 = full panel width; < 1 narrower. */
  widthScale: 1,
  /** Fixed height of the input row (px). */
  height: 40,
  borderRadius: 14,
  backgroundColor: '#2A2A2E',
  fontSize: 14,
  placeholderColor: '#888888',
} as const;

export const NEW_COMMENT_SEND_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  /** Width of the send button (px). */
  width: 56,
  /** Height of the send button (px). */
  height: 32,
  borderRadius: 10,
  activeColor: '#FFFFFF',
  inactiveColor: '#555555',
  fontSize: 13,
} as const;
