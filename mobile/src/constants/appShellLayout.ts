import {
  BOTTOM_BAR_LAYOUT,
  getBottomBarScrollContentPaddingBottom,
  getBottomBarViewportReserveBottom,
} from '@evoconn/constants/bottomBarLayout';
import { getAppTopBarLayoutHeight } from '@evoconn/constants/topBarLayout';

/**
 * Altura del área de contenido bajo `AppTopBar` con barra inferior flotante (referencia Para Ti).
 */
export function getMainColumnHeightForFloatingBottomBar(
  windowHeight: number,
  insetTop: number,
  insetBottom: number,
): number {
  return (
    windowHeight -
    getAppTopBarLayoutHeight(insetTop) -
    getBottomBarViewportReserveBottom(insetBottom)
  );
}

/** Alias: mismo valor que `getMainColumnHeightForFloatingBottomBar`. */
export function getAppShellScrollableBodyHeight(
  windowHeight: number,
  insetTop: number,
  insetBottom: number,
): number {
  return getMainColumnHeightForFloatingBottomBar(windowHeight, insetTop, insetBottom);
}

/** Clan + frases (lápiz): más franja bajo el contenido, mismo padding de scroll. */
export function getClanPhrasesShellBodyHeight(
  windowHeight: number,
  insetTop: number,
  insetBottom: number,
): number {
  return (
    getMainColumnHeightForFloatingBottomBar(windowHeight, insetTop, insetBottom) -
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_CLAN_PHRASES_STRIP_EXTRA
  );
}

export function getClanPhrasesScrollPaddingBottom(insetBottom: number): number {
  return (
    getBottomBarScrollContentPaddingBottom(insetBottom) +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_CLAN_PHRASES_STRIP_EXTRA
  );
}
