/**
 * Handler de cierre de sesión (Sprint 4). Solo se llega aquí tras la
 * confirmación (voz o modal) que exige el manifest; usa el flujo existente
 * de Evo (signOut + redirección a /welcome) vía puente.
 */
import type { ActionResult } from '../../core/types';
import { getAgentAppBridge } from '../appBridge';

export async function logoutHandler(): Promise<ActionResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) {
    return {
      success: false,
      error: 'AgentAppBridge not registered',
      message: 'No he podido cerrar la sesión. Inténtalo de nuevo.',
    };
  }
  try {
    await bridge.logout();
    // Tras el signOut la capa del asistente se desmonta: el mensaje puede no
    // llegar a hablarse, pero queda en telemetría.
    return { success: true, message: 'Sesión cerrada.' };
  } catch (e) {
    return {
      success: false,
      error: `logout failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido cerrar la sesión. Inténtalo de nuevo.',
    };
  }
}
