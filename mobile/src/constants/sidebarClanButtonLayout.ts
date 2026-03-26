/**
 * Botón CLAN: capa absoluta sobre el `drawer`. No afecta al flex de búsqueda / conversaciones / footer.
 * El recorte es solo en render; el asset en `assets/sidebar/clanButton/` no se modifica desde código.
 */
export const SIDEBAR_CLAN_BUTTON_LAYOUT = {
  /** Posición del bloque flotante (px desde la esquina superior izquierda del contenedor `drawer`). */
  CLAN_BUTTON_OFFSET_X: 110,
  CLAN_BUTTON_OFFSET_Y: 249,
  /** Escala del bloque completo (transform). */
  CLAN_BUTTON_SCALE: 4.5,

  /** Ventana visible / área táctil (px). Aquí se ve el resultado del recorte + escala. */
  CLAN_BUTTON_VIEWPORT_WIDTH: 56,
  CLAN_BUTTON_VIEWPORT_HEIGHT: 56,

  /**
   * Tamaño lógico del bitmap en coordenadas de recorte (px). Debe coincidir con el asset para que
   * CROP_* sean correctos; no altera el fichero en disco.
   */
  CLAN_BUTTON_SOURCE_WIDTH: 576,
  CLAN_BUTTON_SOURCE_HEIGHT: 1024,

  /** Recorte manual en px (origen arriba-izquierda del asset). Con 0 en los cuatro, se muestra el PNG completo (contain). */
  CLAN_BUTTON_CROP_TOP: 0,
  CLAN_BUTTON_CROP_BOTTOM: 0,
  CLAN_BUTTON_CROP_LEFT: 0,
  CLAN_BUTTON_CROP_RIGHT: 0,
} as const;
