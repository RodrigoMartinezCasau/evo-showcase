/**
 * Handlers de relaciones sobre el perfil visible (Sprint 4).
 *
 * Operan sobre el snapshot de perfil capturado al invocar el turno
 * (context.profile), pero las comprobaciones de estado (¿ya lo sigo?) usan
 * el estado VIVO vía puente, igual que en Sprint 1. El flujo de cuentas
 * privadas (solicitud en vez de follow directo) lo resuelve el puente
 * reutilizando toggleFollow de Evo — el agente nunca se lo salta.
 */
import type { ActionResult, AgentScreenContext } from '../../core/types';
import { getTargetProfile } from '../../core/profileContext';
import { getAgentAppBridge } from '../appBridge';

const NO_BRIDGE: ActionResult = {
  success: false,
  error: 'AgentAppBridge not registered',
  message: 'No he podido hacerlo. Inténtalo de nuevo.',
};

const NO_PROFILE: ActionResult = {
  success: false,
  error: 'No visible profile in context',
  message: 'Para hacer eso necesito que estés viendo el perfil de ese usuario.',
};

/** R1: seguir al usuario del perfil visible (o enviar solicitud si es privado). */
export async function followVisibleProfileHandler(
  _params: Record<string, unknown>,
  context: AgentScreenContext,
): Promise<ActionResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) return NO_BRIDGE;
  const profile = getTargetProfile(context.profile);
  if (!profile) return NO_PROFILE;

  const username = profile.profile_username;
  if (bridge.isFollowing(profile.profile_id)) {
    return { success: true, idempotent: true, message: `Ya sigues a ${username}.` };
  }
  if (bridge.isFollowPending(profile.profile_id)) {
    return {
      success: true,
      idempotent: true,
      message: `Ya enviaste una solicitud de seguimiento a ${username}.`,
    };
  }
  try {
    const isPrivate = profile.profile_is_private === true;
    bridge.toggleFollow(profile.profile_id);
    return {
      success: true,
      message: isPrivate
        ? `He enviado la solicitud de seguimiento a ${username}.`
        : `Listo, ahora sigues a ${username}.`,
      data: { profile_id: profile.profile_id },
    };
  } catch (e) {
    return {
      success: false,
      error: `toggleFollow failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: `No he podido seguir a ${username}. Inténtalo de nuevo.`,
    };
  }
}

/** R2: dejar de seguir al usuario del perfil visible (requiere confirmación). */
export async function unfollowVisibleProfileHandler(
  _params: Record<string, unknown>,
  context: AgentScreenContext,
): Promise<ActionResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) return NO_BRIDGE;
  const profile = getTargetProfile(context.profile);
  if (!profile) return NO_PROFILE;

  const username = profile.profile_username;
  if (bridge.isFollowPending(profile.profile_id)) {
    try {
      bridge.toggleFollow(profile.profile_id); // cancela la solicitud pendiente
      return {
        success: true,
        message: `He cancelado tu solicitud de seguimiento a ${username}.`,
      };
    } catch (e) {
      return {
        success: false,
        error: `cancel follow request failed: ${e instanceof Error ? e.message : 'unknown'}`,
        message: `No he podido hacerlo. Inténtalo de nuevo.`,
      };
    }
  }
  if (!bridge.isFollowing(profile.profile_id)) {
    return { success: true, idempotent: true, message: `No seguías a ${username}.` };
  }
  try {
    bridge.toggleFollow(profile.profile_id);
    return {
      success: true,
      message: `Has dejado de seguir a ${username}.`,
      data: { profile_id: profile.profile_id },
    };
  } catch (e) {
    return {
      success: false,
      error: `toggleFollow failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: `No he podido dejar de seguir a ${username}. Inténtalo de nuevo.`,
    };
  }
}

/** R3: bloquear al usuario del perfil visible (doble confirmación previa). */
export async function blockVisibleProfileHandler(
  _params: Record<string, unknown>,
  context: AgentScreenContext,
): Promise<ActionResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) return NO_BRIDGE;
  const profile = getTargetProfile(context.profile);
  if (!profile) return NO_PROFILE;

  const username = profile.profile_username;
  if (bridge.isBlocked(profile.profile_id)) {
    return { success: true, idempotent: true, message: `Ya tenías bloqueado a ${username}.` };
  }
  try {
    const ok = await bridge.blockUser(profile.profile_id);
    if (!ok) {
      return {
        success: false,
        error: 'blockUser returned false',
        message: `No he podido bloquear a ${username}. Inténtalo de nuevo.`,
      };
    }
    return {
      success: true,
      message: `He bloqueado a ${username}. Ya no podréis interactuar.`,
      data: { profile_id: profile.profile_id },
    };
  } catch (e) {
    return {
      success: false,
      error: `blockUser failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: `No he podido bloquear a ${username}. Inténtalo de nuevo.`,
    };
  }
}
