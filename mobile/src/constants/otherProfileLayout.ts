/**
 * Centralized layout config for the Other User Profile screen.
 * Tweak all positions, sizes, and spacing from this single file.
 */

// ── Follow row (contenedor; botón y contadores son capas independientes) ─
export const FOLLOW_ROW_PADDING_HORIZONTAL = 40;
/** Altura reservada en el scroll; el botón y los contadores no la empujan al escalar */
export const FOLLOW_ROW_MIN_HEIGHT = 56;

// ── Botón Seguir / Siguiendo (caja de layout fija; solo transform mueve/escala) ─
export const FOLLOW_BUTTON_LAYOUT_WIDTH = 200;
export const FOLLOW_BUTTON_LAYOUT_HEIGHT = 56;
export const FOLLOW_BUTTON_OFFSET_X = 22;
export const FOLLOW_BUTTON_OFFSET_Y = 0;
export const FOLLOW_BUTTON_SCALE = 1;

/** Interior del botón (solo estado "Seguir"): símbolo + — no mueve el contenedor del botón */
export const FOLLOW_BUTTON_PLUS_OFFSET_X = -15;
export const FOLLOW_BUTTON_PLUS_OFFSET_Y = 0;
export const FOLLOW_BUTTON_PLUS_SCALE = 0.8;

/** Interior del botón: texto "Seguir" — independiente del + */
export const FOLLOW_BUTTON_SEGUIR_TEXT_OFFSET_X = -12;
export const FOLLOW_BUTTON_SEGUIR_TEXT_OFFSET_Y = 0;
export const FOLLOW_BUTTON_SEGUIR_TEXT_SCALE = 1;

// ── Contadores seguidores / seguidos (misma idea que el escudo) ────
export const FOLLOW_STATS_LAYOUT_WIDTH = 220;
export const FOLLOW_STATS_LAYOUT_HEIGHT = 52;
export const FOLLOW_STATS_OFFSET_X = -70;
export const FOLLOW_STATS_OFFSET_Y = 0;
export const FOLLOW_STATS_SCALE = 1.2;

// ── Insignia phrase box dimensions ─────────────────────────────────
export const INSIGNIA_BOX_MARGIN_HORIZONTAL = 70; // recorta el ancho: más alto = más estrecha
export const INSIGNIA_BOX_HEIGHT: number | undefined = undefined; // undefined = auto (wrap content)
export const INSIGNIA_BOX_OFFSET_X = -50;
export const INSIGNIA_BOX_OFFSET_Y = 0;

// ── Panel porcentajes filosóficos ("Pensamiento filosófico") ───────
export const PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_X = 0;
export const PHILOSOPHY_PERCENTAGES_PANEL_OFFSET_Y = 0;
/** undefined = ancho automático (márgenes laterales como hasta ahora) */
export const PHILOSOPHY_PERCENTAGES_PANEL_WIDTH: number | undefined = undefined;
/** undefined = alto automático según el contenido */
export const PHILOSOPHY_PERCENTAGES_PANEL_HEIGHT: number | undefined = undefined;

// ── Fila Seguir + Posts + stats (perfil ajeno): altura de pista para centrar en Y ─
export const OTHER_PROFILE_FOLLOW_ROW_TRACK_HEIGHT = 56;

// ── Botón 3-puntos (acciones avanzadas) ────────────────────────────
export const THREE_DOTS_OFFSET_X = 0;
/** Positivo = bajar el glifo dentro del área táctil (no cambia el layout de la fila). */
export const THREE_DOTS_OFFSET_Y = 4;
export const THREE_DOTS_SIZE = 39;

// ── Card background opacities (0 = transparente, 1 = sólido) ───────────────
/**
 * Opacidad del fondo negro de la tarjeta "frase insignia" (perfil ajeno).
 * 1.0 = negro sólido · 0.0 = completamente transparente.
 */
export const OTHER_INSIGNIA_CARD_OPACITY   = 0.5;

/**
 * Opacidad del fondo negro del panel "Pensamiento filosófico" (perfil ajeno).
 */
export const OTHER_PHILOSOPHY_CARD_OPACITY = 1;

/**
 * Opacidad del fondo negro de las tarjetas "Reflexiones totales" y "Frases totales"
 * (solo en perfiles ajenos).
 */
export const OTHER_TOTALS_CARD_OPACITY     = 1;

/** Espacio vertical ENTRE los contadores totales (Reflexiones/Frases) y la fila de tarjetas.
 *  El contenedor padre ya aporta un gap de 20 px. Un valor positivo suma a ese gap.
 *  Reducir → acerca las tarjetas al bloque de arriba. No afecta a otros espaciados. */
export const OTHER_LATEST_POSTS_SPACING = 10;
