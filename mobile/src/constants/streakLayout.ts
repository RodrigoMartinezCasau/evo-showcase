/**
 * Layout editors for StreakScreen and DailyUsesScreen.
 */

// ─── Shared ───────────────────────────────────────────────────────────────────

/** Horizontal padding inside each section card. */
export const STREAK_CARD_PADDING_H = 16;

/** Vertical padding inside each section card. */
export const STREAK_CARD_PADDING_V = 14;

/** Vertical gap between section cards. */
export const STREAK_SECTION_GAP = 12;

/** Border radius of section cards. */
export const STREAK_CARD_RADIUS = 14;

/** Background color of all section cards in the streak and usage displays. */
export const STREAK_CARD_BACKGROUND = '#0b0b0f';

// ─── Header ───────────────────────────────────────────────────────────────────

/** Font size of the large streak number. */
export const STREAK_COUNT_FONT_SIZE = 52;

/** Font size of the section title labels. */
export const STREAK_LABEL_FONT_SIZE = 11;

// ─── Calendar grid ────────────────────────────────────────────────────────────

/** Scale multiplier for the entire calendar grid (1 = default). */
export const STREAK_CALENDAR_SCALE = 1.2;

/** Size (px) of each day cell in the calendar grid. */
export const STREAK_DAY_CELL_SIZE = 32;

/** Gap between day cells. */
export const STREAK_DAY_CELL_GAP = 4;

/**
 * Fine-tune horizontal offset (px) applied AFTER auto-centering.
 * 0 = perfectly centered. Positive = nudge right, negative = nudge left.
 * Calendars are always centered automatically; use this only for minor adjustments.
 */
export const STREAK_CALENDAR_OFFSET_X = 0;

/**
 * Fine-tune vertical offset (px) applied to the calendar content block.
 * Positive = shift down, negative = shift up.
 */
export const STREAK_CALENDAR_OFFSET_Y = 0;

// ─── Streak fire icon (hero card) ────────────────────────────────────────────

/**
 * Scale of the clan-based fire SVG shown in the top summary card.
 * 1 = default size. Increasing makes the icon larger; does not affect card or text.
 */
export const STREAK_FIRE_ICON_SCALE = 2.5;

/**
 * Horizontal offset (px) of the fire icon inside the hero card.
 * Positive = right, negative = left. Does not reflow surrounding text.
 */
export const STREAK_FIRE_ICON_OFFSET_X = 70;

/**
 * Vertical offset (px) of the fire icon inside the hero card.
 * Positive = down, negative = up. Does not reflow surrounding text.
 */
export const STREAK_FIRE_ICON_OFFSET_Y = 0;

// ─── Streak summary text group (hero card) ───────────────────────────────────

/**
 * Horizontal offset (px) of the full text group (number + labels) to the right
 * of the fire icon inside the top summary card.
 * Positive = right, negative = left. Moves ALL texts together; fire icon unchanged.
 */
export const STREAK_SUMMARY_TEXT_GROUP_OFFSET_X = 80;

/**
 * Vertical offset (px) of the full text group (number + labels) to the right
 * of the fire icon inside the top summary card.
 * Positive = down, negative = up. Moves ALL texts together; fire icon unchanged.
 */
export const STREAK_SUMMARY_TEXT_GROUP_OFFSET_Y = 0;

// ─── Stats block ─────────────────────────────────────────────────────────────

/** Font size of the stats numbers. */
export const STREAK_STATS_NUMBER_FONT_SIZE = 28;

/** Font size of the stats unit label (e.g. "por semana"). */
export const STREAK_STATS_UNIT_FONT_SIZE = 12;

// ─── Uses display ────────────────────────────────────────────────────────────

/** Height of the uses progress bar. */
export const USES_BAR_HEIGHT = 10;

/** Border radius of the uses progress bar. */
export const USES_BAR_RADIUS = 5;

/** Size of each heatmap day cell. */
export const USES_HEATMAP_CELL_SIZE = 30;

/** Gap between heatmap cells. */
export const USES_HEATMAP_CELL_GAP = 4;

/** Scale multiplier for the heatmap. */
export const USES_HEATMAP_SCALE = 1.0;

// ─── Usage heart icon (hero card) ────────────────────────────────────────────

/**
 * Scale of the clan-based heart SVG shown in the top usage summary card.
 * 1 = default size. Increasing makes the icon larger; does not affect card or text.
 */
export const USAGE_HEART_ICON_SCALE = 2.3;

/**
 * Horizontal offset (px) of the heart icon inside the usage hero card.
 * Positive = right, negative = left. Does not reflow the text group.
 */
export const USAGE_HEART_ICON_OFFSET_X = 90;

/**
 * Vertical offset (px) of the heart icon inside the usage hero card.
 * Positive = down, negative = up. Does not reflow the text group.
 */
export const USAGE_HEART_ICON_OFFSET_Y = -10;

// ─── Usage summary text group (hero card) ────────────────────────────────────

/**
 * Horizontal offset (px) of the full text group (number + labels) to the right
 * of the heart icon inside the top usage summary card.
 * Positive = right, negative = left. Moves ALL texts together; heart icon unchanged.
 */
export const USAGE_SUMMARY_TEXT_GROUP_OFFSET_X = 110;

/**
 * Vertical offset (px) of the full text group (number + labels) to the right
 * of the heart icon inside the top usage summary card.
 * Positive = down, negative = up. Moves ALL texts together; heart icon unchanged.
 */
export const USAGE_SUMMARY_TEXT_GROUP_OFFSET_Y = 0;
