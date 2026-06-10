/**
 * Handler compartido de privacidad de cuenta (v2 Sprint 2):
 * make_account_public y make_account_private (requieren confirmación por modal).
 *
 * SEGURIDAD: el valor de isPrivate se deriva del INTENT declarado en el
 * manifest, nunca del parámetro generado por el LLM. Si el LLM devolviera
 * intent 'make_account_public' con parameters {isPrivate: true}, ganaría el
 * intent. El parámetro solo se usa como último recurso si faltara el intent.
 */
import type { ActionResult, AgentScreenContext } from '../../core/types';
import { getAgentConfigBridge } from '../configBridge';

/** Deriva el objetivo de privacidad: intent primero, parámetro como fallback. */
function resolveTargetPrivacy(
  params: Record<string, unknown>,
  intent: string | undefined,
): boolean | null {
  if (intent === 'make_account_private') return true;
  if (intent === 'make_account_public') return false;
  if (typeof params.isPrivate === 'boolean') return params.isPrivate;
  return null;
}

/** Cambia is_private del perfil del usuario (vía servicio existente de Evo). */
export async function setAccountPrivacyHandler(
  params: Record<string, unknown>,
  _context: AgentScreenContext,
  intent?: string,
): Promise<ActionResult> {
  const isPrivate = resolveTargetPrivacy(params, intent);
  if (isPrivate === null) {
    return {
      success: false,
      error: 'Cannot resolve target privacy from intent/params',
      message: 'No he entendido si quieres la cuenta pública o privada.',
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
    const ok = await bridge.setAccountPrivacy(isPrivate);
    if (!ok) {
      return {
        success: false,
        error: 'setAccountPrivacy returned false',
        message: 'No he podido cambiar la privacidad. Inténtalo de nuevo.',
      };
    }
    return {
      success: true,
      message: isPrivate
        ? 'Hecho, tu cuenta ahora es privada.'
        : 'Hecho, tu cuenta ahora es pública.',
      data: { isPrivate },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to update privacy',
      message: 'No he podido cambiar la privacidad. Inténtalo de nuevo.',
    };
  }
}
