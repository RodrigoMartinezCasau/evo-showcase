/**
 * Handler compartido de notificaciones (v2 Sprint 2, sin confirmación):
 * enable_notifications y disable_notifications.
 *
 * SEGURIDAD: igual que setAccountPrivacy, el valor se deriva del INTENT del
 * manifest, no del parámetro del LLM.
 *
 * Al activar se garantiza primero el permiso del sistema (iOS/Android): si el
 * usuario lo tiene denegado, se le indica que debe permitirlo en los ajustes
 * del teléfono. En entornos sin módulo de notificaciones (Expo Go) se aplica
 * solo la preferencia local, que igualmente gobierna las notificaciones de Evo.
 */
import type { ActionResult, AgentScreenContext } from '../../core/types';
import { getAgentConfigBridge } from '../configBridge';

/** Deriva el objetivo: intent primero, parámetro como fallback. */
function resolveTargetEnabled(
  params: Record<string, unknown>,
  intent: string | undefined,
): boolean | null {
  if (intent === 'enable_notifications') return true;
  if (intent === 'disable_notifications') return false;
  if (typeof params.enabled === 'boolean') return params.enabled;
  return null;
}

/** Activa/desactiva las notificaciones de Evo. */
export async function toggleNotificationsHandler(
  params: Record<string, unknown>,
  _context: AgentScreenContext,
  intent?: string,
): Promise<ActionResult> {
  const enabled = resolveTargetEnabled(params, intent);
  if (enabled === null) {
    return {
      success: false,
      error: 'Cannot resolve target enabled from intent/params',
      message: 'No he entendido si quieres activar o desactivar las notificaciones.',
    };
  }

  const bridge = getAgentConfigBridge();
  if (!bridge) {
    return {
      success: false,
      error: 'Config bridge not registered',
      message: 'No puedo hacer eso ahora mismo. Inténtalo de nuevo.',
    };
  }

  try {
    if (enabled) {
      const permission = await bridge.ensureNotificationsSystemPermission();
      if (permission === 'denied') {
        return {
          success: false,
          error: 'No system notification permission',
          message: 'Necesitas permitir notificaciones en los ajustes de tu teléfono primero.',
        };
      }
    }

    await bridge.setNotificationsEnabled(enabled);
    return {
      success: true,
      message: enabled ? 'Notificaciones activadas.' : 'Notificaciones desactivadas.',
      data: { enabled },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to toggle notifications',
      message: 'No he podido cambiar las notificaciones. Inténtalo de nuevo.',
    };
  }
}
