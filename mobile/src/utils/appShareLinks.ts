/**
 * Enlaces para compartir que abren la app EVO (esquema `evo` en app.json),
 * en lugar de la web, para que WhatsApp / email / etc. lancen el cliente instalado.
 */
import * as Linking from 'expo-linking';

/** Coincide con `"scheme": "evo"` en mobile/app.json */
const APP_SCHEME = 'evo';

/**
 * Abre la pantalla de perfil `/profile/[id]` (expo-router).
 */
export function getAppProfileOpenUrl(userId: string): string {
  const id = encodeURIComponent(userId);
  return Linking.createURL(`profile/${id}`, { scheme: APP_SCHEME });
}

/**
 * Abre la publicación `/post/[id]`.
 */
export function getAppPostOpenUrl(postId: string): string {
  const id = encodeURIComponent(postId);
  return Linking.createURL(`post/${id}`, { scheme: APP_SCHEME });
}
