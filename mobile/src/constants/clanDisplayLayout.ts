/**
 * clanDisplayLayout.ts
 * ====================
 * Editores de layout para el display de clan (ClanDisplay.tsx).
 * Cambia los valores aquí — no toques el componente para ajustar tamaños.
 *
 * Todas las unidades son px salvo que se indique lo contrario.
 * Los valores de margen/gap SÍ PUEDEN SER NEGATIVOS.
 */

// ─── Badge (escudo del clan) ──────────────────────────────────────────────────

/** Tamaño del escudo (ancho = alto). */
export const CLAN_DISPLAY_SHIELD_SIZE = 250;

/** Desplazamiento horizontal del escudo. */
export const CLAN_DISPLAY_SHIELD_OFFSET_X = 0;

/** Desplazamiento vertical del escudo. */
export const CLAN_DISPLAY_SHIELD_OFFSET_Y = 0;

/** Escala del escudo (1.0 = sin cambio). */
export const CLAN_DISPLAY_SHIELD_SCALE = 1.0;

/**
 * Margen inferior del escudo.
 * NEGATIVO → el estandarte sube hacia el escudo.
 */
export const CLAN_DISPLAY_SHIELD_MARGIN_BOTTOM = -165;

// ─── Estandarte del clan ──────────────────────────────────────────────────────

/**
 * Margen horizontal total del estandarte.
 * El estandarte se renderiza a `screenWidth − este valor` px.
 */
export const CLAN_DISPLAY_ESTANDARTE_H_MARGIN = 40;

/** Desplazamiento horizontal del estandarte. */
export const CLAN_DISPLAY_ESTANDARTE_OFFSET_X = 0;

/** Desplazamiento vertical del estandarte. */
export const CLAN_DISPLAY_ESTANDARTE_OFFSET_Y = 0;

/** Escala del estandarte (1.0 = sin cambio). */
export const CLAN_DISPLAY_ESTANDARTE_SCALE = 0.85;

/**
 * Margen superior del estandarte.
 * NEGATIVO → el estandarte sube y se acerca al escudo (elimina espacio en blanco del SVG).
 */
export const CLAN_DISPLAY_ESTANDARTE_MARGIN_TOP = 0;

/**
 * Margen inferior del estandarte (antes de la frase del clan).
 * NEGATIVO → la frase sube y se acerca al estandarte.
 */
export const CLAN_DISPLAY_ESTANDARTE_MARGIN_BOTTOM = -160;

// ─── Sección logo (contenedor general) ───────────────────────────────────────

/** Padding superior de la zona escudo+estandarte. */
export const CLAN_DISPLAY_LOGO_PADDING_TOP = 3;

// ─── Gap entre secciones ──────────────────────────────────────────────────────

/** Espacio vertical entre todas las secciones del display. */
export const CLAN_DISPLAY_SECTIONS_GAP = 16;

// ─── Tarjeta de frase del clan ────────────────────────────────────────────────

/** Radio de esquina — mismo criterio que tarjetas Siguiendo (`SVG_CARD_VISUAL`). */
export const CLAN_DISPLAY_PHRASE_BORDER_RADIUS = 16;

/** Longitud del reborde en esquinas (horizontal / vertical), estilo burbuja Siguiendo. */
export const CLAN_DISPLAY_PHRASE_RIM_ARM_X = 44;
export const CLAN_DISPLAY_PHRASE_RIM_ARM_Y = 28;

/** Padding vertical de la tarjeta de frase. */
export const CLAN_DISPLAY_PHRASE_PADDING_V = 20;

/** Padding horizontal de la tarjeta de frase. */
export const CLAN_DISPLAY_PHRASE_PADDING_H = 22;

/** Tamaño de la fuente de la frase del clan. */
export const CLAN_DISPLAY_PHRASE_FONT_SIZE = 17;

/** Altura de línea de la frase del clan. */
export const CLAN_DISPLAY_PHRASE_LINE_HEIGHT = 26;

// ─── Tarjetas de posts (sección 6) ───────────────────────────────────────────

/**
 * Fracción del ancho de pantalla que ocupa cada tarjeta de post.
 * 0.55 → 55 % del ancho.
 */
export const CLAN_DISPLAY_POST_CARD_RATIO = 0.55;

/** Ancho mínimo de tarjeta de post en px. */
export const CLAN_DISPLAY_POST_CARD_MIN_W = 200;
