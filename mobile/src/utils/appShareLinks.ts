/**
 * Enlaces para compartir perfil / publicación.
 * - Web HTTPS: previews en WhatsApp / iMessage y fallback en navegador.
 * - Esquema `evo://`: abre la app si está instalada (expo-router `profile/[id]`).
 */
import * as Linking from 'expo-linking';

/** Coincide con `"scheme": "evo"` en mobile/app.json */
const APP_SCHEME = 'evo';

/** Dominio público (redirección / universal links en producción). */
export const PUBLIC_WEB_ORIGIN = 'https://www.evoconn.com';

/**
 * URL web del perfil — usar en mensajes compartidos para previews y usuarios sin app.
 * Requiere en el servidor: página `/profile/:id` + apple-app-site-association si quieres abrir la app directo.
 */
export function getPublicProfileWebUrl(userId: string): string {
  const id = encodeURIComponent(userId);
  return `${PUBLIC_WEB_ORIGIN}/profile/${id}`;
}

/**
 * Deep link nativo: abre la pantalla de perfil `/profile/[id]` (expo-router).
 */
export function getAppProfileOpenUrl(userId: string): string {
  const id = encodeURIComponent(userId);
  return Linking.createURL(`profile/${id}`, { scheme: APP_SCHEME });
}

/** Mensaje + enlaces recomendados al compartir un perfil.
 *
 * IMPORTANTE: la URL va al FINAL. Si va al principio y luego se concatenan
 * `\n\n` + texto descriptivo, parsers permisivos (algunos clientes de chat
 * Android) tratan el bloque entero como una sola URL hasta el primer espacio
 * real, así que el deep link entrante llega como
 * `/profile/UUID%0A%0AMira%20el%20perfil...` y la pantalla pasa esa cadena
 * a Supabase como UUID → `invalid input syntax for type uuid` en BD.
 */
export function buildProfileShareMessage(username: string, userId: string): string {
  const web = getPublicProfileWebUrl(userId);
  const cleanName = username.startsWith('@') ? username : `@${username}`;
  return `Mira el perfil de ${cleanName} en EVO\n\n${web}`;
}

/** URL web de una publicación (clicable en WhatsApp / iMessage). */
export function getPublicPostWebUrl(postId: string): string {
  const id = encodeURIComponent(postId);
  return `${PUBLIC_WEB_ORIGIN}/post/${id}`;
}

/**
 * Deep link nativo: abre `/post/[id]`.
 */
export function getAppPostOpenUrl(postId: string): string {
  const id = encodeURIComponent(postId);
  return Linking.createURL(`post/${id}`, { scheme: APP_SCHEME });
}

/** Mensaje al compartir una publicación. La URL va al FINAL para evitar
 * que el texto descriptivo contamine el deep link entrante (mismo motivo
 * que `buildProfileShareMessage` — ver comentario allí). */
export function buildPostShareMessage(
  authorUsername: string,
  preview: string,
  postId: string,
): string {
  const web = getPublicPostWebUrl(postId);
  const author = authorUsername.startsWith('@') ? authorUsername : `@${authorUsername}`;
  return `${author}: «${preview}»\n\n${web}`;
}
