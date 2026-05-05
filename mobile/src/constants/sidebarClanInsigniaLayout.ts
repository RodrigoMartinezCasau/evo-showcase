import { Dimensions } from 'react-native';

/**
 * Pantallas estrechas (< 420 pt de ancho) — iPhones 15 / SE y Android pequeños.
 * En estas pantallas el área de clan + texto + ajustes se solapa con el panel de
 * conversaciones; se reducen tamaños y se baja la posición.
 */
const SMALL = Dimensions.get('window').width < 420;

/**
 * Insignia de clan (footer): capa absoluta sobre el `drawer`. No participa en el flex;
 * solo desplaza esta capa con X/Y y escala el SVG de forma uniforme.
 */
export const SIDEBAR_CLAN_INSIGNIA_LAYOUT = {
  /** px desde el borde izquierdo del drawer. */
  SIDEBAR_CLAN_INSIGNIA_OFFSET_X: -15,
  /** px desde el borde inferior del drawer (equivale a `bottom` en estilo). */
  SIDEBAR_CLAN_INSIGNIA_OFFSET_Y: SMALL ? 10 : 25,
  /**
   * Escala uniforme del icono. Tamaño base de dibujo = 600×600 (viewBox del asset);
   * tamaño render ≈ 600 * SCALE en el eje mayor (cuadrado).
   * Pantallas pequeñas: más pequeño para dejar espacio entre el perfil y el panel de conversaciones.
   */
  SIDEBAR_CLAN_INSIGNIA_SCALE: SMALL ? 0.17 : 0.25,
};
