/**
 * Handler de cambio de voz del asistente (v2 Sprint 2, sin confirmación).
 *
 * - Voz especificada ("usa Fyodor", "la voz femenina") → esa voz.
 * - Genérico ("cambia tu voz") → alternar a la otra.
 * - Voz ya activa → mensaje de idempotencia sin cambiar nada (resuelto aquí,
 *   no con idempotencyCheck: el handler ya lee la voz actual para alternar).
 *
 * `data.useNewVoiceForFeedback` indica al hook que el mensaje de éxito debe
 * sonar CON la nueva voz, para que el usuario la oiga inmediatamente.
 */
import type { ActionResult, AgentScreenContext } from '../../core/types';
import { getAgentConfigBridge } from '../configBridge';

/** Nombre de cara al usuario de cada voz (UI de Evo: nova=Jane, onyx=Fyodor). */
const VOICE_DISPLAY_NAMES: Record<string, string> = {
  nova: 'Jane',
  onyx: 'Fyodor',
};

/**
 * Mapea lo que dice el usuario (nombre, género, id OpenAI) a un id de voz.
 * Null si no se reconoce.
 */
export function normalizeRequestedVoiceId(raw: string): string | null {
  const v = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!v) return null;
  if (['jane', 'nova', 'femenina', 'femenino', 'mujer', 'chica', 'calida'].includes(v)) {
    return 'nova';
  }
  if (
    ['fyodor', 'onyx', 'masculina', 'masculino', 'hombre', 'chico', 'grave'].includes(v)
  ) {
    return 'onyx';
  }
  return null;
}

/** Cambia (o alterna) la voz TTS del asistente. */
export async function changeAssistantVoiceHandler(
  params: Record<string, unknown>,
  _context: AgentScreenContext,
  _intent?: string,
): Promise<ActionResult> {
  const bridge = getAgentConfigBridge();
  if (!bridge) {
    return {
      success: false,
      error: 'Config bridge not registered',
      message: 'No puedo cambiar la voz ahora mismo. Inténtalo de nuevo.',
    };
  }

  try {
    const currentVoice = bridge.getAssistantVoice();
    const requestedRaw = typeof params.voiceId === 'string' ? params.voiceId : '';

    let targetVoice: string;
    if (requestedRaw.trim()) {
      const normalized = normalizeRequestedVoiceId(requestedRaw);
      if (!normalized) {
        return {
          success: false,
          error: `Unknown voice requested: ${requestedRaw}`,
          message: 'Solo tengo las voces de Jane y Fyodor.',
        };
      }
      targetVoice = normalized;
    } else {
      targetVoice = currentVoice === 'nova' ? 'onyx' : 'nova';
    }

    const voiceName = VOICE_DISPLAY_NAMES[targetVoice] ?? targetVoice;

    if (targetVoice === currentVoice) {
      return {
        success: true,
        idempotent: true,
        message: `Ya estoy usando la voz de ${voiceName}.`,
        data: { voiceId: currentVoice, noChange: true },
      };
    }

    bridge.setAssistantVoice(targetVoice);
    return {
      success: true,
      message: `Listo, ahora hablo con la voz de ${voiceName}.`,
      data: { voiceId: targetVoice, useNewVoiceForFeedback: true },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to change voice',
      message: 'No he podido cambiar la voz. Inténtalo de nuevo.',
    };
  }
}
