/**
 * Idempotency checkers de configuración (v2 Sprint 2). Se ejecutan en el
 * precheck, ANTES de pedir confirmación: "haz mi cuenta privada" cuando ya es
 * privada responde directamente sin molestar con el modal.
 *
 * Igual que en Sprint 1: estado VIVO vía puente, nunca snapshots. Sin puente
 * no se bloquea la acción (el handler dará su propio error si hace falta).
 */
import type { AgentScreenContext } from '../../core/types';
import { getAgentConfigBridge } from '../configBridge';
import type { IdempotencyResult } from '../interactions/idempotency';

/** make_account_public: ¿la cuenta ya es pública? */
export async function isAccountAlreadyPublic(
  _context: AgentScreenContext,
): Promise<IdempotencyResult> {
  const isPrivate = getAgentConfigBridge()?.getIsPrivate();
  if (isPrivate === false) {
    return { alreadyApplied: true, message: 'Tu cuenta ya es pública.' };
  }
  return { alreadyApplied: false };
}

/** make_account_private: ¿la cuenta ya es privada? */
export async function isAccountAlreadyPrivate(
  _context: AgentScreenContext,
): Promise<IdempotencyResult> {
  const isPrivate = getAgentConfigBridge()?.getIsPrivate();
  if (isPrivate === true) {
    return { alreadyApplied: true, message: 'Tu cuenta ya es privada.' };
  }
  return { alreadyApplied: false };
}

/** enable_notifications: ¿ya estaban activadas? */
export async function areNotificationsAlreadyEnabled(
  _context: AgentScreenContext,
): Promise<IdempotencyResult> {
  const bridge = getAgentConfigBridge();
  if (!bridge) return { alreadyApplied: false };
  if (await bridge.getNotificationsEnabled()) {
    return { alreadyApplied: true, message: 'Las notificaciones ya están activadas.' };
  }
  return { alreadyApplied: false };
}

/** disable_notifications: ¿ya estaban desactivadas? */
export async function areNotificationsAlreadyDisabled(
  _context: AgentScreenContext,
): Promise<IdempotencyResult> {
  const bridge = getAgentConfigBridge();
  if (!bridge) return { alreadyApplied: false };
  if (!(await bridge.getNotificationsEnabled())) {
    return { alreadyApplied: true, message: 'Las notificaciones ya están desactivadas.' };
  }
  return { alreadyApplied: false };
}
