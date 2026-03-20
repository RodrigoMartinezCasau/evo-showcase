export type CardSizeTier = 'small' | 'medium' | 'large';

/**
 * TEMP: force reflection tiers by author username (lowercase) for layout tuning in simulator.
 * Set to false to use word-count detection only.
 */
export const CARD_SIZE_TEST_OVERRIDES_ENABLED = true;

export const CARD_SIZE_TEST_USERNAME_TO_TIER: Record<string, CardSizeTier> = {
  hernanchacon: 'small',
  alejandroserrano: 'medium',
  diegolluberes: 'large',
};

/**
 * Reflection card sizing thresholds (word-count based).
 * Edit these to control which posts fall into each tier.
 */
export const CARD_WORD_THRESHOLD_SMALL = 30;
export const CARD_WORD_THRESHOLD_MEDIUM = 70;

/**
 * Collapsed (non-expanded) reflection body text limits per tier.
 * When expanded, we show the full reflection (numberOfLines = undefined).
 */
export const CARD_MAX_LINES_SMALL = 3;
export const CARD_MAX_LINES_MEDIUM = 5;
export const CARD_MAX_LINES_LARGE = 7;

