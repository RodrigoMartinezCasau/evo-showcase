import { Platform } from 'react-native';
import { getMainColumnHeightForFloatingBottomBar } from '@evoconn/constants/appShellLayout';
import {
  COMMUNITY_FEED_CARD_MAX_INNER_WIDTH,
  SVG_CARD_VISUAL,
} from '@evoconn/constants/svgCardLayout';

/** Debe coincidir con `styles.list.paddingTop` en CommunityScreen. */
export const COMMUNITY_FEED_LIST_PADDING_TOP = 8;

/** Android: respiro extra bajo la tarjeta dentro del área del feed. */
export const COMMUNITY_FEED_SLOT_BOTTOM_INSET_ANDROID = 14;

/** Pantallas anchas: reduce el slot para no pegar la tarjeta a la barra inferior. */
export const COMMUNITY_FEED_SLOT_BOTTOM_WIDE = 18;

export type CommunityFeedSlotHeights = {
  feedItemHeight: number;
  feedCardSlotOuterHeight: number;
  communityWideFeedLayout: boolean;
};

/**
 * Mismas medidas que `CommunityScreen` para Para ti / Siguiendo.
 * El editor y la previsualización deben usar esto para que el encuadre
 * de la foto coincida pixel a pixel con el feed publicado.
 */
export function computeCommunityFeedSlotHeights(params: {
  windowHeight: number;
  insetTop: number;
  insetBottom: number;
  safeFrameHeight?: number;
  screenWidth: number;
}): CommunityFeedSlotHeights {
  const feedItemHeight = getMainColumnHeightForFloatingBottomBar(
    params.windowHeight,
    params.insetTop,
    params.insetBottom,
    params.safeFrameHeight,
  );

  const communityFeedUsableWidth =
    params.screenWidth - SVG_CARD_VISUAL.CARD_HORIZONTAL_MARGIN * 2;
  const communityWideFeedLayout =
    communityFeedUsableWidth > COMMUNITY_FEED_CARD_MAX_INNER_WIDTH;

  const feedCardSlotOuterHeight =
    feedItemHeight -
    COMMUNITY_FEED_LIST_PADDING_TOP -
    (Platform.OS === 'android' ? COMMUNITY_FEED_SLOT_BOTTOM_INSET_ANDROID : 0) -
    (communityWideFeedLayout ? COMMUNITY_FEED_SLOT_BOTTOM_WIDE : 0);

  return {
    feedItemHeight,
    feedCardSlotOuterHeight,
    communityWideFeedLayout,
  };
}
