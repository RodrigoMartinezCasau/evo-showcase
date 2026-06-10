/**
 * Handlers de interacción simple sobre el post visible (v2 Sprint 1):
 * like, unlike, guardar y quitar de guardados. Sin confirmación (acciones
 * reversibles de bajo riesgo) y con idempotencia comprobada antes (ver
 * idempotency.ts) por el ActionExecutor.
 */
import { getFocusedPost } from '../../core/feedContext';
import type { ActionResult, AgentScreenContext } from '../../core/types';
import { getAgentInteractionBridge, type AgentInteractionBridge } from '../interactionBridge';

type Prepared =
  | { ok: true; postId: string; bridge: AgentInteractionBridge }
  | { ok: false; result: ActionResult };

/** Resuelve el post objetivo y el puente; si falta algo, ActionResult de error. */
function prepare(context: AgentScreenContext): Prepared {
  const post = getFocusedPost(context.feed);
  if (!post) {
    return {
      ok: false,
      result: {
        success: false,
        error: 'No focused post found',
        message: 'Para hacer eso necesito que estés viendo una publicación.',
      },
    };
  }
  const bridge = getAgentInteractionBridge();
  if (!bridge) {
    return {
      ok: false,
      result: {
        success: false,
        error: 'Interaction bridge not registered',
        message: 'No puedo hacer eso ahora mismo. Inténtalo de nuevo.',
      },
    };
  }
  return { ok: true, postId: post.post_id, bridge };
}

/** Da like (voto positivo) al post visible. */
export async function likeVisiblePostHandler(
  _params: Record<string, unknown>,
  context: AgentScreenContext,
): Promise<ActionResult> {
  const prep = prepare(context);
  if (!prep.ok) return prep.result;
  try {
    prep.bridge.setVote(prep.postId, 'up');
    return { success: true, message: 'Listo, le he dado like.', data: { post_id: prep.postId } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to like post',
      message: 'No he podido dar like. Inténtalo de nuevo.',
    };
  }
}

/** Quita el like (voto positivo) del post visible. */
export async function unlikeVisiblePostHandler(
  _params: Record<string, unknown>,
  context: AgentScreenContext,
): Promise<ActionResult> {
  const prep = prepare(context);
  if (!prep.ok) return prep.result;
  try {
    prep.bridge.setVote(prep.postId, null);
    return { success: true, message: 'Hecho, he quitado el like.', data: { post_id: prep.postId } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to unlike post',
      message: 'No he podido quitar el like. Inténtalo de nuevo.',
    };
  }
}

/** Guarda el post visible en guardados del usuario. */
export async function saveVisiblePostHandler(
  _params: Record<string, unknown>,
  context: AgentScreenContext,
): Promise<ActionResult> {
  const prep = prepare(context);
  if (!prep.ok) return prep.result;
  try {
    const saved = prep.bridge.savePost(prep.postId);
    if (!saved) {
      return {
        success: false,
        error: 'Post not found in store',
        message: 'No he encontrado esa publicación. Inténtalo de nuevo.',
      };
    }
    return { success: true, message: 'Guardada en tus guardados.', data: { post_id: prep.postId } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to save post',
      message: 'No he podido guardarla. Inténtalo de nuevo.',
    };
  }
}

/** Quita el post visible de guardados. */
export async function unsaveVisiblePostHandler(
  _params: Record<string, unknown>,
  context: AgentScreenContext,
): Promise<ActionResult> {
  const prep = prepare(context);
  if (!prep.ok) return prep.result;
  try {
    prep.bridge.unsavePost(prep.postId);
    return { success: true, message: 'Quitada de tus guardados.', data: { post_id: prep.postId } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to unsave post',
      message: 'No he podido quitarla de guardados. Inténtalo de nuevo.',
    };
  }
}
