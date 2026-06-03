/**
 * Thickness (in SVG units, viewBox 0–600) of the black outline around the + icon.
 * Increase to make the border thicker. 6 ≈ 1px at typical render sizes.
 */
export const FOLLOW_OUTLINE_PX = 10;

/** Layout editors for the follow button — independent per screen context. */

export const COMMUNITY_FOLLOW_BUTTON_LAYOUT = {
  offsetX: 3,
  offsetY: -0.5,
  scale: 0.25,
} as const;

export const DETAIL_FOLLOW_BUTTON_LAYOUT = {
  offsetX: 6,
  offsetY: 0,
  scale: 0.45,
} as const;

export const FORYOU_FOLLOW_BUTTON_LAYOUT = {
  offsetX: 6,
  offsetY: 0,
  scale: 0.65,
} as const;

/** Centrado bajo el avatar de la columna de acciones (Para ti / vista ampliada). */
export const AVATAR_OVERLAY_FOLLOW_BUTTON_LAYOUT = {
  offsetX: 0,
  offsetY: 0,
  scale: 0.42,
} as const;
