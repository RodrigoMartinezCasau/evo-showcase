/**
 * Registro de aperturas de UI por publicación (Sprint 3/4).
 *
 * El composer de comentarios y el selector de motivos de denuncia viven como
 * estado interno de cada tarjeta de publicación (ReflectionDetailItem), no
 * como rutas. Cada tarjeta montada registra aquí cómo abrir su UI; los
 * handlers del agente buscan al post objetivo por id. Si el post visible no
 * está registrado (modo preview), la acción degrada con mensaje claro.
 */

export interface AgentPostUiHandlers {
  /** Abre el composer de comentarios del post con texto inicial. */
  openCommentComposer(initialText: string): void;
  /** Abre el selector de motivos de denuncia del post (la denuncia la decide el usuario). */
  openReportPicker(): void;
}

const registry = new Map<string, AgentPostUiHandlers>();

/** Registra la UI de un post montado. Devuelve la función de limpieza. */
export function registerAgentPostUi(postId: string, handlers: AgentPostUiHandlers): () => void {
  registry.set(postId, handlers);
  return () => {
    if (registry.get(postId) === handlers) registry.delete(postId);
  };
}

/** Handlers de UI del post, o null si esa tarjeta no está montada/registrada. */
export function getAgentPostUi(postId: string): AgentPostUiHandlers | null {
  return registry.get(postId) ?? null;
}
