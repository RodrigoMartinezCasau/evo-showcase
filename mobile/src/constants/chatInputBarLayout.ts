/**
 * Editable layout & color config for the chat bottom area
 * (input bar + send button + surrounding container).
 */

/** Outer container that wraps input + button. */
export const CHAT_BOTTOM_AREA_LAYOUT = {
  offsetY: 0,
  height: null as number | null,
  paddingBottom: 12,
  paddingTop: 40,
  paddingHorizontal: 12,
  backgroundColor: '#0b0b0f',
  /** Top separator line. Set to 0 to remove. */
  borderTopWidth: 0,
  borderTopColor: '#303030',
} as const;

/** The text input field. */
export const CHAT_INPUT_LAYOUT = {
  offsetX: 0,
  offsetY: -20,
  widthScale: 0.95,
  minHeight: 40,
  maxHeight: 120,
  borderRadius: 24,
  backgroundColor: '#262626',
  borderWidth: 1,
  borderColor: '#303030',
  fontSize: 14,
  paddingHorizontal: 16,
  paddingVertical: 10,
} as const;

/** The send button. */
export const CHAT_SEND_BUTTON_LAYOUT = {
  offsetX: -10,
  offsetY: -20,
  scale: 1,
  size: 44,
  borderRadius: 22,
  backgroundColor: '#c7ff02',
  iconColor: '#0b0b0f',
  iconSize: 20,
} as const;
