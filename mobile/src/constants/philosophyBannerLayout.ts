/**
 * Layout editors for the clan-banner SVGs that replace text labels
 * in philosophy percentage rows.
 *
 * Two independent sets:
 *  - "profile"   → PersonalPhilosophyPanel + PhilosophyPercentagesPanel
 *  - "expanded"  → ClanPercentagesTable (detailed philosophy screen)
 */

// ─── Profile panels (Personal + OtherUser) ───────────────────────────────────

/** Uniform scale applied to every banner icon in profile percentage panels. */
export const PHILOSOPHY_BANNER_SCALE = 3.8;

/** Horizontal nudge (px) applied to every banner icon in profile panels. */
export const PHILOSOPHY_BANNER_OFFSET_X = 0;

/** Vertical nudge (px) applied to every banner icon in profile panels. */
export const PHILOSOPHY_BANNER_OFFSET_Y = 25;

// ─── Expanded detail screen ───────────────────────────────────────────────────

/** Uniform scale applied to every banner icon in the expanded philosophy table. */
export const EXPANDED_PHILOSOPHY_BANNER_SCALE = 3.8;

/** Horizontal nudge (px) for banners in the expanded philosophy table. */
export const EXPANDED_PHILOSOPHY_BANNER_OFFSET_X = 0;

/** Vertical nudge (px) for banners in the expanded philosophy table. */
export const EXPANDED_PHILOSOPHY_BANNER_OFFSET_Y = 25;

// ─── Container padding ────────────────────────────────────────────────────────

/**
 * Vertical padding (top + bottom) of the black container in profile panels
 * (PersonalPhilosophyPanel + PhilosophyPercentagesPanel).
 */
export const PHILOSOPHY_CONTAINER_PADDING_VERTICAL = 10;

/**
 * Horizontal padding (left + right) of the black container in profile panels.
 */
export const PHILOSOPHY_CONTAINER_PADDING_HORIZONTAL = 16;

/**
 * Vertical padding of the black container in the expanded philosophy table.
 */
export const EXPANDED_PHILOSOPHY_CONTAINER_PADDING_VERTICAL = 10;

/**
 * Horizontal padding of the black container in the expanded philosophy table.
 */
export const EXPANDED_PHILOSOPHY_CONTAINER_PADDING_HORIZONTAL = 16;

// ─── Row spacing ─────────────────────────────────────────────────────────────

/**
 * Vertical gap (px) between each percentage row in profile panels
 * (PersonalPhilosophyPanel + PhilosophyPercentagesPanel).
 * Reduce to tighten rows; increase to loosen them.
 */
export const PHILOSOPHY_ROW_GAP = 4;

/**
 * Vertical gap (px) between each percentage row in the expanded
 * philosophy detail table (ClanPercentagesTable).
 */
export const EXPANDED_PHILOSOPHY_ROW_GAP = 4;

// ─── Row height clamp ─────────────────────────────────────────────────────────

/**
 * Visible height (px) of each percentage row in profile panels.
 * The banner SVG renders at full scale but the row clips to this height,
 * keeping the label centered. Shrink this to reduce the black container
 * without changing banner scale, bar, or percentage text.
 * Set to `undefined` to let the row size itself naturally.
 */
export const PHILOSOPHY_ROW_HEIGHT: number | undefined = 46;

/**
 * Visible height (px) of each row in the expanded philosophy table.
 */
export const EXPANDED_PHILOSOPHY_ROW_HEIGHT: number | undefined = 46;

// ─── Bar gradient clan colors ─────────────────────────────────────────────────

/**
 * Right-end color for each clan's progress bar gradient (left = white).
 * Matches the clan's primary identity color.
 */
export const PHILOSOPHY_BAR_CLAN_COLORS: Record<string, string> = {
  nihilista:        '#bdb29c',
  cientista:        '#54d5cf',
  estoico:          '#818a41',
  existencialista:  '#c93a39',
  racionalista:     '#395df2',
  humanista:        '#efb318',
  realista:         '#a2a3a8',
  trascendentalista:'#cb6ce6',
};

/** Fallback gradient end color when clanId is unknown. */
export const PHILOSOPHY_BAR_DEFAULT_COLOR = '#FFFFFF';

// ─── Base size (shared) ───────────────────────────────────────────────────────

/**
 * Base pixel side-length of the square banner icon before any scale is applied.
 * The viewBox of all banner SVGs is 600×600 (square).
 */
export const PHILOSOPHY_BANNER_BASE_SIZE = 30;
