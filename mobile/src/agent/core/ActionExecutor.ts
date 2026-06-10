/**
 * ActionExecutor — único punto del cliente que ejecuta acciones del agente.
 *
 * Reglas:
 *  - Solo ejecuta intents declarados en el manifest (nunca rutas libres del LLM).
 *  - 'BACK' usa router.back(); el resto router.push().
 *  - Las rutas con query string ('/(tabs)?tab=para-ti') se convierten a
 *    { pathname, params } para que useLocalSearchParams las reciba.
 */
import { router } from 'expo-router';

import { evoManifest } from '../manifest/evo.manifest';
import { ACTION_HANDLERS, IDEMPOTENCY_CHECKERS } from '../handlers';
import { runManifestAction } from './actionEngine';
import type { AgentAction, AgentScreenContext, ActionResult } from './types';

function parseRouteToHref(route: string): { pathname: string; params: Record<string, string> } {
  const [pathname, query = ''] = route.split('?');
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return { pathname, params };
}

export const ActionExecutor = {
  /**
   * Ejecuta una acción ya validada por parseAgentAction.
   * `context` es el snapshot estructurado de pantalla en el momento de la
   * invocación (obligatorio para acciones type 'execute' sobre posts).
   */
  async execute(action: AgentAction, context: AgentScreenContext = {}): Promise<ActionResult> {
    if (!action || action.type === 'none') {
      return { success: true };
    }
    if (action.type === 'navigate') {
      return ActionExecutor.executeNavigation(action);
    }
    if (action.type === 'execute') {
      return runManifestAction(action, evoManifest.actions, context, {
        handlers: ACTION_HANDLERS,
        idempotencyCheckers: IDEMPOTENCY_CHECKERS,
      });
    }
    return { success: false, error: `Action type not implemented: ${action.type}` };
  },

  executeNavigation(action: AgentAction): ActionResult {
    const intent = action.intent?.trim();
    if (!intent) {
      return { success: false, error: 'No intent specified' };
    }

    const routeConfig = evoManifest.routes.find((r) => r.intent === intent);
    if (!routeConfig) {
      return { success: false, error: `Unknown intent: ${intent}` };
    }

    try {
      if (routeConfig.route === 'BACK') {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.navigate('/(tabs)' as never);
        }
        return { success: true };
      }

      const { pathname, params } = parseRouteToHref(routeConfig.route);
      if (Object.keys(params).length > 0) {
        router.navigate({ pathname, params } as never);
      } else {
        router.push(pathname as never);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Navigation failed: ${error instanceof Error ? error.message : 'unknown'}`,
      };
    }
  },
};
