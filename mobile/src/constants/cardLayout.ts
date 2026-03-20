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

  /** Solo el texto de username en el header color (no mueve clan label ni el resto) */
  USERNAME_OFFSET_X: number;
  USERNAME_OFFSET_Y: number;

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
  USERNAME_OFFSET_X: 0,
  USERNAME_OFFSET_Y: 0,

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
    USERNAME_OFFSET_X: 0,
    USERNAME_OFFSET_Y: -11,
  } satisfies CardTierLayout,

  MEDIUM: {
    ...tierDefaults,
    INNER_BOX_MIN_HEIGHT: 0,
    INNER_BLACK_EXPAND_Y: 220,
    OUTER_BOTTOM_FRAME: 0,
    OUTER_COLORED_COLLAPSED_HEIGHT: 255,
    INNER_BLACK_PADDING_VERTICAL: -40,
    USERNAME_OFFSET_X: 0,
    USERNAME_OFFSET_Y: -10,
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
