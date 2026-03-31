/** Layout editors for the phrase/quote display in detail / Para ti screens. */

export const DETAIL_QUOTE_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  fontSize: 30,
  lineHeight: 48,
  /** Reduce available width from the left (px) — keeps the centering symmetric. */
  maxWidthReductionLeft: 20,
  /** Reduce available width from the right (px) to keep text away from action column. */
  maxWidthReductionRight: 40,
} as const;

export const DETAIL_QUOTE_AUTHOR_LAYOUT = {
  offsetX: 0,
  offsetY: 12,
  fontSize: 24,
} as const;
