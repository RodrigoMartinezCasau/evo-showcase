/**
 * Consentimiento explícito del asistente de voz (Apple guideline 5.1.2(i) + GDPR).
 *
 * El asistente envía a proveedores externos (OpenAI) la transcripción de voz,
 * el contenido visible de la pantalla y datos básicos de perfil. Nada de eso
 * puede salir del dispositivo hasta que el usuario consienta explícitamente.
 *
 * El consentimiento se persiste en AsyncStorage y es revocable desde Ajustes.
 */

/** Clave de almacenamiento del consentimiento (versionada por si cambia el alcance). */
export const ASSISTANT_CONSENT_STORAGE_KEY = '@evo/assistant_consent_v1';

/** Subconjunto de AsyncStorage que usamos — inyectable para tests. */
export interface ConsentStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let defaultStorage: ConsentStorage | null = null;

/** AsyncStorage real, resuelto en perezoso para no romper en entornos sin nativo. */
function getDefaultStorage(): ConsentStorage {
  if (!defaultStorage) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    defaultStorage = require('@react-native-async-storage/async-storage')
      .default as ConsentStorage;
  }
  return defaultStorage;
}

/**
 * ¿El usuario ha aceptado el consentimiento del asistente?
 * Ante cualquier error de storage devuelve false (fail-closed: sin
 * consentimiento confirmado, no se envía nada).
 */
export async function hasConsentedToAssistant(storage?: ConsentStorage): Promise<boolean> {
  try {
    const raw = await (storage ?? getDefaultStorage()).getItem(ASSISTANT_CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { granted?: boolean };
    return parsed.granted === true;
  } catch {
    return false;
  }
}

/** Guarda el consentimiento con timestamp (auditable). */
export async function grantAssistantConsent(storage?: ConsentStorage): Promise<void> {
  const payload = JSON.stringify({ granted: true, grantedAt: new Date().toISOString() });
  await (storage ?? getDefaultStorage()).setItem(ASSISTANT_CONSENT_STORAGE_KEY, payload);
}

/** Revoca el consentimiento (desde Ajustes). El próximo uso volverá a pedirlo. */
export async function revokeAssistantConsent(storage?: ConsentStorage): Promise<void> {
  await (storage ?? getDefaultStorage()).removeItem(ASSISTANT_CONSENT_STORAGE_KEY);
}
