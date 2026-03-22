import {
  CARD_CHAR_THRESHOLD_SMALL,
  CARD_MAX_LINES_MEDIUM,
  CARD_MAX_LINES_SMALL,
  CARD_SIZE_TEST_OVERRIDES_ENABLED,
  CARD_SIZE_TEST_USERNAME_TO_TIER,
  CARD_WORD_THRESHOLD_SMALL,
  type CardSizeTier,
} from '@evoconn/constants/cardSizing';

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Picks a reflection card size tier.
 * MEDIUM if text exceeds EITHER word count OR character count threshold.
 * SMALL only when BOTH are below their limits.
 */
export function getCardSizeFromText(text: string): CardSizeTier {
  const words = countWords(text);
  const chars = text.length;
  if (words >= CARD_WORD_THRESHOLD_SMALL || chars >= CARD_CHAR_THRESHOLD_SMALL) return 'medium';
  return 'small';
}

/**
 * Returns the numberOfLines limit for a tier.
 * SMALL → undefined (never truncate).
 * MEDIUM → CARD_MAX_LINES_MEDIUM (truncate with ...).
 * QUOTE → undefined (handled separately in the future).
 */
export function getCardMaxLinesForTier(tier: CardSizeTier): number | undefined {
  switch (tier) {
    case 'small':
      return CARD_MAX_LINES_SMALL;
    case 'medium':
      return CARD_MAX_LINES_MEDIUM;
    case 'quote':
      return undefined;
    default:
      return CARD_MAX_LINES_MEDIUM;
  }
}

/**
 * Reflection tier: optional username test override, else combined detection.
 * Character threshold applies to BODY ONLY (title is separate visually).
 * Word threshold applies to title + body combined.
 */
export function getReflectionCardTier(username: string, title: string, body: string): CardSizeTier {
  if (CARD_SIZE_TEST_OVERRIDES_ENABLED) {
    const key = username.trim().replace(/^@/, '').toLowerCase();
    const forced = CARD_SIZE_TEST_USERNAME_TO_TIER[key];
    if (forced) return forced;
  }
  const fullText = `${title} ${body}`;
  const words = countWords(fullText);
  const bodyChars = (body ?? '').length;
  if (words >= CARD_WORD_THRESHOLD_SMALL || bodyChars >= CARD_CHAR_THRESHOLD_SMALL) return 'medium';
  return 'small';
}
