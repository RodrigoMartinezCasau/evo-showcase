import { REFLECTION_PANEL_LAYOUT as RP } from '@evoconn/constants/reflectionPanelsLayout';
import { DETAIL_HEADER_ROW_OFFSET_Y } from '@evoconn/constants/reflectionDetailRankBadgeLayout';

/**
 * Editor de producción: foto de fondo en Para ti (`ReflectionDetailItem`).
 *
 * Ajusta aquí la separación entre el @usuario y el inicio de la imagen.
 * Los valores son px lógicos y se aplican igual en todos los dispositivos.
 *
 * Referencias que deben mantenerse en sync con `ReflectionDetailItem`:
 *   - `DETAIL_CONTENT_PADDING_TOP` ↔ `styles.content.paddingTop`
 *   - `DETAIL_HEADER_MARGIN_BOTTOM` ↔ `styles.headerRow.marginBottom` (sin foto)
 *   - `DETAIL_USERNAME_LINE_HEIGHT` ↔ `styles.username` (fontSize 18, una línea)
 */

/** paddingTop de `styles.content`. */
export const DETAIL_CONTENT_PADDING_TOP = 12;

/** marginBottom del header en posts sin foto. */
export const DETAIL_HEADER_MARGIN_BOTTOM = 10;

/** marginBottom del header cuando el post lleva foto. */
export const DETAIL_PHOTO_HEADER_MARGIN_BOTTOM = DETAIL_HEADER_MARGIN_BOTTOM;

/** Altura visual del @usuario (fontSize 18, una línea). */
export const DETAIL_USERNAME_LINE_HEIGHT = 22;

/**
 * Hueco entre la base del @usuario y el primer píxel visible de la foto (px).
 *
 * Referencia simétrica (tope del @usuario → borde superior de tarjeta):
 *   USERNAME_LINE_HEIGHT + PHOTO_HEADER_MARGIN_BOTTOM + RP.offsetY − HEADER_ROW_OFFSET_Y
 */
export const DETAIL_PHOTO_USERNAME_TO_IMAGE_GAP = 20;

/** Ajuste fino del recorte superior dentro del panel (+ = más franja negra / foto más abajo). */
export const DETAIL_PHOTO_IMAGE_TOP_INSET_OFFSET = 12;

/** Radio de las esquinas visibles de la foto dentro del panel (px). */
export const DETAIL_PHOTO_IMAGE_BORDER_RADIUS = 10;

/** Inset superior de la foto dentro del panel (franja negra encima del cover). */
export function computeDetailPhotoImageTopInset(): number {
  const inset =
    DETAIL_HEADER_ROW_OFFSET_Y +
    DETAIL_PHOTO_USERNAME_TO_IMAGE_GAP -
    DETAIL_PHOTO_HEADER_MARGIN_BOTTOM -
    RP.offsetY -
    RP.paddingVertical +
    DETAIL_PHOTO_IMAGE_TOP_INSET_OFFSET;
  return Math.max(0, Math.round(inset));
}

/** Hueco tope del @usuario → borde superior de la tarjeta (solo referencia visual). */
export function detailPhotoUsernameTopToCardTop(): number {
  return (
    DETAIL_USERNAME_LINE_HEIGHT +
    DETAIL_PHOTO_HEADER_MARGIN_BOTTOM +
    RP.offsetY -
    DETAIL_HEADER_ROW_OFFSET_Y
  );
}
