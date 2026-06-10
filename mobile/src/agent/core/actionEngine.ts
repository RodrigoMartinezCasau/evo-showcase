/**
 * Motor de acciones type 'execute' (v2 Sprint 1).
 *
 * Pipeline: manifest lookup → validación de contexto → idempotencia → handler.
 * Lógica pura (recibe registros y manifest por parámetro): testeable sin
 * React Native y reutilizable por cualquier app cliente del SDK.
 */
import type { ActionIntent } from '../manifest/types';
import type { ActionResult, AgentAction, AgentScreenContext } from './types';

export interface ActionRegistries {
  handlers: Record<
    string,
    (params: Record<string, unknown>, context: AgentScreenContext) => Promise<ActionResult>
  >;
  idempotencyCheckers: Record<
    string,
    (context: AgentScreenContext) => Promise<{ alreadyApplied: boolean; message?: string }>
  >;
}

/** Valida los contextRequirements de la acción contra el contexto actual. */
export function validateActionContext(
  actionConfig: ActionIntent,
  context: AgentScreenContext,
): { ok: true } | { ok: false; reason: string; userMessage: string } {
  const reqs = actionConfig.contextRequirements;
  if (!reqs) return { ok: true };

  if (reqs.requiresVisiblePost) {
    const hasVisiblePost = (context.feed?.visiblePosts.length ?? 0) > 0;
    if (!hasVisiblePost) {
      return {
        ok: false,
        reason: 'No visible post in context',
        userMessage: 'Para hacer eso necesito que estés viendo una publicación.',
      };
    }
  }

  // requiresAuth: en Evo el orbe solo existe con sesión iniciada
  // (VoiceAssistantLayer exige session), así que se cumple por construcción.
  // En el SDK multi-app este check consultará al host.

  return { ok: true };
}

/**
 * Ejecuta una acción 'execute' validada por parseAgentAction.
 * Nunca lanza: cualquier fallo degrada a ActionResult con error + message.
 */
export async function runManifestAction(
  action: AgentAction,
  manifestActions: ActionIntent[],
  context: AgentScreenContext,
  registries: ActionRegistries,
): Promise<ActionResult> {
  const intent = action.intent?.trim();
  if (!intent) {
    return { success: false, error: 'No intent specified' };
  }

  const actionConfig = manifestActions.find((a) => a.intent === intent);
  if (!actionConfig) {
    return { success: false, error: `Unknown action intent: ${intent}` };
  }

  const contextValidation = validateActionContext(actionConfig, context);
  if (!contextValidation.ok) {
    return {
      success: false,
      error: contextValidation.reason,
      message: contextValidation.userMessage,
    };
  }

  if (actionConfig.idempotencyCheck) {
    const checker = registries.idempotencyCheckers[actionConfig.idempotencyCheck];
    if (checker) {
      try {
        const result = await checker(context);
        if (result.alreadyApplied) {
          return { success: true, idempotent: true, message: result.message };
        }
      } catch {
        // Un checker roto no debe bloquear la acción: se ejecuta igualmente
        // (los handlers de este sprint son reversibles).
      }
    }
  }

  const handler = registries.handlers[actionConfig.handler];
  if (!handler) {
    return { success: false, error: `Handler not found: ${actionConfig.handler}` };
  }
  try {
    return await handler(action.parameters ?? {}, context);
  } catch (e) {
    return {
      success: false,
      error: `Handler failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido hacerlo. Inténtalo de nuevo.',
    };
  }
}
