/**
 * Insignia de clan (footer): capa absoluta sobre el `drawer`. No participa en el flex;
 * solo desplaza esta capa con X/Y y escala el SVG de forma uniforme.
 */
export const SIDEBAR_CLAN_INSIGNIA_LAYOUT = {
  /** px desde el borde izquierdo del drawer. */
  SIDEBAR_CLAN_INSIGNIA_OFFSET_X: -15,
  /** px desde el borde inferior del drawer (equivale a `bottom` en estilo). */
  SIDEBAR_CLAN_INSIGNIA_OFFSET_Y: 10,
  /**
   * Escala uniforme del icono. Tamaño base de dibujo = 600×600 (viewBox del asset);
   * tamaño render ≈ 600 * SCALE en el eje mayor (cuadrado).
   */
  SIDEBAR_CLAN_INSIGNIA_SCALE: 0.17,
};
