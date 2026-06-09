/**
 * API FastAPI pública en Railway — misma que reflexiones, debates y clasificación.
 * Fallback cuando EXPO_PUBLIC_API_URL no está en el bundle (p. ej. Expo Go sin .env).
 * Los builds EAS production ya inyectan EXPO_PUBLIC_API_URL vía eas env.
 */
export const EVO_PRODUCTION_API_URL = 'https://YOUR_API_URL';
