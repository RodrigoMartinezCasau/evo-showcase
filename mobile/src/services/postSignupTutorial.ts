import AsyncStorage from '@react-native-async-storage/async-storage';

/** Pasa a `true` cuando el nuevo tutorial visual (imágenes + texto) esté listo. */
export const POST_SIGNUP_TUTORIAL_ENABLED = false;

const PENDING_KEY = '@evo/post_signup_tutorial_pending';

function doneKey(userId: string): string {
  return `@evo/post_signup_tutorial_done_v1/${userId}`;
}

/** Tras crear cuenta (no inicio de sesión): mostrar tutorial cuando termine la animación de entrada. */
export async function markPostSignupTutorialPending(): Promise<void> {
  if (!POST_SIGNUP_TUTORIAL_ENABLED) return;
  await AsyncStorage.setItem(PENDING_KEY, '1');
}

export async function clearPostSignupTutorialPending(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}

export async function isPostSignupTutorialPending(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PENDING_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function hasCompletedPostSignupTutorial(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    return (await AsyncStorage.getItem(doneKey(userId))) === '1';
  } catch {
    return false;
  }
}

export async function markPostSignupTutorialCompleted(userId: string): Promise<void> {
  if (!userId) return;
  await AsyncStorage.setItem(doneKey(userId), '1');
  await clearPostSignupTutorialPending();
}

/**
 * OAuth en pantalla de registro: si el usuario ya existía hace tiempo, no marcar tutorial.
 * Cuentas creadas hace poco se tratan como alta nueva (registro típico con Google/Apple).
 */
export function isLikelyBrandNewAuthUser(
  createdAtIso: string | undefined,
  windowMs = 25 * 60 * 1000,
): boolean {
  if (!createdAtIso) return false;
  const t = new Date(createdAtIso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= windowMs;
}

