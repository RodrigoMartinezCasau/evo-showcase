/**
 * Puente entre los handlers del agente y el estado de interacciones de Evo.
 *
 * Los votos y guardados de Evo viven en contextos de React (useFeedStore,
 * usePersonalProfile), que no pueden usarse fuera de componentes. Este puente
 * recibe funciones imperativas registradas en runtime por
 * useRegisterAgentInteractions (montado en VoiceAssistantLayer) y se las
 * presta a los handlers. Mismo patrón de "glue específico de la app" que el
 * manifest: el core del agente no conoce APIs internas de Evo.
 */

export interface AgentInteractionBridge {
  /** Voto actual del usuario en el post ('up' | 'down' | null). */
  getMyVote(postId: string): 'up' | 'down' | null;
  /** Cambia el voto del usuario (mismo flujo que el corazón de la UI). */
  setVote(postId: string, to: 'up' | 'down' | null): void;
  /** ¿El post está en guardados del usuario? */
  isSaved(postId: string): boolean;
  /** Guarda el post. False si el post ya no existe en el store. */
  savePost(postId: string): boolean;
  /** Quita el post de guardados. */
  unsavePost(postId: string): void;
}

let bridge: AgentInteractionBridge | null = null;

/** Registra (o limpia con null) el puente de interacciones de la app. */
export function setAgentInteractionBridge(next: AgentInteractionBridge | null): void {
  bridge = next;
}

/** Puente actual, o null si la app todavía no lo registró. */
export function getAgentInteractionBridge(): AgentInteractionBridge | null {
  return bridge;
}
