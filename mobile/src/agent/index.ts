/**
 * Módulo del agente in-app de Evo.
 *
 * /core      → lógica genérica reutilizable (futuro SDK multi-app)
 * /manifest  → declaración específica de Evo (rutas, políticas)
 *
 * El resto de la app solo debe importar desde este index.
 */
export { ActionExecutor } from './core/ActionExecutor';
export { parseAgentAction } from './core/types';
export type {
  AgentAction,
  AgentTurnResponse,
  ActionResult,
  AgentScreenContext,
} from './core/types';
export {
  precheckManifestAction,
  runManifestAction,
  validateActionContext,
} from './core/actionEngine';
export type { ActionPrecheck } from './core/actionEngine';
export { useRegisterAgentInteractions } from './handlers/useRegisterAgentInteractions';
export {
  setAgentInteractionBridge,
  getAgentInteractionBridge,
} from './handlers/interactionBridge';
export type { AgentInteractionBridge } from './handlers/interactionBridge';
export { useRegisterAgentConfig } from './handlers/useRegisterAgentConfig';
export { setAgentConfigBridge, getAgentConfigBridge } from './handlers/configBridge';
export type { AgentConfigBridge, NotificationsPermission } from './handlers/configBridge';
export { useRegisterAgentApp } from './handlers/useRegisterAgentApp';
export { setAgentAppBridge, getAgentAppBridge } from './handlers/appBridge';
export type { AgentAppBridge, AgentUserSearchResult } from './handlers/appBridge';
export { registerAgentPostUi, getAgentPostUi } from './handlers/postUiRegistry';
export type { AgentPostUiHandlers } from './handlers/postUiRegistry';
export {
  AFFIRMATIVE_WORDS,
  NEGATIVE_WORDS,
  isAffirmative,
  isNegative,
  classifyConfirmationReply,
} from './core/confirmationSpeech';
export type { ConfirmationReply } from './core/confirmationSpeech';
export { getTargetProfile } from './core/profileContext';
export type { VisibleProfile } from './core/profileContext';
export { logAgentEvent } from './core/agentAnalytics';
export type { AgentEventType } from './core/agentAnalytics';
export {
  hasConsentedToAssistant,
  grantAssistantConsent,
  revokeAssistantConsent,
} from './core/consent';
export { AssistantConsentModal } from './components/AssistantConsentModal';
export { ActionConfirmationModal } from './components/ActionConfirmationModal';
export { combineContexts, truncateContext, MAX_CONTEXT_CHARS } from './core/contextLimits';
export { sanitizeForLLM } from './core/sanitization';
export type { SanitizationResult, RedactionType } from './core/sanitization';
export {
  buildFeedScreenContextText,
  getFocusedPost,
  selectMostCentered,
  clipPostPreview,
  MAX_VISIBLE_POSTS,
  MAX_POST_PREVIEW_CHARS,
} from './core/feedContext';
export type { FeedScreenContext, VisiblePost } from './core/feedContext';
export {
  evoManifest,
  manifestRoutesForBackend,
  manifestActionsForBackend,
  EVO_MANIFEST_VERSION,
} from './manifest/evo.manifest';
export type {
  AppManifest,
  RouteIntent,
  ActionIntent,
  ParameterSpec,
  ContextRequirement,
} from './manifest/types';
