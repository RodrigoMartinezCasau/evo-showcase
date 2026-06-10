/**
 * Handler de denuncia del post visible (Sprint 4).
 *
 * NO denuncia directamente: abre el selector de motivos existente de Evo y
 * el usuario elige razón y confirma. El modal de denuncia ES la confirmación,
 * por eso el manifest no marca requireConfirmation.
 */
import type { ActionResult, AgentScreenContext } from '../../core/types';
import { getFocusedPost } from '../../core/feedContext';
import { getAgentPostUi } from '../postUiRegistry';

export async function reportVisiblePostHandler(
  _params: Record<string, unknown>,
  context: AgentScreenContext,
): Promise<ActionResult> {
  const post = getFocusedPost(context.feed);
  if (!post) {
    return {
      success: false,
      error: 'No focused post in context',
      message: 'Para denunciar, abre primero la publicación.',
    };
  }
  const ui = getAgentPostUi(post.post_id);
  if (!ui) {
    return {
      success: false,
      error: `Post UI not registered for ${post.post_id}`,
      message: 'Para denunciar, abre primero la publicación.',
    };
  }
  try {
    ui.openReportPicker();
    return { success: true, data: { post_id: post.post_id } };
  } catch (e) {
    return {
      success: false,
      error: `openReportPicker failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido abrir la denuncia. Inténtalo de nuevo.',
    };
  }
}
