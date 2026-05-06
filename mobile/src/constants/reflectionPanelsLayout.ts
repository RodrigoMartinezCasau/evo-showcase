/**
 * Layout de los dos paneles negros del display de reflexión.
 * Editores independientes: mover/escalar cada panel sin afectar al otro.
 */

/** Panel superior: texto de la reflexión / frase. */
export const REFLECTION_PANEL_LAYOUT = {
  offsetX: -15,
  offsetY: 0,
  /** 1 = ancho completo del contenedor; <1 más estrecho, >1 más ancho. */
  widthScale: 0.95,
  /** Proporción de la altura disponible (0–1). El resto lo toma el panel de comentarios. */
  heightRatio: 0.65,
  borderRadius: 15,
  paddingHorizontal: 14,
  paddingVertical: 16,
  backgroundColor: '#15151A',
} as const;

/** Panel inferior: comentarios. */
export const COMMENTS_PANEL_LAYOUT = {
  offsetX: -15,
  offsetY: 0,
  widthScale: 0.95,
  /** Altura fija del panel de comentarios (px). null = automática (espacio restante). */
  height: null as number | null,
  borderRadius: 15,
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: '#15151A',
} as const;

/** Espacio vertical entre los dos paneles (px). */
export const PANELS_GAP = 12;

/** Espacio reservado debajo del panel de comentarios (px). Reducir para expandir los paneles hacia abajo. */
export const PANELS_BOTTOM_RESERVE = 0;

/**
 * Reducción del ancho útil del texto de la reflexión desde la derecha (px).
 * Con columnCenterInset=0 y maxClanW=120, el borde izquierdo de la columna
 * queda en ≈293 px (pantalla de 393 px). El texto termina en ≈289 px con 50 px
 * de inset, dejando ~4 px de separación con la columna.
 */
export const REFLECTION_TEXT_RIGHT_INSET = 50;

/** Control del título de la reflexión/frase. */
export const DETAIL_TITLE_LAYOUT = {
  offsetX: 27,
  offsetY: 0,
  scale: 1.16,
  /** Caracteres máximos visibles. Si el título es más largo, se trunca con "…". */
  maxCharacters: 25,
} as const;

/** Límites internos del contenido de comentarios dentro del panel negro. */
export const COMMENTS_CONTENT_INSETS = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
} as const;
