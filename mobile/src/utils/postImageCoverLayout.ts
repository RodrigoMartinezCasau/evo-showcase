import {
  COMMENTS_PANEL_LAYOUT as CP,
  PANELS_BOTTOM_RESERVE,
  PANELS_GAP,
  REFLECTION_PANEL_LAYOUT as RP,
} from '@evoconn/constants/reflectionPanelsLayout';

/** Punto vertical normalizado en la imagen fuente (0 = tope, 1 = base). */
export type PostImageFocusY = number;

export type PostImageCoverLayoutInput = {
  containerWidth: number;
  containerHeight: number;
  imageWidth: number;
  imageHeight: number;
  /** Punto de la imagen fuente anclado al viewport (0–1). */
  focusY: PostImageFocusY;
  /** Posición del ancla en el viewport (0 = tope, 1 = base). */
  anchorYRatio?: number;
};

export type PostImageCoverLayout = {
  imageWidth: number;
  imageHeight: number;
  left: number;
  top: number;
  /** Rango vertical recortable en px (0 si no hay overflow). */
  panRangePx: number;
  focusY: PostImageFocusY;
};

export const DEFAULT_POST_IMAGE_FOCUS_Y = 0.5;

export function clampPostImageFocusY(value: number): PostImageFocusY {
  return Math.max(0, Math.min(1, value));
}

/**
 * Encuadre `cover` universal: el mismo `focusY` muestra la misma zona de la imagen
 * fuente en cualquier tamaño de contenedor (Para ti, editor, Siguiendo…).
 */
export function computePostImageCoverLayout(
  input: PostImageCoverLayoutInput,
): PostImageCoverLayout {
  const {
    containerWidth: W,
    containerHeight: H,
    imageWidth: iw,
    imageHeight: ih,
    anchorYRatio = 0.5,
  } = input;
  const focusY = clampPostImageFocusY(input.focusY);

  if (W <= 0 || H <= 0 || iw <= 0 || ih <= 0) {
    return {
      imageWidth: W,
      imageHeight: H,
      left: 0,
      top: 0,
      panRangePx: 0,
      focusY,
    };
  }

  const scale = Math.max(W / iw, H / ih);
  const scaledW = iw * scale;
  const scaledH = ih * scale;
  const anchorY = H * anchorYRatio;
  const centerTop = (H - scaledH) / 2;
  const minTop = H - scaledH;
  const panRangePx = scaledH > H ? centerTop - minTop : 0;

  let top = anchorY - focusY * scaledH;
  if (scaledH > H) {
    top = Math.max(minTop, Math.min(0, top));
  } else {
    top = centerTop;
  }

  return {
    imageWidth: scaledW,
    imageHeight: scaledH,
    left: (W - scaledW) / 2,
    top,
    panRangePx,
    focusY,
  };
}

/** Convierte arrastre vertical (px) en cambio de `focusY`. */
export function postImageFocusYFromPanDelta(
  startFocusY: PostImageFocusY,
  deltaYPx: number,
  scaledImageHeight: number,
): PostImageFocusY {
  if (scaledImageHeight <= 0) return clampPostImageFocusY(startFocusY);
  return clampPostImageFocusY(startFocusY - deltaYPx / scaledImageHeight);
}

/** Marco interior del panel de reflexión en Para ti (zona donde va la foto). */
export function estimateParaTiPhotoFrame(params: {
  screenWidth: number;
  itemHeight: number;
  contentPadHorizontal?: number;
}): { width: number; height: number } {
  const padH = params.contentPadHorizontal ?? 14;
  const headerHeight = 52;
  const panelsAvailable =
    params.itemHeight - headerHeight - PANELS_BOTTOM_RESERVE - PANELS_GAP - 16;
  const commentsH =
    CP.height != null
      ? CP.height
      : Math.max(80, panelsAvailable * (1 - RP.heightRatio));
  const reflectionH = Math.max(80, panelsAvailable - commentsH);
  const panelLayoutW = Math.max(1, params.screenWidth - 2 * padH);
  const width = Math.max(1, panelLayoutW - 2 * RP.paddingHorizontal);
  const height = Math.max(1, reflectionH - 2 * RP.paddingVertical);
  return { width, height };
}
