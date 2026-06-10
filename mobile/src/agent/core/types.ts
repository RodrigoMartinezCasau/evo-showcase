/**
 * Tipos del núcleo del agente (independientes de Evo).
 * Cualquier app integrada solo necesita estos tipos + su AppManifest.
 */

/** Acción que el backend pide ejecutar en el cliente. */
export interface AgentAction {
  type: 'navigate' | 'execute' | 'none';
  /** Intent del manifest (obligatorio para navigate/execute). */
  intent?: string;
  parameters?: Record<string, unknown>;
  /**
   * Confirmación ligera (v2 Sprint 2). Informativo: el cliente NUNCA se fía
   * solo de esto — la fuente de verdad es requireConfirmation del manifest.
   */
  requireConfirmation?: boolean;
  confirmationMessage?: string;
}

/** Respuesta completa del backend del agente. */
export interface AgentTurnResponse {
  reply: string;
  /** MP3 en base64 (TTS); puede faltar si la síntesis falló. */
  audio_base64?: string | null;
  action?: AgentAction | null;
}

/** Resultado de ejecutar una acción en el cliente. */
export interface ActionResult {
  success: boolean;
  /** Error técnico (logs/telemetría), no para el usuario. */
  error?: string;
  /** Mensaje hablado para el usuario (idempotencia, contexto faltante, error). */
  message?: string;
  /** Datos del resultado (p. ej. post_id afectado). */
  data?: Record<string, unknown>;
  /** True si no se ejecutó porque la acción ya estaba aplicada. */
  idempotent?: boolean;
}

/**
 * Contexto estructurado de pantalla en el momento de la invocación.
 * Snapshot inmutable: las acciones type 'execute' operan sobre lo que el
 * usuario veía al hablar, no sobre lo que haya en pantalla al ejecutarse.
 */
export interface AgentScreenContext {
  /** Presente si la pantalla actual es un feed con publicaciones visibles. */
  feed?: import('./feedContext').FeedScreenContext;
}

const VALID_ACTION_TYPES = new Set<AgentAction['type']>(['navigate', 'execute', 'none']);

/**
 * Valida y normaliza la acción cruda que llega del backend.
 * Si el JSON del LLM viene malformado, devolvemos null y el turno
 * degrada a "solo respuesta hablada" (nunca ejecutar basura).
 */
export function parseAgentAction(raw: unknown): AgentAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  if (typeof type !== 'string' || !VALID_ACTION_TYPES.has(type as AgentAction['type'])) {
    return null;
  }
  if (type === 'none') return { type: 'none' };

  const intent = typeof obj.intent === 'string' ? obj.intent.trim() : '';
  if (!intent) return null;

  return {
    type: type as AgentAction['type'],
    intent,
    parameters:
      obj.parameters && typeof obj.parameters === 'object'
        ? (obj.parameters as Record<string, unknown>)
        : undefined,
    requireConfirmation: obj.requireConfirmation === true ? true : undefined,
    confirmationMessage:
      typeof obj.confirmationMessage === 'string' && obj.confirmationMessage.trim()
        ? obj.confirmationMessage.trim()
        : undefined,
  };
}
