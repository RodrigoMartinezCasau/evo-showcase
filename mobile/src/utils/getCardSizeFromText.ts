import {
  CARD_MAX_LINES_LARGE,
  CARD_MAX_LINES_MEDIUM,
  CARD_MAX_LINES_SMALL,
  CARD_SIZE_TEST_OVERRIDES_ENABLED,
  CARD_SIZE_TEST_USERNAME_TO_TIER,
  CARD_WORD_THRESHOLD_MEDIUM,
  CARD_WORD_THRESHOLD_SMALL,
  type CardSizeTier,
} from '@evoconn/constants/cardSizing';

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Picks a reflection card size tier based on word count.
 * - SMALL: below `CARD_WORD_THRESHOLD_SMALL`
 * - MEDIUM: below `CARD_WORD_THRESHOLD_MEDIUM`
 * - LARGE: otherwise
 */
export function getCardSizeFromText(text: string): CardSizeTier {
  const words = countWords(text);
  if (words < CARD_WORD_THRESHOLD_SMALL) return 'small';
  if (words < CARD_WORD_THRESHOLD_MEDIUM) return 'medium';
  return 'large';
}

export function getCardMaxLinesForTier(tier: CardSizeTier): number {
  switch (tier) {
    case 'small':
      return CARD_MAX_LINES_SMALL;
    case 'medium':
      return CARD_MAX_LINES_MEDIUM;
    case 'large':
      return CARD_MAX_LINES_LARGE;
    default:
      return CARD_MAX_LINES_LARGE;
  }
}

/**
 * Reflection tier: optional username test override, else word-count from title + body.
 */
export function getReflectionCardTier(username: string, title: string, body: string): CardSizeTier {
  if (CARD_SIZE_TEST_OVERRIDES_ENABLED) {
    const key = username.trim().toLowerCase();
    const forced = CARD_SIZE_TEST_USERNAME_TO_TIER[key];
    if (forced) return forced;
  }
  return getCardSizeFromText(`${title} ${body}`);
}

