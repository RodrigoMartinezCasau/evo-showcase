export type CardSizeTier = 'small' | 'medium' | 'quote';

/**
 * TEMP: force reflection tiers by author username (lowercase, without @) for layout tuning.
 * Set to false to use automatic detection only.
 */
export const CARD_SIZE_TEST_OVERRIDES_ENABLED = false;

export const CARD_SIZE_TEST_USERNAME_TO_TIER: Record<string, CardSizeTier> = {
  hernanchacon: 'small',
  alejandroserrano: 'medium',
  diegolluberes: 'medium',
};

/**
 * Reflection card sizing thresholds.
 * A post becomes MEDIUM if it exceeds EITHER the word OR the character threshold.
 */
export const CARD_WORD_THRESHOLD_SMALL = 30;
export const CARD_CHAR_THRESHOLD_SMALL = 92;

/**
 * Body text line limits per tier.
 * SMALL: undefined = no truncation (short texts always fit).
 * MEDIUM: truncate with "..." after this many lines.
 */
export const CARD_MAX_LINES_SMALL: undefined = undefined;
export const CARD_MAX_LINES_MEDIUM = 8;
export const CARD_MAX_LINES_QUOTE = 4;
