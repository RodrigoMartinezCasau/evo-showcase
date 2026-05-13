import type { Rank } from '@evoconn/types';

/**
 * Editores para el badge de rango en la esquina superior derecha del detalle de reflexión.
 * Solo afecta a ese badge — no toca el resto del layout.
 */

/** Propiedades comunes (tamaño, posición, forma). */
export const REFLECTION_DETAIL_RANK_BADGE_LAYOUT = {
  fontSize: 17,
  fontWeight: '700' as const,
  letterSpacing: 1.2,
  paddingHorizontal: 0,
  paddingVertical: 0,
  borderRadius: 0,
  offsetX: 0,
  offsetY: 0,
} as const;

/** Desplazamiento horizontal del header completo (username + seguir) en conjunto (px). Positivo = derecha. */
export const DETAIL_HEADER_ROW_OFFSET_X = 12;
/** Desplazamiento vertical del header completo (username + seguir) en conjunto (px). Positivo = abajo. Igualado a OFFSET_X para distancia equivalente en ambos ejes. */
export const DETAIL_HEADER_ROW_OFFSET_Y = DETAIL_HEADER_ROW_OFFSET_X;

/** Colores por rango. */
export const RANK_BADGE_COLORS: Record<Rank, { backgroundColor: string; textColor: string }> = {
  aprendiz: { backgroundColor: 'transparent', textColor: '#b36a34' },
  maestro:  { backgroundColor: 'transparent', textColor: '#cdcdcd' },
  filosofo: { backgroundColor: 'transparent', textColor: '#d9af50' },
};
