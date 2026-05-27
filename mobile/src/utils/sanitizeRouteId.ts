/**
 * Limpia un `id` recibido por route param o deep link.
 *
 * Motivación: cuando un mensaje de share enviado vía WhatsApp/iMessage tiene
 * la URL al principio seguida de texto descriptivo, algunos parsers tratan
 * todo hasta el primer espacio real como una sola URL — incluyendo `\n`
 * codificados como `%0A`. El resultado es que el deep link entrante
 * `/profile/UUID%0A%0AMira%20el...` llega a la pantalla con
 * `id = "UUID\n\nMira el perfil de @X en EVO"`.
 *
 * Si esa cadena se pasa tal cual a Supabase, PostgREST devuelve
 * `invalid input syntax for type uuid` (visto en los logs durante el pico de
 * usuarios) y la query se reintenta, consumiendo conexiones del pool.
 *
 * Esta función toma el primer tramo continuo de caracteres válidos para un
 * id (letras, dígitos, guion y guion bajo) y descarta todo lo demás. Sirve
 * tanto para UUIDs reales (alfanuméricos + `-`) como para ids de simulación
 * (`u1`-`u9`, `p1`, etc.).
 */
export function sanitizeRouteId(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // raw ya está decodificado o tiene un % incorrecto: usar tal cual.
  }
  const match = decoded.match(/^[A-Za-z0-9_-]+/);
  if (!match) return undefined;
  const cleaned = match[0];
  if (cleaned.length === 0) return undefined;
  return cleaned;
}
