/**
 * Contexto del perfil visible (Sprint 5).
 *
 * Igual que feedContext: la pantalla de perfil mapea sus datos a
 * `VisibleProfile` y las acciones de relación (follow/unfollow/block) operan
 * sobre este snapshot capturado al invocar el turno. Los flags de estado
 * (is_following, is_blocked…) son informativos para el LLM; la idempotencia
 * real se comprueba contra el estado vivo vía puente, como en Sprint 1.
 */

/** Perfil de usuario visible en pantalla, normalizado para el agente. */
export interface VisibleProfile {
  profile_id: string;
  profile_username: string;
  /** True si es el perfil del propio usuario (las acciones de relación lo excluyen). */
  profile_is_own: boolean;
  profile_is_private?: boolean;
  profile_is_following?: boolean;
  profile_is_follow_pending?: boolean;
  profile_is_blocked?: boolean;
}

/**
 * Perfil objetivo de una acción de relación: el visible, siempre que no sea
 * el propio. Null si no hay perfil ajeno en pantalla.
 */
export function getTargetProfile(
  profile: VisibleProfile | undefined | null,
): VisibleProfile | null {
  if (!profile || profile.profile_is_own) return null;
  if (!profile.profile_id?.trim()) return null;
  return profile;
}
