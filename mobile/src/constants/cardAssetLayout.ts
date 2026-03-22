export const CARD_ASSET_LAYOUT = {
  SMALL: {
    /**
     * Uniform scale for SMALL Canva card background image.
     * 1 = original rendered size.
     */
    SMALL_CARD_ASSET_SCALE: 2.2,

    /**
     * Expands/shrinks SMALL asset width without changing container layout.
     * Positive expands, negative shrinks.
     */
    SMALL_CARD_ASSET_WIDTH_ADJUST: 0,

    /**
     * Expands/shrinks SMALL asset height without changing container layout.
     * Positive expands, negative shrinks.
     */
    SMALL_CARD_ASSET_HEIGHT_ADJUST: 0,

    /**
     * Relative position editor for SMALL Canva asset only.
     * Positive X moves right, positive Y moves down.
     */
    SMALL_CARD_ASSET_OFFSET_X: 26,
    SMALL_CARD_ASSET_OFFSET_Y: 70,
  },

  MEDIUM: {
    /**
     * Scale for MEDIUM card. Controls BOTH the container height AND the PNG visual size.
     * The container grows to fit the PNG at this scale — the PNG never shrinks.
     * 1.0 = PNG at natural aspect ratio. 2.0 = 2× taller container, PNG fills it.
     */
    MEDIUM_CARD_ASSET_SCALE: 2.2,

    /** Extra px added to the container width (positive = wider). */
    MEDIUM_CARD_ASSET_WIDTH_ADJUST: 500,

    /** Extra px added to the container height (positive = taller). */
    MEDIUM_CARD_ASSET_HEIGHT_ADJUST: 0,

    /** Fine-tune image position within the (already correctly-sized) container. */
    MEDIUM_CARD_ASSET_OFFSET_X: 28,
    MEDIUM_CARD_ASSET_OFFSET_Y: -65,
  },
} as const;

