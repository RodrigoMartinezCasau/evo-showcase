import type { CardSizeTier } from './cardSizing';

/**
 * Valores realmente compartidos (marco exterior / radios globales).
 * El posicionamiento de la inner card negra va solo en SMALL | MEDIUM | LARGE.
 */
export const CARD_LAYOUT_SHARED = {
  CARD_BORDER_RADIUS: 18,
  INNER_BLACK_BOX_RADIUS: 14,
  COLOR_FRAME_THICKNESS: 3,
  CARD_REFLECTION_TITLE_MAX_LINES: 2,
  /** Solo header sobre el color del clan (no es la inner negra) */
  HEADER_PADDING_HORIZONTAL: 10,
} as const;

/**
 * Layout por tamaño. Cada tier edita su propia inner negra de forma independiente.
 */
export type CardTierLayout = {
  OUTER_PADDING_HORIZONTAL: number;
  OUTER_PADDING_VERTICAL: number;
  HEADER_HEIGHT: number;
  /** Global offset for the full SMALL visual group (background + overlays) */
  CARD_GROUP_OFFSET_X: number;
  CARD_GROUP_OFFSET_Y: number;

  /** Solo el texto de username en el header color (no mueve clan label ni el resto) */
  USERNAME_OFFSET_X: number;
  USERNAME_OFFSET_Y: number;
  /** Solo el título de la reflexión (no mueve clan label ni votos) */
  TITLE_OFFSET_X: number;
  TITLE_OFFSET_Y: number;
  /** Solo el body de la reflexión (no mueve clan label ni votos) */
  BODY_OFFSET_X: number;
  BODY_OFFSET_Y: number;
  /** Solo el bloque de stats/votos/saves */
  STATS_OFFSET_X: number;
  STATS_OFFSET_Y: number;
  /** Anchor stats to bottom-right of container (absolute positioning). -1 = use flex flow instead. */
  STATS_ABSOLUTE_BOTTOM: number;
  STATS_ABSOLUTE_RIGHT: number;
  /** Solo el estandarte PNG del clan en SMALL */
  BANNER_OFFSET_X: number;
  BANNER_OFFSET_Y: number;
  BANNER_WIDTH: number;
  BANNER_HEIGHT: number;
  BANNER_SCALE: number;
  STATS_ROW_OFFSET_X: number;
  STATS_ROW_OFFSET_Y: number;
  STATS_GAP: number;
  UPVOTE_OFFSET_X: number;
  UPVOTE_OFFSET_Y: number;
  UPVOTE_ICON_WIDTH: number;
  UPVOTE_ICON_HEIGHT: number;
  UPVOTE_COUNT_OFFSET_X: number;
  UPVOTE_COUNT_OFFSET_Y: number;
  SAVE_OFFSET_X: number;
  SAVE_OFFSET_Y: number;
  SAVE_ICON_WIDTH: number;
  SAVE_ICON_HEIGHT: number;
  SAVE_COUNT_OFFSET_X: number;
  SAVE_COUNT_OFFSET_Y: number;

  // ----- Inner black layer (ImageBackground absoluta dentro de cardBody) -----
  /** Inset del rect negro respecto a `cardBody` (top/bottom/left/right) */
  INNER_BLACK_INSET_TOP: number;
  INNER_BLACK_INSET_BOTTOM: number;
  INNER_BLACK_INSET_LEFT: number;
  INNER_BLACK_INSET_RIGHT: number;
  /** Expande el rect: se resta la mitad a cada lado (antes INNER_BOX_*_ADJUST) */
  INNER_BLACK_EXPAND_X: number;
  INNER_BLACK_EXPAND_Y: number;
  /** Ajuste fino en px (translate) sin tocar insets */
  INNER_BLACK_NUDGE_X: number;
  INNER_BLACK_NUDGE_Y: number;
  /** Fallback altura contenido antes de `onLayout` */
  INNER_BOX_MIN_HEIGHT: number;

  // ----- Bloque de texto/título/votos dentro de la inner negra -----
  INNER_BLACK_CONTENT_MARGIN_TOP: number;
  INNER_BLACK_CONTENT_MARGIN_BOTTOM: number;
  INNER_BLACK_CONTENT_MARGIN_LEFT: number;
  INNER_BLACK_CONTENT_MARGIN_RIGHT: number;
  INNER_BLACK_PADDING_HORIZONTAL: number;
  INNER_BLACK_PADDING_VERTICAL: number;

  // ----- Marco color clan (outer) -----
  OUTER_TOP_EXTRA_SPACE: number;
  OUTER_BOTTOM_FRAME: number;
  OUTER_CARD_BOTTOM_EXTRA_SPACE: number;
  OUTER_CARD_EXTRA_HEIGHT: number;
  OUTER_CARD_VERTICAL_GROWTH_FACTOR: number;
  OUTER_CARD_BOTTOM_TRIM: number;
  OUTER_CARD_MIN_HEIGHT: number;
  OUTER_COLORED_COLLAPSED_HEIGHT: number;
};

const tierDefaults: CardTierLayout = {
  OUTER_PADDING_HORIZONTAL: 4,
  OUTER_PADDING_VERTICAL: 4,
  HEADER_HEIGHT: 40,
  CARD_GROUP_OFFSET_X: 0,
  CARD_GROUP_OFFSET_Y: 0,
  USERNAME_OFFSET_X: 0,
  USERNAME_OFFSET_Y: 0,
  TITLE_OFFSET_X: 0,
  TITLE_OFFSET_Y: 0,
  BODY_OFFSET_X: 0,
  BODY_OFFSET_Y: 0,
  STATS_OFFSET_X: 0,
  STATS_OFFSET_Y: 0,
  STATS_ABSOLUTE_BOTTOM: -1,
  STATS_ABSOLUTE_RIGHT: -1,
  BANNER_OFFSET_X: 0,
  BANNER_OFFSET_Y: 0,
  BANNER_WIDTH: 120,
  BANNER_HEIGHT: 42,
  BANNER_SCALE: 1,
  STATS_ROW_OFFSET_X: 0,
  STATS_ROW_OFFSET_Y: 0,
  STATS_GAP: 14,
  UPVOTE_OFFSET_X: 0,
  UPVOTE_OFFSET_Y: 0,
  UPVOTE_ICON_WIDTH: 18,
  UPVOTE_ICON_HEIGHT: 18,
  UPVOTE_COUNT_OFFSET_X: 0,
  UPVOTE_COUNT_OFFSET_Y: 0,
  SAVE_OFFSET_X: 0,
  SAVE_OFFSET_Y: 0,
  SAVE_ICON_WIDTH: 18,
  SAVE_ICON_HEIGHT: 18,
  SAVE_COUNT_OFFSET_X: 0,
  SAVE_COUNT_OFFSET_Y: 0,

  INNER_BLACK_INSET_TOP: 0,
  INNER_BLACK_INSET_BOTTOM: 0,
  INNER_BLACK_INSET_LEFT: -13,
  INNER_BLACK_INSET_RIGHT: -13,
  INNER_BLACK_EXPAND_X: 0,
  INNER_BLACK_EXPAND_Y: 230,
  INNER_BLACK_NUDGE_X: 0,
  INNER_BLACK_NUDGE_Y: 0,
  INNER_BOX_MIN_HEIGHT: 250,

  INNER_BLACK_CONTENT_MARGIN_TOP: 10,
  INNER_BLACK_CONTENT_MARGIN_BOTTOM: 10,
  INNER_BLACK_CONTENT_MARGIN_LEFT: 10,
  INNER_BLACK_CONTENT_MARGIN_RIGHT: 10,
  INNER_BLACK_PADDING_HORIZONTAL: 10,
  INNER_BLACK_PADDING_VERTICAL: 50,

  OUTER_TOP_EXTRA_SPACE: 0,
  OUTER_BOTTOM_FRAME: 14,
  OUTER_CARD_BOTTOM_EXTRA_SPACE: 0,
  OUTER_CARD_EXTRA_HEIGHT: 0,
  OUTER_CARD_VERTICAL_GROWTH_FACTOR: 0,
  OUTER_CARD_BOTTOM_TRIM: 0,
  OUTER_CARD_MIN_HEIGHT: 0,
  OUTER_COLORED_COLLAPSED_HEIGHT: 0,
};

export const CARD_LAYOUT = {
  SHARED: CARD_LAYOUT_SHARED,

  SMALL: {
    ...tierDefaults,
    INNER_BOX_MIN_HEIGHT: 180,
    INNER_BLACK_EXPAND_Y: 140,
    OUTER_BOTTOM_FRAME: 0,
    OUTER_COLORED_COLLAPSED_HEIGHT: 150,
    INNER_BLACK_CONTENT_MARGIN_TOP: 8,
    INNER_BLACK_CONTENT_MARGIN_BOTTOM: -57,
    INNER_BLACK_PADDING_VERTICAL: 0,
    USERNAME_OFFSET_X: 3,
    USERNAME_OFFSET_Y: 14,
    CARD_GROUP_OFFSET_X: 0,
    CARD_GROUP_OFFSET_Y: -26,
    TITLE_OFFSET_X: -6,
    TITLE_OFFSET_Y: 0,
    BODY_OFFSET_X: -3,
    BODY_OFFSET_Y: -6,
    STATS_OFFSET_X: -9,
    STATS_OFFSET_Y: -0,
    STATS_ABSOLUTE_BOTTOM: 8,
    STATS_ABSOLUTE_RIGHT: 10,
    BANNER_OFFSET_X: -14,
    BANNER_OFFSET_Y: 15,
    BANNER_WIDTH: 120,
    BANNER_HEIGHT: 42,
    BANNER_SCALE: 4,
    STATS_ROW_OFFSET_X: 0,
    STATS_ROW_OFFSET_Y: 0,
    STATS_GAP: 14,
    UPVOTE_OFFSET_X: 0,
    UPVOTE_OFFSET_Y: 0,
    UPVOTE_ICON_WIDTH: 18,
    UPVOTE_ICON_HEIGHT: 18,
    UPVOTE_COUNT_OFFSET_X: 0,
    UPVOTE_COUNT_OFFSET_Y: 0,
    SAVE_OFFSET_X: 0,
    SAVE_OFFSET_Y: 0,
    SAVE_ICON_WIDTH: 18,
    SAVE_ICON_HEIGHT: 18,
    SAVE_COUNT_OFFSET_X: 0,
    SAVE_COUNT_OFFSET_Y: 0,
  } satisfies CardTierLayout,

  MEDIUM: {
    ...tierDefaults,
    INNER_BOX_MIN_HEIGHT: 0,
    INNER_BLACK_EXPAND_Y: 220,
    OUTER_BOTTOM_FRAME: 0,
    /** Fixed height for MEDIUM cards. Edit to adjust the card's visible height. */
    OUTER_COLORED_COLLAPSED_HEIGHT: 350,
    INNER_BLACK_PADDING_VERTICAL: 0,
    INNER_BLACK_CONTENT_MARGIN_TOP: 12,
    INNER_BLACK_CONTENT_MARGIN_BOTTOM: 12,

    CARD_GROUP_OFFSET_X: 0,
    CARD_GROUP_OFFSET_Y: 0,

    USERNAME_OFFSET_X: 0,
    USERNAME_OFFSET_Y: 0,

    TITLE_OFFSET_X: 0,
    TITLE_OFFSET_Y: 0,

    BODY_OFFSET_X: 0,
    BODY_OFFSET_Y: 0,

    BANNER_OFFSET_X: 0,
    BANNER_OFFSET_Y: 0,
    BANNER_WIDTH: 120,
    BANNER_HEIGHT: 42,
    BANNER_SCALE: 3,

    STATS_OFFSET_X: 0,
    STATS_OFFSET_Y: 0,
    STATS_ROW_OFFSET_X: 0,
    STATS_ROW_OFFSET_Y: 0,
    STATS_GAP: 14,

    UPVOTE_OFFSET_X: 0,
    UPVOTE_OFFSET_Y: 0,
    UPVOTE_ICON_WIDTH: 18,
    UPVOTE_ICON_HEIGHT: 18,
    UPVOTE_COUNT_OFFSET_X: 0,
    UPVOTE_COUNT_OFFSET_Y: 0,

    SAVE_OFFSET_X: 0,
    SAVE_OFFSET_Y: 0,
    SAVE_ICON_WIDTH: 18,
    SAVE_ICON_HEIGHT: 18,
    SAVE_COUNT_OFFSET_X: 0,
    SAVE_COUNT_OFFSET_Y: 0,
  } satisfies CardTierLayout,

  LARGE: {
    ...tierDefaults,
    INNER_BOX_MIN_HEIGHT: 260,
    INNER_BLACK_EXPAND_Y: 335,
    OUTER_BOTTOM_FRAME: 0,
    OUTER_COLORED_COLLAPSED_HEIGHT: 380,
    INNER_BLACK_PADDING_VERTICAL: 80,
    USERNAME_OFFSET_X: 0,
    USERNAME_OFFSET_Y: -10,
    CARD_GROUP_OFFSET_X: 0,
    CARD_GROUP_OFFSET_Y: 0,
    TITLE_OFFSET_X: 0,
    TITLE_OFFSET_Y: 0,
    BODY_OFFSET_X: 0,
    BODY_OFFSET_Y: 0,
    STATS_OFFSET_X: 0,
    STATS_OFFSET_Y: 0,
    BANNER_OFFSET_X: 0,
    BANNER_OFFSET_Y: 0,
    BANNER_WIDTH: 120,
    BANNER_HEIGHT: 42,
    BANNER_SCALE: 1,
  } satisfies CardTierLayout,
} as const;

export type CardLayoutRoot = typeof CARD_LAYOUT;

export function cardLayoutBlockForTier(tier: CardSizeTier): CardTierLayout {
  switch (tier) {
    case 'small':
      return CARD_LAYOUT.SMALL;
    case 'medium':
      return CARD_LAYOUT.MEDIUM;
    case 'large':
      return CARD_LAYOUT.LARGE;
    default:
      return CARD_LAYOUT.MEDIUM;
  }
}
