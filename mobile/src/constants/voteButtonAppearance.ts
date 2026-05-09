/**
 * Apariencia unificada de flechas upvote / downvote (detailActions 29–32, tarjetas feed).
 * Inactivos: SVG 31 / 29 — relleno blanco (#ffffff).
 * Activos: degradado vertical en 32 / 30 (abajo → arriba en coordenadas del path).
 */

export const VOTE_UP_GRADIENT_BOTTOM = '#488b1e';
export const VOTE_UP_GRADIENT_TOP = '#b7d63c';

export const VOTE_DOWN_GRADIENT_BOTTOM = '#ff3131';
export const VOTE_DOWN_GRADIENT_TOP = '#b8591f';

/** Contadores junto al icono cuando el voto está activo. */
export const VOTE_UP_COUNT_ACTIVE_COLOR = VOTE_UP_GRADIENT_TOP;
export const VOTE_DOWN_COUNT_ACTIVE_COLOR = VOTE_DOWN_GRADIENT_BOTTOM;

/** Ratio % alto / bajo (flecha de aprobación en previews de perfil). */
export const VOTE_RATIO_HIGH_COLOR = VOTE_UP_GRADIENT_TOP;
export const VOTE_RATIO_LOW_COLOR = VOTE_DOWN_GRADIENT_BOTTOM;
