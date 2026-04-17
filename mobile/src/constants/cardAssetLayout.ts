/**
 * ── SIN CLAN BANNER POSITION OVERRIDE ──────────────────────────────────────
 * Applies ONLY when the card's author has no clan (clanId = null / "Sin Clan").
 * Overrides the per-tier BANNER_OFFSET_X / BANNER_OFFSET_Y from cardLayout.ts
 * so the 297.png ribbon can be fine-tuned independently of other clan banners.
 *
 * Set to `null` to fall back to the normal per-tier offsets.
 */
export const SIN_CLAN_BANNER_OFFSET_X: number | null = -14;
export const SIN_CLAN_BANNER_OFFSET_Y: number | null = 21;

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

    /**
     * Crop: hide part of the asset visually WITHOUT changing its base size.
     * Positive values = px hidden from that edge.
     */
    SMALL_CARD_CROP_TOP: -8,
    SMALL_CARD_CROP_BOTTOM: 15,
    /**
     * Adjust total space the SMALL item occupies in the feed.
     * Negative = less space (pulls next card closer).
     * Positive = more space (pushes next card further).
     * Does NOT change the asset base size.
     */
    SMALL_FEED_SPACING_BOTTOM: 0,
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
    MEDIUM_CARD_ASSET_OFFSET_Y: 0,

    /**
     * Crop: hide part of the asset visually WITHOUT changing its base size.
     * Positive values = px hidden from that edge.
     */
    MEDIUM_CARD_CROP_TOP: 70,
    MEDIUM_CARD_CROP_BOTTOM: 140,

    /**
     * Adjust total space the MEDIUM item occupies in the feed.
     * Negative = less space (pulls next card closer).
     * Positive = more space (pushes next card further).
     * Does NOT change the asset base size.
     */
    MEDIUM_FEED_SPACING_BOTTOM: 0,
  },

  QUOTE: {
    QUOTE_CARD_ASSET_SCALE: 2.2,
    QUOTE_CARD_ASSET_WIDTH_ADJUST: 0,
    QUOTE_CARD_ASSET_HEIGHT_ADJUST: 0,
    QUOTE_CARD_ASSET_OFFSET_X: 26,
    QUOTE_CARD_ASSET_OFFSET_Y: 70,
    QUOTE_CARD_CROP_TOP: -5,
    QUOTE_CARD_CROP_BOTTOM: 60,
    QUOTE_FEED_SPACING_BOTTOM: 0,
  },
} as const;

