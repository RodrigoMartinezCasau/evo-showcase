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
import {
  prefillCommentHandler,
  prefillPhraseHandler,
  prefillReflectionHandler,
} from './creation/creationActions';
import {
  blockVisibleProfileHandler,
  followVisibleProfileHandler,
  unfollowVisibleProfileHandler,
} from './social/relationshipActions';
import { repostVisiblePostHandler } from './social/repostActions';
import { reportVisiblePostHandler } from './social/reportActions';
import { logoutHandler } from './social/sessionActions';
import {
  isAlreadyFollowingProfile,
  isNotFollowingProfile,
  isPostAlreadyReposted,
  isProfileAlreadyBlocked,
} from './social/idempotency';
import { findUserProfileHandler, openSearchWithQueryHandler } from './search/searchActions';
import {
  isMusicAlreadyPaused,
  isMusicAlreadyPlaying,
  pauseFeedMusicHandler,
  resumeFeedMusicHandler,
} from './interactions/musicActions';

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
  // Sprint 3: creación con prefill (el agente nunca publica por el usuario)
  prefillReflection: prefillReflectionHandler,
  prefillPhrase: prefillPhraseHandler,
  prefillComment: prefillCommentHandler,
  // Sprint 4: relaciones, repost, denuncia y sesión
  followVisibleProfile: followVisibleProfileHandler,
  unfollowVisibleProfile: unfollowVisibleProfileHandler,
  blockVisibleProfile: blockVisibleProfileHandler,
  repostVisiblePost: repostVisiblePostHandler,
  reportVisiblePost: reportVisiblePostHandler,
  logout: logoutHandler,
  // Sprint 5: búsqueda y perfiles por nombre
  findUserProfile: findUserProfileHandler,
  openSearchWithQuery: openSearchWithQueryHandler,
  // Música del feed
  pauseFeedMusic: pauseFeedMusicHandler,
  resumeFeedMusic: resumeFeedMusicHandler,
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
  // Sprint 4
  isAlreadyFollowingProfile,
  isNotFollowingProfile,
  isProfileAlreadyBlocked,
  isPostAlreadyReposted,
  // Música del feed
  isMusicAlreadyPaused,
  isMusicAlreadyPlaying,
};
