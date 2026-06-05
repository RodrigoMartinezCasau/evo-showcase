/**
 * Fondo del display de reflexión (perfil, detalle, etc.).
 * El relleno es nativo; `scale` / `offsetX` / `offsetY` / `borderRadius` recortan
 * el negro igual que el antiguo SVG escalado dentro del clip.
 */
export const REFLECTION_BACKGROUND_LAYOUT = {
  /** Escala uniforme del SVG respecto al contenedor. */
  scale: 1.30,
  /** Desplazamiento horizontal del SVG (px). */
  offsetX: 0,
  /** Desplazamiento vertical del SVG (px). */
  offsetY: -0,
  /** Redondeo de los bordes del fondo SVG (0 = recto, 20–30 = suave, 50+ = muy redondeado). */
  borderRadius: 40,
} as const;
