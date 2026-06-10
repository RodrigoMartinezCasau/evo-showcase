/**
 * Tipos del App Manifest — el contrato declarativo entre una app y el agente.
 *
 * El manifest describe QUÉ puede hacer el agente en la app (rutas, acciones,
 * políticas) sin acoplar el núcleo del agente a APIs internas de la app.
 * Es la pieza reutilizable de cara al futuro SDK multi-app.
 */

/** Una ruta de la app a la que el agente puede navegar. */
export interface RouteIntent {
  /** Identificador estable del intent (lo devuelve el LLM). */
  intent: string;
  /** Nombre legible para humanos (panel, logs, prompt). */
  label: string;
  /**
   * Href de expo-router (p. ej. '/my-profile', '/(tabs)?tab=para-ti')
   * o el marcador especial 'BACK' para router.back().
   */
  route: string;
  /** Frases de ejemplo en español que disparan este intent (few-shot del LLM). */
  examples: string[];
}

/** Especificación de un parámetro de una acción del manifest. */
export interface ParameterSpec {
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description: string;
}

/** Qué debe haber en pantalla/sesión para que la acción tenga sentido. */
export interface ContextRequirement {
  /** La acción opera sobre la publicación visible (feed). */
  requiresVisiblePost?: boolean;
  /** La acción opera sobre el perfil visible (sprints posteriores). */
  requiresVisibleProfile?: boolean;
  /** Requiere sesión iniciada. */
  requiresAuth?: boolean;
}

/**
 * Acción no-navegación declarada en el manifest (v2).
 * Igual que las rutas: el backend solo recibe esta declaración y devuelve
 * qué intent ejecutar — toda la implementación vive en el cliente.
 */
export interface ActionIntent {
  /** Identificador estable del intent (lo devuelve el LLM). */
  intent: string;
  /** Nombre legible para humanos (panel, logs, prompt). */
  label: string;
  /** Familia de la acción (gobernará políticas por categoría). */
  category: 'content' | 'interaction' | 'relationship' | 'config' | 'navigation';
  /** Nombre del handler registrado en ACTION_HANDLERS (handlers/index.ts). */
  handler: string;
  /** True → el agente pide confirmación antes de ejecutar (Sprint 4). */
  requireConfirmation: boolean;
  /** Plantilla del mensaje de confirmación (Sprint 4). */
  confirmationMessageTemplate?: string;
  /** Parámetros que el LLM puede rellenar (vacío en las acciones simples). */
  parameters: Record<string, ParameterSpec>;
  /** Requisitos de contexto que valida el ActionExecutor antes de ejecutar. */
  contextRequirements?: ContextRequirement;
  /** Frases de ejemplo en español que disparan este intent (few-shot del LLM). */
  examples: string[];
  /**
   * Nombre del checker registrado en IDEMPOTENCY_CHECKERS: si la acción ya
   * está aplicada, no se ejecuta y se responde con el mensaje del checker.
   */
  idempotencyCheck?: string;
}

/** Políticas de seguridad del agente para esta app. */
export interface AgentPolicies {
  /** Las acciones destructivas siempre piden confirmación (v2). */
  requireConfirmationForDestructive: boolean;
  /** Intents navegables sin sesión iniciada (en Evo el orbe solo existe con sesión). */
  allowedWithoutAuth: string[];
  /** Turnos de conversación que el agente recuerda (v2). */
  contextRetentionTurns: number;
}

/** Manifest completo de una app cliente del agente. */
export interface AppManifest {
  appId: string;
  appName: string;
  appDescription: string;
  /** Versión del manifest — viaja al backend para trazabilidad. */
  version: string;
  routes: RouteIntent[];
  actions: ActionIntent[];
  policies: AgentPolicies;
}
