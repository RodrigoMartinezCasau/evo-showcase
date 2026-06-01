/**
 * EDITOR de las estrellas del fondo (todas las pantallas).
 * ────────────────────────────────────────────────────────
 * Las estrellas son ESTÁTICAS (sin parpadeo). Aquí controlas su brillo a tu
 * gusto sin tocar la lógica. Tras cambiar un número, guarda y recarga la app.
 */

/**
 * Brillo GLOBAL de las estrellas (afecta a TODAS: Para Ti, Siguiendo, botón de
 * Comunidad, tarjetas de perfil/clan, fondo de pantalla, etc.).
 *   1   = nivel base
 *  <1   = más tenues   (p. ej. 0.7)
 *  >1   = más brillantes (p. ej. 1.3)
 */
export const STAR_GLOBAL_BRIGHTNESS = 1;

/**
 * Brillo EXTRA aplicado SOLO a la ventana "Para Ti" (se multiplica encima del
 * global).
 *   1   = igual que el resto
 *  >1   = Para Ti más brillante (p. ej. 1.6)
 */
export const PARA_TI_STAR_BRIGHTNESS = 2;

/**
 * Opacidad BASE de cada estrella antes de aplicar los brillos de arriba.
 * Cada estrella toma un valor aleatorio fijo entre MIN y (MIN + VARIATION),
 * para que unas se vean un poco más que otras.
 *   MIN        = opacidad mínima (estrella más tenue)
 *   VARIATION  = cuánto puede subir como máximo respecto al MIN
 * (la opacidad final siempre se limita a 1)
 */
export const STAR_OPACITY_MIN = 0.15;
export const STAR_OPACITY_VARIATION = 0.33;
