/**
 * Handler de repost del post visible (Sprint 4). Requiere confirmación
 * (aparece en el feed con el nombre del usuario) — la exige el manifest.
 */
import type { ActionResult, AgentScreenContext } from '../../core/types';
import { getFocusedPost } from '../../core/feedContext';
import { getAgentAppBridge } from '../appBridge';

export async function repostVisiblePostHandler(
  _params: Record<string, unknown>,
  context: AgentScreenContext,
): Promise<ActionResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) {
    return {
      success: false,
      error: 'AgentAppBridge not registered',
      message: 'No he podido hacerlo. Inténtalo de nuevo.',
    };
  }
  const post = getFocusedPost(context.feed);
  if (!post) {
    return {
      success: false,
      error: 'No focused post in context',
      message: 'Para republicar necesito que estés viendo una publicación.',
    };
  }
  if (bridge.isReposted(post.post_id)) {
    return { success: true, idempotent: true, message: 'Ya habías republicado esto.' };
  }
  try {
    bridge.repost(post.post_id);
    return {
      success: true,
      message: 'Hecho, la he republicado en tu perfil.',
      data: { post_id: post.post_id },
    };
  } catch (e) {
    return {
      success: false,
      error: `repost failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido republicarla. Inténtalo de nuevo.',
    };
  }
}
