/**
 * Instrumentación del agente — tabla `agent_usage_events` en Supabase.
 * Fire-and-forget: nunca bloquea el flujo de voz ni rompe si la tabla
 * todavía no existe (ver supabase_agent_usage_events.sql en la raíz).
 */
import { supabase } from '../../../mobile/lib/supabase';
import { isRealUserId } from '@evoconn/services/supabaseSocial';

export type AgentEventType =
  | 'agent_invoked'
  | 'agent_response_received'
  | 'navigation_executed'
  | 'navigation_failed'
  | 'question_only'
  | 'agent_timeout'
  | 'agent_stt_empty'
  | 'agent_stt_failed'
  /** El watchdog liberó una fase 'thinking' colgada (STT sin respuesta u otro path). */
  | 'agent_watchdog_reset'
  /** El usuario aceptó el consentimiento del asistente (primer uso). */
  | 'agent_consent_granted'
  /** El usuario rechazó el consentimiento — no se inició el STT. */
  | 'agent_consent_declined'
  /** Acción type 'execute' ejecutada con éxito (like, guardar…). */
  | 'action_executed'
  /** Acción type 'execute' falló (handler, contexto o puente). */
  | 'action_failed'
  /** Acción no ejecutada porque ya estaba aplicada (idempotencia). */
  | 'action_idempotent'
  /** El usuario canceló una acción en el modal de confirmación (Sprint 2). */
  | 'action_cancelled';

export interface AgentEventParams {
  eventType: AgentEventType;
  userMessage?: string;
  intentDetected?: string | null;
  actionExecuted?: Record<string, unknown> | null;
  currentRoute?: string | null;
  /** Latencia del request HTTP completo (LLM + TTS). */
  latencyMs?: number | null;
  /** Latencia del STT: desde que el usuario para de hablar hasta tener el texto. */
  latencySttMs?: number | null;
  /** Latencia de ejecutar la acción (navegación) tras recibir la respuesta. */
  latencyActionMs?: number | null;
  /** True si el LLM truncó la respuesta por max_tokens. */
  wasTruncated?: boolean;
  /** Longitud final (chars) del contexto enviado al LLM — calibra MAX_CONTEXT_CHARS. */
  contextChars?: number | null;
  /** Tipos de datos sensibles redactados del contexto (nunca los valores). */
  redactionsApplied?: string[] | null;
}

/** Registra un evento de uso del agente. Silencioso ante cualquier error. */
export async function logAgentEvent(params: AgentEventParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !isRealUserId(user.id)) return;

    const { error } = await supabase.from('agent_usage_events').insert({
      user_id: user.id,
      event_type: params.eventType,
      user_message: params.userMessage ?? null,
      intent_detected: params.intentDetected ?? null,
      action_executed: params.actionExecuted ?? null,
      current_route: params.currentRoute ?? null,
      latency_ms: params.latencyMs ?? null,
      latency_stt_ms: params.latencySttMs ?? null,
      latency_action_ms: params.latencyActionMs ?? null,
      was_truncated: params.wasTruncated ?? false,
      context_chars: params.contextChars ?? null,
      redactions_applied: params.redactionsApplied?.length ? params.redactionsApplied : null,
    });
    if (error && __DEV__) {
      console.warn('[AgentAnalytics] logAgentEvent:', error.message);
    }
  } catch {
    /* nunca interrumpir el flujo del asistente por analytics */
  }
}
