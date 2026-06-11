/**
 * Handlers de creación con prefill (Sprint 3).
 *
 * Principio clave: el agente NUNCA publica contenido por el usuario. Solo
 * abre la pantalla/composer correspondiente con el texto pre-rellenado; el
 * usuario revisa, edita y publica manualmente. El contenido del prefill lo
 * extrae el LLM de lo que dijo el usuario (literal o tema), nunca lo genera.
 */
import type { ActionResult, AgentScreenContext } from '../../core/types';
import { getFocusedPost } from '../../core/feedContext';
import { getAgentAppBridge } from '../appBridge';
import { pickStringParam } from '../paramUtils';
import { getAgentPostUi } from '../postUiRegistry';

const NO_BRIDGE: ActionResult = {
  success: false,
  error: 'AgentAppBridge not registered',
  message: 'No he podido abrirlo. Inténtalo de nuevo.',
};

/** C1: abre la creación de reflexión con texto/tema de partida opcional. */
export async function prefillReflectionHandler(
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) return NO_BRIDGE;
  const content = pickStringParam(params, 'content', 'text', 'topic', 'theme', 'reflection');
  try {
    bridge.openReflectionComposer(content);
    return {
      success: true,
      data: { prefilled: content != null },
      message: content
        ? 'Te abro la reflexión con el texto que pediste. Revísalo y publícalo cuando quieras.'
        : 'Te abro una nueva reflexión.',
    };
  } catch (e) {
    return {
      success: false,
      error: `openReflectionComposer failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido abrir la reflexión. Inténtalo de nuevo.',
    };
  }
}

/** C2: abre la creación de frase con texto y autor opcionales. */
export async function prefillPhraseHandler(
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) return NO_BRIDGE;
  const phraseText = pickStringParam(params, 'phraseText', 'phrase', 'text', 'content');
  const author = pickStringParam(params, 'author', 'authorName');
  try {
    bridge.openPhraseComposer(phraseText, author);
    return {
      success: true,
      data: { prefilled: phraseText != null },
      message: phraseText
        ? 'Te abro la frase con el texto que pediste. Revísala y publícala cuando quieras.'
        : 'Te abro una nueva frase.',
    };
  } catch (e) {
    return {
      success: false,
      error: `openPhraseComposer failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido abrir la frase. Inténtalo de nuevo.',
    };
  }
}

/**
 * C3: abre el composer de comentarios del post visible con texto inicial.
 * El usuario pulsa enviar manualmente (el agente no comenta por él).
 */
export async function prefillCommentHandler(
  params: Record<string, unknown>,
  context: AgentScreenContext,
): Promise<ActionResult> {
  const post = getFocusedPost(context.feed);
  if (!post) {
    return {
      success: false,
      error: 'No focused post in context',
      message: 'Para comentar, abre primero la publicación.',
    };
  }
  const commentText = pickStringParam(params, 'commentText', 'comment', 'text', 'content');
  if (!commentText) {
    return {
      success: false,
      error: 'Missing commentText parameter',
      message: 'No he entendido qué quieres comentar. Dímelo otra vez.',
    };
  }
  const ui = getAgentPostUi(post.post_id);
  if (!ui) {
    // La tarjeta no está montada con composer (p. ej. preview del feed).
    return {
      success: false,
      error: `Post UI not registered for ${post.post_id}`,
      message: 'Para comentar, abre primero la publicación.',
    };
  }
  try {
    ui.openCommentComposer(commentText);
    return { success: true, data: { post_id: post.post_id } };
  } catch (e) {
    return {
      success: false,
      error: `openCommentComposer failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido abrir el comentario. Inténtalo de nuevo.',
    };
  }
}
