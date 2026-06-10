/**
 * Registro de handlers y checkers de idempotencia del agente.
 *
 * El manifest referencia handlers por NOMBRE (string); este registro los
 * resuelve a funciones. Para añadir una acción nueva: declararla en el
 * manifest + registrar aquí su handler (y checker si aplica).
 */
import type { ActionResult, AgentScreenContext } from '../core/types';
import {
  likeVisiblePostHandler,
  saveVisiblePostHandler,
  unlikeVisiblePostHandler,
  unsaveVisiblePostHandler,
} from './interactions/visiblePostActions';
import {
  isPostAlreadyLiked,
  isPostAlreadySaved,
  isPostNotLiked,
  isPostNotSaved,
  type IdempotencyResult,
} from './interactions/idempotency';

export type ActionHandler = (
  params: Record<string, unknown>,
  context: AgentScreenContext,
) => Promise<ActionResult>;

export type IdempotencyChecker = (context: AgentScreenContext) => Promise<IdempotencyResult>;

export const ACTION_HANDLERS: Record<string, ActionHandler> = {
  likeVisiblePost: likeVisiblePostHandler,
  unlikeVisiblePost: unlikeVisiblePostHandler,
  saveVisiblePost: saveVisiblePostHandler,
  unsaveVisiblePost: unsaveVisiblePostHandler,
};

export const IDEMPOTENCY_CHECKERS: Record<string, IdempotencyChecker> = {
  isPostAlreadyLiked,
  isPostNotLiked,
  isPostAlreadySaved,
  isPostNotSaved,
};
