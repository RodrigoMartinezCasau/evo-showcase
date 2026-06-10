/**
 * Tope de tamaño del contexto enviado al LLM (U2).
 *
 * El contexto combinado (datos del usuario + pantalla) no tenía límite: una
 * pantalla con varias publicaciones largas inflaba el prompt → más latencia,
 * más coste y más riesgo de truncamiento de la respuesta.
 *
 * Estrategia de priorización: los datos del usuario (estables y semánticos)
 * tienen prioridad; el contexto de pantalla es lo primero que se recorta.
 */

/** Longitud máxima del contexto combinado que viaja al backend. */
export const MAX_CONTEXT_CHARS = 1500;

/** Sufijo que marca un recorte (visible para el LLM, no para el usuario). */
export const TRUNCATION_SUFFIX = '…[contenido recortado para optimizar respuesta]';

/**
 * Trunca un texto a `maxChars`, añadiendo el sufijo de recorte.
 * Si cabe entero, lo devuelve sin cambios.
 */
export function truncateContext(text: string, maxChars: number = MAX_CONTEXT_CHARS): string {
  if (text.length <= maxChars) return text;
  const cut = Math.max(0, maxChars - TRUNCATION_SUFFIX.length);
  return text.slice(0, cut) + TRUNCATION_SUFFIX;
}

/**
 * Combina contexto de usuario y de pantalla respetando MAX_CONTEXT_CHARS.
 * El contexto de usuario va primero y se preserva entero siempre que sea
 * posible; el de pantalla absorbe el recorte. Devuelve null si no hay nada.
 */
export function combineContexts(
  userContext: string | null,
  screenContext: string | null,
  maxChars: number = MAX_CONTEXT_CHARS,
): string | null {
  const user = userContext?.trim() || null;
  const screen = screenContext?.trim() || null;
  if (!user && !screen) return null;
  if (!screen) return truncateContext(user as string, maxChars);
  if (!user) return truncateContext(screen, maxChars);

  const separator = '\n\n';
  const budgetForScreen = maxChars - user.length - separator.length;
  if (budgetForScreen <= TRUNCATION_SUFFIX.length) {
    // Caso extremo: el contexto de usuario ya consume el presupuesto.
    return truncateContext(user, maxChars);
  }
  return user + separator + truncateContext(screen, budgetForScreen);
}
