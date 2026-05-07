/**
 * Pie del drawer lateral: insignia de clan, bloque nombre/clan/rango, ajustes.
 * Una sola fuente de verdad para alinear alturas (texto = misma caja que la insignia).
 *
 * Los factores `LINE_HEIGHT_FACTOR_*` multiplican `fontSize` → `lineHeight` fijo por línea
 * (controla interlineado y cuánto “cuelga” el texto respecto al borde del icono).
 * `RANK_BOTTOM_INSET_PX`: eleva todo el rango respecto al borde inferior del bloque 68px
 *   (el SVG del escudo suele tener margen transparente abajo; prueba 2–8).
 * `RANK_OPTICAL_NUDGE_Y`: translateY extra solo sobre el texto del rango (+ = hacia abajo).
 * `USERNAME_TOP_OFFSET_RATIO`: la franja del nombre empieza a esta fracción de la altura de la insignia
 *   por debajo del borde superior del bloque (p. ej. 0.15 = 15% más abajo).
 * `USERNAME_TOP_EXTRA_INSET_PX`: suma opcional en px (no afecta al rango inferior).
 */
export const SIDEBAR_DRAWER_FOOTER_INSIGNIA_SIZE = 68;

export const SIDEBAR_DRAWER_FOOTER_SETTINGS_SIZE = 34;

/** Sans — nombre de usuario */
export const SIDEBAR_DRAWER_FOOTER_USERNAME_FONT_SIZE = 14;

/** Inria — línea de clan */
export const SIDEBAR_DRAWER_FOOTER_CLAN_FONT_SIZE = 12;

/** Inria — rango */
export const SIDEBAR_DRAWER_FOOTER_RANK_FONT_SIZE = 12;

/** lineHeight ≈ fontSize × factor (ajustable sin tocar el layout). */
export const SIDEBAR_DRAWER_FOOTER_LINE_HEIGHT_FACTOR_USERNAME = 1;
export const SIDEBAR_DRAWER_FOOTER_LINE_HEIGHT_FACTOR_CLAN = 1.12;
export const SIDEBAR_DRAWER_FOOTER_LINE_HEIGHT_FACTOR_RANK = 1;

/** Fracción de `INSIGNIA_SIZE` por debajo del borde superior donde empieza el nombre (15% = 0.15). */
export const SIDEBAR_DRAWER_FOOTER_USERNAME_TOP_OFFSET_RATIO = 0.15;

/** Suma en px al offset del nombre (ajuste fino; el borde inferior del rango no usa esto). */
export const SIDEBAR_DRAWER_FOOTER_USERNAME_TOP_EXTRA_INSET_PX = 0;

/** Sube el rango si el escudo tiene margen transparente abajo (px). 0 = borde del bloque = borde del SVG 68×68. */
export const SIDEBAR_DRAWER_FOOTER_RANK_BOTTOM_INSET_PX = 0;

/** Ajuste fino adicional en el texto del rango (+ = hacia abajo). */
export const SIDEBAR_DRAWER_FOOTER_RANK_OPTICAL_NUDGE_Y = 0;
