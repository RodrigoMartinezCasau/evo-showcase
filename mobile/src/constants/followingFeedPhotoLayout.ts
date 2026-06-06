/**
 * Layout de la foto en tarjetas de Siguiendo (`CommunityPostCard`).
 * El texto manda (zona fija por tier); la foto va debajo y su recuadro es lo que cede espacio.
 */

import {
  COMMUNITY_FEED_CARD_MAX_INNER_WIDTH,
  SVG_SIDE_MARGIN_RATIO,
} from '@evoconn/constants/svgCardLayout';

/** Espacio entre el final del texto y el borde superior de la foto (px). */
export const FOLLOWING_FEED_PHOTO_GAP_BELOW_TEXT = 10;

/** Espacio entre el borde inferior de la foto y los botones up/save (px). */
export const FOLLOWING_FEED_PHOTO_CLEARANCE_ABOVE_STATS = 14;

/**
 * Altura preferida del recuadro = fracción del ancho interior (alto/ancho).
 * Independiente del aspect ratio de la imagen fuente.
 */
export const FOLLOWING_FEED_PHOTO_FIXED_HEIGHT_RATIO = 0.72;

/** Piso del recuadro cuando la tarjeta llega al tope (px lógicos). */
export const FOLLOWING_FEED_PHOTO_MIN_HEIGHT_PX = 56;

/**
 * Tope de altura interior de tarjeta con foto = fracción del hueco del feed
 * (p. ej. 0.75 → ninguna publicación supera el 75 % del slot).
 */
export const FOLLOWING_FEED_MAX_CARD_HEIGHT_RATIO = 0.75;

/** Radio de esquinas del recuadro (fracción del panel interior). */
export const FOLLOWING_FEED_PHOTO_BORDER_RADIUS_SCALE = 0.55;

/** Padding horizontal interior aproximado (sync con feed content en ancho ref.). */
export const FOLLOWING_FEED_PHOTO_PAD_X_REF = 14;

export type FollowingFeedPhotoSlotLayout = {
  innerW: number;
  displayH: number;
  gap: number;
  photoLeft: number;
  photoTopY: number;
  photoExtra: number;
  cardHeight: number;
};

export function computeFollowingFeedPhotoInnerWidth(
  cardWidth: number,
  blackLeftPx: number,
  blackRightPx: number,
  padX: number,
): number {
  const photoLeft = blackLeftPx + padX;
  return Math.max(1, Math.round(cardWidth - photoLeft - blackRightPx - padX));
}

export function computeFollowingFeedPhotoPreferredHeight(innerW: number): number {
  return Math.round(innerW * FOLLOWING_FEED_PHOTO_FIXED_HEIGHT_RATIO);
}

/** Altura máxima interior de tarjeta a partir del slot exterior del feed. */
export function computeFollowingFeedMaxCardInnerHeight(slotOuterHeight: number): number {
  const innerSlot = Math.max(0, slotOuterHeight);
  return Math.max(80, Math.round(innerSlot * FOLLOWING_FEED_MAX_CARD_HEIGHT_RATIO));
}

/**
 * Foto debajo del texto (textContentBottomY fijo). Solo el recuadro de imagen cede
 * altura si la tarjeta supera el tope del feed.
 */
export function computeFollowingFeedPhotoSlotLayout(params: {
  baseCardHeight: number;
  blackLeftPx: number;
  blackRightPx: number;
  padX: number;
  cardWidth: number;
  /** Y (desde arriba de tarjeta) donde termina el bloque de texto — no se recorta. */
  textContentBottomY: number;
  statsBottomInset: number;
  statsRowHeight: number;
  maxCardHeight?: number;
}): FollowingFeedPhotoSlotLayout {
  const gap = FOLLOWING_FEED_PHOTO_GAP_BELOW_TEXT;
  const clearance = FOLLOWING_FEED_PHOTO_CLEARANCE_ABOVE_STATS;
  const padX = params.padX;
  const photoLeft = params.blackLeftPx + padX;
  const innerW = computeFollowingFeedPhotoInnerWidth(
    params.cardWidth,
    params.blackLeftPx,
    params.blackRightPx,
    padX,
  );

  let displayH = computeFollowingFeedPhotoPreferredHeight(innerW);
  const photoTopY = params.textContentBottomY + gap;

  const statsBlockFromBottom =
    params.statsBottomInset + params.statsRowHeight + clearance;

  let cardHeight = Math.max(
    params.baseCardHeight,
    photoTopY + displayH + statsBlockFromBottom,
  );

  const maxH = params.maxCardHeight;
  if (maxH != null && maxH > 0 && cardHeight > maxH) {
    cardHeight = maxH;
    const maxPhotoH = cardHeight - photoTopY - statsBlockFromBottom;
    displayH = Math.max(
      0,
      Math.min(displayH, maxPhotoH),
    );
    if (maxPhotoH >= FOLLOWING_FEED_PHOTO_MIN_HEIGHT_PX) {
      displayH = Math.max(FOLLOWING_FEED_PHOTO_MIN_HEIGHT_PX, displayH);
      displayH = Math.min(displayH, maxPhotoH);
    }
  }

  const photoExtra = Math.max(0, cardHeight - params.baseCardHeight);

  return {
    innerW,
    displayH,
    gap,
    photoLeft,
    photoTopY,
    photoExtra,
    cardHeight,
  };
}

/** Marco de la foto en Siguiendo (para editor / preview). */
export function estimateSiguiendoPhotoFrame(screenWidth: number): {
  width: number;
  height: number;
} {
  const maxUsable = screenWidth - 32;
  const cardW = Math.min(maxUsable, COMMUNITY_FEED_CARD_MAX_INNER_WIDTH);
  const blackLeft = SVG_SIDE_MARGIN_RATIO * cardW;
  const pad = FOLLOWING_FEED_PHOTO_PAD_X_REF;
  const width = computeFollowingFeedPhotoInnerWidth(cardW, blackLeft, blackLeft, pad);
  const height = computeFollowingFeedPhotoPreferredHeight(width);
  return { width, height };
}

export function resolveFollowingPhotoFocusY(
  following: number | null | undefined,
  fallback: number | null | undefined,
): number | undefined {
  if (following != null) return following;
  if (fallback != null) return fallback;
  return undefined;
}

/** @deprecated Usar `computeFollowingFeedPhotoPreferredHeight`. */
export function computeFollowingFeedPhotoDisplayHeight(
  innerW: number,
  _imageW?: number,
  _imageH?: number,
): number {
  return computeFollowingFeedPhotoPreferredHeight(innerW);
}
