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
    (
      params: Record<string, unknown>,
      context: AgentScreenContext,
      intent?: string,
    ) => Promise<ActionResult>
  >;
  idempotencyCheckers: Record<
    string,
    (context: AgentScreenContext) => Promise<{ alreadyApplied: boolean; message?: string }>
  >;
}

/** Resultado del precheck de una acción (antes de confirmar/ejecutar). */
export type ActionPrecheck =
  | { kind: 'ready'; actionConfig: ActionIntent }
  | { kind: 'done'; result: ActionResult };

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

  if (reqs.requiresVisibleProfile) {
    const profile = context.profile;
    if (!profile?.profile_id?.trim()) {
      return {
        ok: false,
        reason: 'No visible profile in context',
        userMessage: 'Para hacer eso necesito que estés viendo el perfil de ese usuario.',
      };
    }
    if (profile.profile_is_own) {
      return {
        ok: false,
        reason: 'Visible profile is own profile',
        userMessage: 'Esa acción no se puede hacer sobre tu propio perfil.',
      };
    }
  }

  // requiresAuth: en Evo el orbe solo existe con sesión iniciada
  // (VoiceAssistantLayer exige session), así que se cumple por construcción.
  // En el SDK multi-app este check consultará al host.

  return { ok: true };
}

/**
 * Fase previa a ejecutar (y a pedir confirmación): manifest lookup →
 * validación de contexto → idempotencia. Si devuelve 'done', el turno
 * termina con ese resultado SIN pedir confirmación ni llamar al handler
 * (p. ej. "haz mi cuenta privada" cuando ya es privada → mensaje directo,
 * sin molestar con el modal).
 */
export async function precheckManifestAction(
  action: AgentAction,
  manifestActions: ActionIntent[],
  context: AgentScreenContext,
  registries: ActionRegistries,
): Promise<ActionPrecheck> {
  const intent = action.intent?.trim();
  if (!intent) {
    return { kind: 'done', result: { success: false, error: 'No intent specified' } };
  }

  const actionConfig = manifestActions.find((a) => a.intent === intent);
  if (!actionConfig) {
    return {
      kind: 'done',
      result: { success: false, error: `Unknown action intent: ${intent}` },
    };
  }

  const contextValidation = validateActionContext(actionConfig, context);
  if (!contextValidation.ok) {
    return {
      kind: 'done',
      result: {
        success: false,
        error: contextValidation.reason,
        message: contextValidation.userMessage,
      },
    };
  }

  if (actionConfig.idempotencyCheck) {
    const checker = registries.idempotencyCheckers[actionConfig.idempotencyCheck];
    if (checker) {
      try {
        const result = await checker(context);
        if (result.alreadyApplied) {
          return {
            kind: 'done',
            result: { success: true, idempotent: true, message: result.message },
          };
        }
      } catch {
        // Un checker roto no debe bloquear la acción: se ejecuta igualmente
        // (las acciones declaradas hasta ahora son reversibles).
      }
    }
  }

  return { kind: 'ready', actionConfig };
}

/**
 * Ejecuta una acción 'execute' validada por parseAgentAction.
 * Nunca lanza: cualquier fallo degrada a ActionResult con error + message.
 * El intent viaja como tercer argumento del handler para que los handlers
 * compartidos (setAccountPrivacy, toggleNotifications) deriven el valor del
 * intent declarado y no dependan de parámetros generados por el LLM.
 */
export async function runManifestAction(
  action: AgentAction,
  manifestActions: ActionIntent[],
  context: AgentScreenContext,
  registries: ActionRegistries,
): Promise<ActionResult> {
  const pre = await precheckManifestAction(action, manifestActions, context, registries);
  if (pre.kind === 'done') return pre.result;

  const { actionConfig } = pre;
  const handler = registries.handlers[actionConfig.handler];
  if (!handler) {
    return { success: false, error: `Handler not found: ${actionConfig.handler}` };
  }
  try {
    return await handler(action.parameters ?? {}, context, actionConfig.intent);
  } catch (e) {
    return {
      success: false,
      error: `Handler failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido hacerlo. Inténtalo de nuevo.',
    };
  }
}
