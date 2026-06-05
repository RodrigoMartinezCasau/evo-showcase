import type { CardSizeTier } from './cardSizing';

/**
 * Layout constants for community feed cards.
 *
 * Card backgrounds were SVGs (600×600 viewBox) but are now native Views driven by
 * the geometry below. Every clan shared the same black-only template:
 *  - Outer frame (#0B0B0F)
 *  - Inner panel (#0d0d11)
 *  - Banner dock (3 rounded pieces, bottom-right)
 *
 * The constants below are derived directly from the original SVG path geometry
 * and should NOT be edited unless the visual template changes.
 */

const SVG_VIEWBOX_SIZE = 600;

/** Outer frame fill — matches every clan `*ClanBackgroundSvg` asset. */
export const CARD_FRAME_BACKGROUND = '#0B0B0F';
/** Inner content panel fill — matches the `#0d0d11` layer in those SVGs. */
export const CARD_INNER_BACKGROUND = '#0d0d11';

/** Inner panel corner radius in the 600×600 viewBox (rx ≈ 15.77). */
const INNER_PANEL_BORDER_RADIUS_VB = 15.77;

/** Banner-dock group origin + local pieces (viewBox coords, shared by all clans per tier). */
const BANNER_DOCK_BY_TIER: Record<
  CardSizeTier,
  { originX: number; originY: number; pieces: readonly { x: number; y: number; w: number; h: number; r: number }[] }
> = {
  small: {
    originX: 408,
    originY: 380,
    pieces: [
      { x: 0.367188, y: 0.445312, w: 185.125, h: 53.429688, r: 27.082031 },
      { x: 95.582031, y: 0.445312, w: 91.960938, h: 33.535156, r: 27.082031 },
      { x: 0.367188, y: 27.160156, w: 91.925781, h: 29.75, r: 27.082031 },
    ],
  },
  medium: {
    originX: 408,
    originY: 454,
    pieces: [
      { x: 0.367188, y: 0.445312, w: 185.125, h: 53.429688, r: 27.082031 },
      { x: 95.582031, y: 0.445312, w: 91.960938, h: 33.535156, r: 27.082031 },
      { x: 0.367188, y: 27.160156, w: 91.925781, h: 29.75, r: 27.082031 },
    ],
  },
  quote: {
    originX: 408,
    originY: 333,
    pieces: [
      { x: 0.367188, y: 0.445312, w: 185.125, h: 53.429688, r: 27.082031 },
      { x: 95.582031, y: 0.445312, w: 91.960938, h: 33.535156, r: 27.082031 },
      { x: 0.367188, y: 27.160156, w: 91.925781, h: 29.75, r: 27.082031 },
    ],
  },
};

export type NativeFeedCardBackgroundLayout = {
  cardWidth: number;
  cardHeight: number;
  blackTopPx: number;
  blackBottomPx: number;
  blackLeftPx: number;
  blackRightPx: number;
  innerPanelBorderRadius: number;
  bannerPieces: { top: number; left: number; width: number; height: number; borderRadius: number }[];
};

export function computeInnerPanelBorderRadius(cardWidth: number): number {
  return Math.max(8, Math.round((INNER_PANEL_BORDER_RADIUS_VB / SVG_VIEWBOX_SIZE) * cardWidth));
}

/** Maps SVG viewBox geometry to px in the cropped visible card (frameTop → y=0). */
export function computeNativeFeedCardBackgroundLayout(
  tier: CardSizeTier,
  cardWidth: number,
  cardLayout: SvgCardLayout,
): NativeFeedCardBackgroundLayout {
  const g = SVG_GEOMETRY[tier] ?? SVG_GEOMETRY.medium;
  const frameHeight = g.frameBottom - g.frameTop;
  const scale = cardWidth / SVG_VIEWBOX_SIZE;
  const dock = BANNER_DOCK_BY_TIER[tier] ?? BANNER_DOCK_BY_TIER.medium;
  const dockTop =
    ((dock.originY - g.frameTop) / frameHeight) * cardLayout.cardHeight;
  const dockLeft = dock.originX * scale;

  return {
    cardWidth,
    cardHeight: cardLayout.cardHeight,
    blackTopPx: cardLayout.blackTopPx,
    blackBottomPx: cardLayout.blackBottomPx,
    blackLeftPx: cardLayout.blackLeftPx,
    blackRightPx: cardLayout.blackRightPx,
    innerPanelBorderRadius: computeInnerPanelBorderRadius(cardWidth),
    bannerPieces: dock.pieces.map((p) => ({
      top: dockTop + p.y * scale,
      left: dockLeft + p.x * scale,
      width: p.w * scale,
      height: p.h * scale,
      borderRadius: p.r * scale,
    })),
  };
}

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
/**
 * Ancho máximo de tarjeta (px) para que `computeSvgCardLayout(tier, w).cardHeight` no supere `maxInnerHeight`.
 * Usado en el feed para que el display quepa en el hueco sobre la barra flotante (teléfono / tablet).
 */
export function maxCardWidthForInnerCardHeightPx(tier: CardSizeTier, maxInnerHeight: number): number {
  if (!(maxInnerHeight > 0)) return SVG_VIEWBOX_SIZE;
  const g = SVG_GEOMETRY[tier] ?? SVG_GEOMETRY.medium;
  const frameHeight = g.frameBottom - g.frameTop;
  const heightPerWidth = frameHeight / SVG_VIEWBOX_SIZE;
  if (heightPerWidth <= 0) return SVG_VIEWBOX_SIZE;
  return maxInnerHeight / heightPerWidth;
}

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
  /**
   * Space kept between the last line of body text and the top of the stats chip (px).
   * The chip sits in clan color over the corner; text must stop above it (quotes + reflections).
   */
  STATS_TEXT_CLEARANCE_ABOVE_CHIP: 8,
  /** Horizontal gap between body text and the left edge of the stats chip (px). */
  STATS_TEXT_HORIZONTAL_GAP: 6,

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

/**
 * Bottom Y (from top of card) for the text block so it never enters the stats / clan-color chip.
 * Capped by the inner black box minus `paddingBottom`.
 */
export function computeFeedCardTextContentBottomY(args: {
  cardHeight: number;
  blackBottomPx: number;
  paddingBottom: number;
  statsBottom: number;
  statsRowHeight: number;
  clearanceAboveStats: number;
  /** Minimum Y for the top of the title/body stack; floors the text block bottom calculation. */
  feedStackMinTopPx: number;
}): number {
  const innerBottom = args.blackBottomPx - args.paddingBottom;
  const statsTopY =
    args.cardHeight - args.statsBottom - args.statsRowHeight - args.clearanceAboveStats;
  const y = Math.min(innerBottom, statsTopY);
  const minY = args.feedStackMinTopPx + 1;
  return Math.max(y, minY);
}

/**
 * Reference inner card width (px) after horizontal margins — ~iPhone 14 class.
 * Used to scale feed typography and insets so text clears frame, estandarte, and header controls.
 */
export const COMMUNITY_FEED_CARD_REF_WIDTH = 366;

/**
 * Ancho máximo del marco coloreado en Siguiendo / Para ti.
 * En tablet el ancho útil supera este valor: sin tope la tarjeta escala a pantalla completa,
 * crece en altura y se recortan bordes / márgenes respecto a la barra inferior.
 */
export const COMMUNITY_FEED_CARD_MAX_INNER_WIDTH = 420;

/**
 * Approximate visual width of the clan-color stats chip (up + save), tuned so reflection
 * body text can use the gray area up to that column without overlapping.
 * Slightly conservative for long counts; raise the clamp if numbers clip the chip.
 */
export function estimateFeedStatsBlockWidth(textScale: number): number {
  const base = 72;
  return Math.max(66, Math.min(124, Math.round(base * textScale)));
}

export type CommunityFeedCardContentLayout = {
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  topStripPaddingX: number;
  bannerSize: number;
  bannerTop: number;
  bannerRight: number;
  titleFontSize: number;
  titleMarginBottom: number;
  bodyFontSize: number;
  bodyLineHeight: number;
  phraseAuthorFontSize: number;
  usernameFontSize: number;
  statsCountFontSize: number;
  textScale: number;
};

/**
 * Responsive padding + type scale for `CommunityPostCard` (Siguiendo / Para ti list).
 * - **Quote** cards: reserve space for estandarte (top-right) and stats chip.
 * - **Reflection** (small/medium): use full gray width until the stats column only (no wide banner gutter on every line).
 */
export function computeCommunityFeedCardContentLayout(
  cardWidth: number,
  tier: CardSizeTier,
): CommunityFeedCardContentLayout {
  const ref = COMMUNITY_FEED_CARD_REF_WIDTH;
  const widthRatio = Math.max(0.78, Math.min(1.15, cardWidth / ref));
  const textScale = Math.max(0.85, Math.min(1.02, cardWidth / ref));
  const V = SVG_CARD_VISUAL;
  const blackRightPx = SVG_SIDE_MARGIN_RATIO * cardWidth;

  const padX = Math.max(10, Math.round(V.CONTENT_PADDING_X * widthRatio));
  const padTop = Math.max(8, Math.round(V.CONTENT_PADDING_TOP * widthRatio));
  const padBottom = Math.max(8, Math.round(V.CONTENT_PADDING_BOTTOM * widthRatio));
  const topStripPadX = Math.max(10, Math.round(V.TOP_STRIP_PADDING_X * widthRatio));

  const bannerSize = Math.min(
    V.BANNER_SIZE,
    Math.max(98, Math.round(cardWidth * 0.37)),
  );
  const bannerScale = bannerSize / V.BANNER_SIZE;
  const bannerTop = Math.round(V.BANNER_TOP * bannerScale);
  const bannerRight = Math.round(V.BANNER_RIGHT * bannerScale);

  const bannerCorridor = Math.min(
    Math.round(bannerSize * 0.52 + 10),
    Math.round(cardWidth * 0.3),
  );

  const statsBlockW = estimateFeedStatsBlockWidth(textScale);
  const statsMinPaddingRight = Math.ceil(
    Math.max(0, V.STATS_RIGHT + statsBlockW + V.STATS_TEXT_HORIZONTAL_GAP - blackRightPx),
  );

  const paddingLeft = padX;
  const paddingRight =
    tier === 'quote'
      ? Math.max(padX + bannerCorridor, statsMinPaddingRight, padX)
      : Math.max(padX, statsMinPaddingRight);

  return {
    paddingLeft,
    paddingRight,
    paddingTop: padTop,
    paddingBottom: padBottom,
    topStripPaddingX: topStripPadX,
    bannerSize,
    bannerTop,
    bannerRight,
    titleFontSize: Math.round(18 * textScale),
    titleMarginBottom: Math.max(4, Math.round(6 * widthRatio)),
    bodyFontSize: Math.round(14 * textScale),
    bodyLineHeight: Math.round(20 * textScale),
    phraseAuthorFontSize: Math.round(13 * textScale),
    usernameFontSize: Math.round(14 * textScale),
    statsCountFontSize: Math.max(10, Math.round(12 * textScale)),
    textScale,
  };
}
