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
  heightRatio: 0.75,
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
