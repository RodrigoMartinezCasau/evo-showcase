/**
 * Idempotency checkers (v2 Sprint 1): comprueban contra el estado VIVO de la
 * app (puente de interacciones), no contra el snapshot del contexto, que
 * podría estar desactualizado si el usuario tocó el corazón con el dedo
 * mientras hablaba. Si la acción ya está aplicada, el ActionExecutor no
 * ejecuta y el agente responde con el mensaje del checker.
 */
import { getFocusedPost } from '../../core/feedContext';
import type { AgentScreenContext } from '../../core/types';
import { getAgentInteractionBridge } from '../interactionBridge';

export interface IdempotencyResult {
  alreadyApplied: boolean;
  message?: string;
}

function focusedPostId(context: AgentScreenContext): string | null {
  return getFocusedPost(context.feed)?.post_id ?? null;
}

/** like_post: ¿ya tiene voto positivo? */
export async function isPostAlreadyLiked(context: AgentScreenContext): Promise<IdempotencyResult> {
  const postId = focusedPostId(context);
  const bridge = getAgentInteractionBridge();
  if (!postId || !bridge) return { alreadyApplied: false };
  if (bridge.getMyVote(postId) === 'up') {
    return { alreadyApplied: true, message: 'Ya le habías dado like a esta publicación.' };
  }
  return { alreadyApplied: false };
}

/** unlike_post: ¿no tiene voto positivo que quitar? */
export async function isPostNotLiked(context: AgentScreenContext): Promise<IdempotencyResult> {
  const postId = focusedPostId(context);
  const bridge = getAgentInteractionBridge();
  if (!postId || !bridge) return { alreadyApplied: false };
  if (bridge.getMyVote(postId) !== 'up') {
    return { alreadyApplied: true, message: 'No le habías dado like a esta publicación.' };
  }
  return { alreadyApplied: false };
}

/** save_post: ¿ya estaba guardada? */
export async function isPostAlreadySaved(context: AgentScreenContext): Promise<IdempotencyResult> {
  const postId = focusedPostId(context);
  const bridge = getAgentInteractionBridge();
  if (!postId || !bridge) return { alreadyApplied: false };
  if (bridge.isSaved(postId)) {
    return { alreadyApplied: true, message: 'Ya la tenías guardada.' };
  }
  return { alreadyApplied: false };
}

/** unsave_post: ¿no estaba guardada? */
export async function isPostNotSaved(context: AgentScreenContext): Promise<IdempotencyResult> {
  const postId = focusedPostId(context);
  const bridge = getAgentInteractionBridge();
  if (!postId || !bridge) return { alreadyApplied: false };
  if (!bridge.isSaved(postId)) {
    return { alreadyApplied: true, message: 'No estaba en guardados.' };
  }
  return { alreadyApplied: false };
}
