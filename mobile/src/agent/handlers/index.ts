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
import { setAccountPrivacyHandler } from './config/setAccountPrivacy';
import { changeAssistantVoiceHandler } from './config/changeAssistantVoice';
import { toggleNotificationsHandler } from './config/toggleNotifications';
import {
  areNotificationsAlreadyDisabled,
  areNotificationsAlreadyEnabled,
  isAccountAlreadyPrivate,
  isAccountAlreadyPublic,
} from './config/idempotency';

export type ActionHandler = (
  params: Record<string, unknown>,
  context: AgentScreenContext,
  /** Intent del manifest — los handlers compartidos derivan su valor de aquí. */
  intent?: string,
) => Promise<ActionResult>;

export type IdempotencyChecker = (context: AgentScreenContext) => Promise<IdempotencyResult>;

export const ACTION_HANDLERS: Record<string, ActionHandler> = {
  // Sprint 1: interacciones sobre el post visible
  likeVisiblePost: likeVisiblePostHandler,
  unlikeVisiblePost: unlikeVisiblePostHandler,
  saveVisiblePost: saveVisiblePostHandler,
  unsaveVisiblePost: unsaveVisiblePostHandler,
  // Sprint 2: configuración
  setAccountPrivacy: setAccountPrivacyHandler,
  changeAssistantVoice: changeAssistantVoiceHandler,
  toggleNotifications: toggleNotificationsHandler,
};

export const IDEMPOTENCY_CHECKERS: Record<string, IdempotencyChecker> = {
  // Sprint 1
  isPostAlreadyLiked,
  isPostNotLiked,
  isPostAlreadySaved,
  isPostNotSaved,
  // Sprint 2
  isAccountAlreadyPublic,
  isAccountAlreadyPrivate,
  areNotificationsAlreadyEnabled,
  areNotificationsAlreadyDisabled,
};
