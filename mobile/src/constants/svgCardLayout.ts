import type { CardSizeTier } from './cardSizing';

/**
 * Layout constants for SVG-based community feed cards.
 *
 * Every clan SVG follows the same template (600×600 viewBox):
 *  - Colored rounded frame (size varies by tier)
 *  - Inner black rounded box (where the text content sits)
 *  - Banner pill at translate(408, 454) — bottom-right
 *
 * The constants below are derived directly from the SVG path geometry
 * and should NOT be edited unless the SVGs themselves change.
 */

const SVG_VIEWBOX_SIZE = 600;

type SvgGeometry = {
  /** Y of the colored frame top inside the 600×600 viewBox */
  frameTop: number;
  /** Y of the colored frame bottom inside the 600×600 viewBox */
  frameBottom: number;
  /** Y of the inner black box top inside the viewBox */
  blackTop: number;
  /** Y of the inner black box bottom inside the viewBox */
  blackBottom: number;
};

const SVG_GEOMETRY: Record<CardSizeTier, SvgGeometry> = {
  small:  { frameTop: 163.09, frameBottom: 436.91, blackTop: 206.51, blackBottom: 427.26 },
  medium: { frameTop:  88.36, frameBottom: 511.64, blackTop: 130.55, blackBottom: 501.79 },
  quote:  { frameTop: 195.71, frameBottom: 390.54, blackTop: 234.86, blackBottom: 380.38 },
};

/** Inner black box side margins (relative to the SVG's width). 11/600. */
const SVG_SIDE_MARGIN_RATIO = 11 / SVG_VIEWBOX_SIZE;

export type SvgCardLayout = {
  /** Final visible card height in px (depends on cardWidth + tier aspect). */
  cardHeight: number;
  /** SVG render size (square — viewBox is 1:1) in px. */
  svgRenderSize: number;
  /** Vertical offset to crop the top of the SVG (so colored frame starts at y=0). */
  svgCropTop: number;
  /** Top of the inner black box, in px from the top of the visible card. */
  blackTopPx: number;
  /** Bottom of the inner black box, in px from the top of the visible card. */
  blackBottomPx: number;
  /** Left offset of the inner black box, in px. */
  blackLeftPx: number;
  /** Right offset of the inner black box, in px. */
  blackRightPx: number;
};

/**
 * Compute the layout for a given tier at a specific card width.
 * The card height is derived so the colored frame fills the card with no distortion.
 */
export function computeSvgCardLayout(tier: CardSizeTier, cardWidth: number): SvgCardLayout {
  const g = SVG_GEOMETRY[tier] ?? SVG_GEOMETRY.medium;
  const frameHeight = g.frameBottom - g.frameTop;
  const cardHeight = (cardWidth / SVG_VIEWBOX_SIZE) * frameHeight;
  const svgRenderSize = cardWidth;
  const svgCropTop = (g.frameTop / SVG_VIEWBOX_SIZE) * svgRenderSize;
  const blackTopPx    = ((g.blackTop    - g.frameTop) / frameHeight) * cardHeight;
  const blackBottomPx = ((g.blackBottom - g.frameTop) / frameHeight) * cardHeight;
  const blackLeftPx  = SVG_SIDE_MARGIN_RATIO * cardWidth;
  const blackRightPx = SVG_SIDE_MARGIN_RATIO * cardWidth;
  return { cardHeight, svgRenderSize, svgCropTop, blackTopPx, blackBottomPx, blackLeftPx, blackRightPx };
}

/** Visual constants shared across all SVG cards. */
export const SVG_CARD_VISUAL = {
  CARD_BORDER_RADIUS: 16,
  CARD_HORIZONTAL_MARGIN: 12,
  CARD_VERTICAL_MARGIN: 8,

  TOP_STRIP_PADDING_X: 14,

  CONTENT_PADDING_X: 14,
  CONTENT_PADDING_TOP: 10,
  CONTENT_PADDING_BOTTOM: 10,

  /**
   * Banner (estandarte) — the PNG is a square image (800×800).
   * Render it at BANNER_SIZE × BANNER_SIZE with resizeMode="contain".
   * Increase BANNER_SIZE for crisper quality or more presence.
   */
  BANNER_SIZE: 160,
  BANNER_TOP: -55,
  BANNER_RIGHT: -10,

  /** Stats row (upvote/save) — horizontal, bottom-right of the colored frame. */
  STATS_GAP: 14,
  STATS_BOTTOM: 8,
  STATS_RIGHT: 25,
  STATS_ICON_SIZE: 22,

  /** Body text limits per tier. */
  BODY_MAX_LINES_SMALL: 3,
  BODY_MAX_LINES_MEDIUM: 6,
  BODY_MAX_LINES_QUOTE: 3,

  TITLE_MAX_LINES: 2,
} as const;

export function getBodyMaxLines(tier: CardSizeTier): number {
  if (tier === 'small') return SVG_CARD_VISUAL.BODY_MAX_LINES_SMALL;
  if (tier === 'quote') return SVG_CARD_VISUAL.BODY_MAX_LINES_QUOTE;
  return SVG_CARD_VISUAL.BODY_MAX_LINES_MEDIUM;
}
