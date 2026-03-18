export const BOTTOM_BAR_LAYOUT = {
  /** Move the whole bar up/down (positive = up, negative = closer to bottom edge). */
  BOTTOM_BAR_BOTTOM_OFFSET: -25,

  BOTTOM_BAR_HORIZONTAL_PADDING: 0,
  BOTTOM_BAR_INTERNAL_PADDING_VERTICAL: 0,

  /** Used for list padding so content never hides under the bar. */
  BOTTOM_BAR_HEIGHT: 52,

  BOTTOM_BAR_BORDER_RADIUS: 0,
  BOTTOM_BAR_ITEM_GAP: 0,

  /** Extra px on top of safe-area bottom inset. */
  BOTTOM_BAR_SAFE_AREA_COMPENSATION: 0,

  BOTTOM_BAR_ICON_SIZE: 18,
  BOTTOM_BAR_TEXT_SIZE: 11,

  /** Per-icon scaling (for PNGs with transparent padding). */
  SEARCH_ICON_FRAME_SCALE: 1.0,

  /** Fine-tune search icon relative position (px). */
  SEARCH_ICON_OFFSET_X: -10,
  SEARCH_ICON_OFFSET_Y: -2,
} as const;

