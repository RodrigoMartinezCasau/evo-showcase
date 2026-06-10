/**
 * Puente entre los handlers de configuración del agente y el estado real de Evo.
 *
 * Mismo patrón que interactionBridge: la privacidad vive en AuthContext
 * (profile.is_private), la voz en VoiceAssistantPreferencesContext y las
 * notificaciones en AsyncStorage + permiso del sistema. Nada de eso es
 * importable desde lógica pura, así que useRegisterAgentConfig (montado en
 * VoiceAssistantLayer) registra funciones imperativas que los handlers
 * consumen. El core del agente sigue sin conocer APIs internas de Evo.
 */

/** Estado del permiso de notificaciones del sistema operativo. */
export type NotificationsPermission = 'granted' | 'denied' | 'unavailable';

export interface AgentConfigBridge {
  /** ¿La cuenta es privada? Null si el perfil aún no cargó. */
  getIsPrivate(): boolean | null;
  /** Cambia la privacidad de la cuenta. False si la escritura falló. */
  setAccountPrivacy(isPrivate: boolean): Promise<boolean>;
  /** Id de la voz TTS activa del asistente ('nova' | 'onyx'). */
  getAssistantVoice(): string;
  /** Cambia la voz TTS del asistente (persiste en preferencias). */
  setAssistantVoice(voiceId: string): void;
  /** ¿Las notificaciones están activadas en las preferencias de Evo? */
  getNotificationsEnabled(): Promise<boolean>;
  /** Activa/desactiva las notificaciones en las preferencias de Evo. */
  setNotificationsEnabled(enabled: boolean): Promise<void>;
  /**
   * Garantiza el permiso de notificaciones del sistema: si aún se puede
   * preguntar, dispara el diálogo nativo. 'unavailable' = entorno sin módulo
   * de notificaciones (Expo Go); el toggle local sigue teniendo sentido.
   */
  ensureNotificationsSystemPermission(): Promise<NotificationsPermission>;
}

let bridge: AgentConfigBridge | null = null;

/** Registra (o limpia con null) el puente de configuración de la app. */
export function setAgentConfigBridge(next: AgentConfigBridge | null): void {
  bridge = next;
}

/** Puente actual, o null si la app todavía no lo registró. */
export function getAgentConfigBridge(): AgentConfigBridge | null {
  return bridge;
}
