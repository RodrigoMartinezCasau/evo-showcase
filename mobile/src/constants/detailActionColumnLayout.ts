/**
 * Columna lateral derecha de acciones (detalle reflexión / frase).
 * Editores individuales para cada botón: posición y escala independientes.
 */

/** Configuración global de la columna. */
export const DETAIL_ACTION_COLUMN_LAYOUT = {
  /** Desplazamiento X de toda la columna respecto al borde derecho del display. */
  offsetX: 0,
  /** Desplazamiento Y de toda la columna. */
  offsetY: -135,
  /** Espacio vertical entre botones (px). */
  gap: 16,
  /** Tamaño base de cada icono (px). Los editores de scale lo multiplican. */
  iconSize: 36,
} as const;

/** Botón CLAN (insignia). */
export const DETAIL_CLAN_BUTTON_LAYOUT = {
  offsetX: 17.5,
  offsetY: -0,
  scale: 3.3,
} as const;

/** Botón UPVOTE. */
export const DETAIL_UPVOTE_BUTTON_LAYOUT = {
  offsetX: 18.5,
  offsetY: 0,
  scale: 1.7,
} as const;

/** Botón DOWNVOTE. */
export const DETAIL_DOWNVOTE_BUTTON_LAYOUT = {
  offsetX: 18.5,
  offsetY: 0,
  scale: 1.7,
} as const;

/** Botón SAVE (guardar / bookmark). */
export const DETAIL_SAVE_BUTTON_LAYOUT = {
  offsetX: 18,
  offsetY: 0,
  scale: 1.5,
} as const;
