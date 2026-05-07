/**
 * Alineación horizontal compartida entre los `SidebarPngMenuButton` (COMUNIDAD,
 * NUEVA REFLEXIÓN, NUEVA FRASE) y el bloque de conversaciones.
 *
 * Debe coincidir con `communityMenuRow` en SidebarDrawer (`paddingHorizontal`)
 * y con la fórmula de ancho en `SidebarPngMenuButton` (imagen − crops × stretch).
 */
import { SIDEBAR_NEW_REFLECTION_LAYOUT as SR } from './sidebarNewReflectionLayout';

/** Mismo valor que `styles.communityMenuRow.paddingHorizontal` en SidebarDrawer. */
export const SIDEBAR_PNG_MENU_ROW_PADDING_HORIZONTAL = 16;

/** Mismo `translateX` del bloque PNG que Nueva reflexión / Nueva frase. */
export const SIDEBAR_PNG_MENU_BLOCK_OFFSET_X = SR.SIDEBAR_NEW_REFLECTION_BLOCK_OFFSET_X;

/** Ancho visible del rect del botón PNG (misma fórmula que SidebarPngMenuButton). */
export const SIDEBAR_PNG_MENU_BUTTON_LAYOUT_WIDTH_PX = Math.max(
  1,
  (SR.SIDEBAR_NEW_REFLECTION_IMAGE_WIDTH -
    SR.SIDEBAR_NEW_REFLECTION_CROP_LEFT -
    SR.SIDEBAR_NEW_REFLECTION_CROP_RIGHT) *
    SR.SIDEBAR_NEW_REFLECTION_HORIZONTAL_STRETCH,
);
