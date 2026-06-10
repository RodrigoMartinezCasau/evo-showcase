/**
 * Puente de capacidades de app para Sprints 3+4+5: creación con prefill,
 * relaciones (follow/block), repost, sesión y búsqueda/navegación a perfiles.
 *
 * Mismo patrón que interactionBridge/configBridge: la lógica real vive en
 * React Contexts y servicios de Evo (useFollowState, BlockedUsersContext,
 * SimulationContext, supabase) que no son importables desde lógica pura.
 * useRegisterAgentApp (montado en VoiceAssistantLayer) registra funciones
 * imperativas que los handlers consumen.
 */

export interface AgentUserSearchResult {
  id: string;
  username: string;
}

export interface AgentAppBridge {
  // ── Creación con prefill (Sprint 3) ───────────────────────────────────────
  /** Navega a la pantalla de nueva reflexión con texto de partida opcional. */
  openReflectionComposer(prefill?: string): void;
  /** Navega a la pantalla de nueva frase con texto y autor opcionales. */
  openPhraseComposer(prefill?: string, author?: string): void;

  // ── Relaciones (Sprint 4) ─────────────────────────────────────────────────
  /** ¿El usuario actual sigue a userId? (estado vivo). */
  isFollowing(userId: string): boolean;
  /** ¿Hay solicitud de seguimiento pendiente hacia userId? */
  isFollowPending(userId: string): boolean;
  /**
   * Sigue / deja de seguir según el estado actual. Usa el flujo real de Evo:
   * cuentas privadas → solicitud de seguimiento en lugar de follow directo.
   */
  toggleFollow(userId: string): void;
  /** ¿userId está bloqueado por el usuario actual? */
  isBlocked(userId: string): boolean;
  /**
   * Bloquea siguiendo el flujo de moderación de Evo (deja de seguir si
   * procede + registra la señal de recomendación). False si falló.
   */
  blockUser(userId: string): Promise<boolean>;

  // ── Repost (Sprint 4) ─────────────────────────────────────────────────────
  /** ¿El usuario actual ya reposteó postId? */
  isReposted(postId: string): boolean;
  /** Republica el post en el feed del usuario. */
  repost(postId: string): void;

  // ── Sesión (Sprint 4) ─────────────────────────────────────────────────────
  /** Cierra sesión con el flujo existente de Evo (signOut + /welcome). */
  logout(): Promise<void>;

  // ── Música del feed ───────────────────────────────────────────────────────
  /**
   * Estado de la música de la publicación visible: `hasTrack` (hay pista
   * activa en el visor) y `paused` (el usuario la tiene pausada).
   */
  getFeedAudioState(): { hasTrack: boolean; paused: boolean };
  /** Pausa (true) o reanuda (false) la música del feed, como el botón del visor. */
  setFeedAudioPaused(paused: boolean): void;

  // ── Búsqueda y perfiles (Sprint 5) ────────────────────────────────────────
  /** Busca usuarios reales por username (Supabase, máx. ~30). */
  searchUsers(query: string): Promise<AgentUserSearchResult[]>;
  /** Navega al perfil de un usuario. */
  openProfile(userId: string, username?: string): void;
  /** Abre la pestaña de búsqueda, opcionalmente con query pre-rellenada. */
  openSearch(query?: string): void;
}

let bridge: AgentAppBridge | null = null;

/** Registra (o limpia con null) el puente de capacidades de la app. */
export function setAgentAppBridge(next: AgentAppBridge | null): void {
  bridge = next;
}

/** Puente actual, o null si la app todavía no lo registró. */
export function getAgentAppBridge(): AgentAppBridge | null {
  return bridge;
}
