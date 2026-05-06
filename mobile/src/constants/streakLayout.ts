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
// Icon + text share one centered row; scale is capped by heroIconSlotSize().

/** Max visual scale of the fire SVG (actual scale = min(this, fit inside slot)). */
export const STREAK_FIRE_ICON_SCALE = 2.1;

/** @deprecated Layout is centered; kept at 0 for any legacy references. */
export const STREAK_FIRE_ICON_OFFSET_X = 0;
/** @deprecated */
export const STREAK_FIRE_ICON_OFFSET_Y = 0;

// ─── Streak summary text group (hero card) ───────────────────────────────────

/** @deprecated Centered with icon in one block. */
export const STREAK_SUMMARY_TEXT_GROUP_OFFSET_X = 0;
/** @deprecated */
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

// ─── Usage history calendar ───────────────────────────────────────────────────

/**
 * Scale multiplier for the usage history calendar.
 * Mirrors STREAK_CALENDAR_SCALE — increase to make cells larger.
 */
export const USES_CALENDAR_SCALE = 1.2;

/**
 * Horizontal nudge (px) of the usage calendar content block.
 * Positive = right, negative = left.
 */
export const USES_CALENDAR_OFFSET_X = 0;

/**
 * Vertical nudge (px) of the usage calendar content block.
 * Positive = down, negative = up.
 */
export const USES_CALENDAR_OFFSET_Y = 0;

// ─── Usage heart icon (hero card) ────────────────────────────────────────────

/** Max visual scale of the heart SVG inside the bounded icon slot. */
export const USAGE_HEART_ICON_SCALE = 2.0;

/** @deprecated */
export const USAGE_HEART_ICON_OFFSET_X = 0;
/** @deprecated */
export const USAGE_HEART_ICON_OFFSET_Y = 0;

// ─── Usage summary text group (hero card) ────────────────────────────────────

/** @deprecated */
export const USAGE_SUMMARY_TEXT_GROUP_OFFSET_X = 0;
/** @deprecated */
export const USAGE_SUMMARY_TEXT_GROUP_OFFSET_Y = 0;

// ─── Quotes pencil icon (PhrasesDomainsScreen hero card) ─────────────────────

/** Max visual scale of the pencil SVG inside the bounded icon slot. */
export const QUOTES_PENCIL_ICON_SCALE = 1.4;

/** @deprecated */
export const QUOTES_PENCIL_ICON_OFFSET_X = 0;
/** @deprecated */
export const QUOTES_PENCIL_ICON_OFFSET_Y = 0;
/** @deprecated */
export const QUOTES_SUMMARY_TEXT_GROUP_OFFSET_X = 0;
/** @deprecated */
export const QUOTES_SUMMARY_TEXT_GROUP_OFFSET_Y = 0;
