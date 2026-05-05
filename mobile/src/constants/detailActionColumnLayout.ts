/**
 * Columna lateral derecha de acciones (detalle reflexión / frase).
 * Editores individuales para cada botón: posición y escala independientes.
 */
import { Platform } from 'react-native';

const AND = Platform.OS === 'android';

/** Configuración global de la columna. */
export const DETAIL_ACTION_COLUMN_LAYOUT = {
  /** Desplazamiento X de toda la columna respecto al borde derecho del display. */
  offsetX: AND ? -58 : -49,
  /** Desplazamiento Y de toda la columna. */
  offsetY: AND ? -280 : -345,
  /** Espacio vertical entre botones (px). */
  gap: AND ? 18 : 26,
  /** Tamaño base de cada icono (px). Los editores de scale lo multiplican. */
  iconSize: AND ? 28 : 36,
};

/** Botón CLAN (insignia). */
export const DETAIL_CLAN_BUTTON_LAYOUT = {
  // Android: offsetX=0 → el centro del icono queda exactamente en el borde derecho
  // del rectángulo de texto (mitad dentro, mitad fuera).
  offsetX: AND ? 0 : 17.5,
  offsetY: 0,
  scale: AND ? 2.2 : 3.3,
};

/** Botón UPVOTE. */
export const DETAIL_UPVOTE_BUTTON_LAYOUT = {
  offsetX: AND ? 0 : 18.5,
  offsetY: 0,
  scale: AND ? 1.3 : 1.8,
};

/** Botón DOWNVOTE. */
export const DETAIL_DOWNVOTE_BUTTON_LAYOUT = {
  offsetX: AND ? 0 : 18.5,
  offsetY: 0,
  scale: AND ? 1.3 : 1.8,
};

/** Botón SAVE (guardar / bookmark). */
export const DETAIL_SAVE_BUTTON_LAYOUT = {
  offsetX: AND ? 0 : 18,
  offsetY: 0,
  scale: AND ? 1.1 : 1.6,
};

/** Botón MÁS (tres puntitos). */
export const DETAIL_MORE_BUTTON_LAYOUT = {
  offsetX: AND ? 0 : 18,
  offsetY: AND ? 0 : -25,
  scale: AND ? 1.4 : 2,
};

/* ──────────────────────────────────────────────
 *  Stats visuales (números de votos + porcentaje)
 * ────────────────────────────────────────────── */

/**
 * Stats visuales — posicionamiento ABSOLUTO e independiente.
 * offsetX/offsetY: posición relativa al top-left de la columna (px).
 * scale: escala visual del texto (no afecta a otros elementos).
 */

/** Número de upvotes. */
export const DETAIL_UPVOTE_COUNT_LAYOUT = {
  offsetX: AND ? 58 : 75,
  offsetY: AND ? 95 : 125,
  scale: 1.1,
  fontSize: 13,
  fontWeight: '700' as const,
  colorActive: '#A3FF3B',
  colorInactive: '#FFFFFF',
};

/** Número de downvotes. */
export const DETAIL_DOWNVOTE_COUNT_LAYOUT = {
  offsetX: AND ? 58 : 75,
  offsetY: AND ? 235 : 304,
  scale: 1.1,
  fontSize: 13,
  fontWeight: '700' as const,
  colorActive: '#ff4a31',
  colorInactive: '#FFFFFF',
};

/** Porcentaje de aprobación. */
export const DETAIL_APPROVAL_PERCENT_LAYOUT = {
  offsetX: AND ? 58 : 75,
  offsetY: AND ? 165 : 215,
  scale: 1.1,
  fontSize: 12,
  fontWeight: '800' as const,
  colorAbove95: '#A3FF3B',
  colorAbove90: '#C7FF6B',
  colorAbove80: '#E6FF85',
  colorAbove70: '#F4E06D',
  colorAbove50: '#FFD166',
  colorBelow50: '#FF8C42',
  colorBelow10: '#FF3B30',
};
