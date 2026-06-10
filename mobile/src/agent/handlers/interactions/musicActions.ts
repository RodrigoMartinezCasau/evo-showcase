/**
 * Handlers de música del feed: pausar y reanudar la pista de la publicación
 * visible ("pausa la música", "pon la música otra vez").
 *
 * La música del feed es un singleton global (useFeedAudio): no depende del
 * snapshot del post, sino del estado VIVO del reproductor vía AgentAppBridge.
 * Misma semántica que el botón de pausa del visor (preferencia global del
 * usuario), así que la suspensión temporal durante el turno de voz no
 * interfiere: al terminar el turno se respeta lo que el usuario decidió.
 */
import type { ActionResult } from '../../core/types';
import type { IdempotencyResult } from './idempotency';
import { getAgentAppBridge } from '../appBridge';

const NO_BRIDGE: ActionResult = {
  success: false,
  error: 'AgentAppBridge not registered',
  message: 'No he podido hacerlo. Inténtalo de nuevo.',
};

const NO_TRACK_MESSAGE = 'Ahora mismo no hay música sonando en ninguna publicación.';

/** Pausa la música de la publicación visible. */
export async function pauseFeedMusicHandler(): Promise<ActionResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) return NO_BRIDGE;
  const state = bridge.getFeedAudioState();
  if (!state.hasTrack) {
    return { success: false, error: 'No feed audio active', message: NO_TRACK_MESSAGE };
  }
  if (state.paused) {
    return { success: true, idempotent: true, message: 'La música ya estaba pausada.' };
  }
  try {
    bridge.setFeedAudioPaused(true);
    return { success: true, message: 'Música pausada.' };
  } catch (e) {
    return {
      success: false,
      error: `pause music failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido pausar la música. Inténtalo de nuevo.',
    };
  }
}

/** Reanuda la música de la publicación visible. */
export async function resumeFeedMusicHandler(): Promise<ActionResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) return NO_BRIDGE;
  const state = bridge.getFeedAudioState();
  if (!state.hasTrack) {
    return { success: false, error: 'No feed audio active', message: NO_TRACK_MESSAGE };
  }
  if (!state.paused) {
    return { success: true, idempotent: true, message: 'La música ya estaba sonando.' };
  }
  try {
    bridge.setFeedAudioPaused(false);
    return { success: true, message: 'Música reanudada.' };
  } catch (e) {
    return {
      success: false,
      error: `resume music failed: ${e instanceof Error ? e.message : 'unknown'}`,
      message: 'No he podido reanudar la música. Inténtalo de nuevo.',
    };
  }
}

/** Idempotencia: "pausa la música" cuando ya está pausada. */
export async function isMusicAlreadyPaused(): Promise<IdempotencyResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) return { alreadyApplied: false };
  const state = bridge.getFeedAudioState();
  if (state.hasTrack && state.paused) {
    return { alreadyApplied: true, message: 'La música ya estaba pausada.' };
  }
  return { alreadyApplied: false };
}

/** Idempotencia: "reanuda la música" cuando ya está sonando. */
export async function isMusicAlreadyPlaying(): Promise<IdempotencyResult> {
  const bridge = getAgentAppBridge();
  if (!bridge) return { alreadyApplied: false };
  const state = bridge.getFeedAudioState();
  if (state.hasTrack && !state.paused) {
    return { alreadyApplied: true, message: 'La música ya estaba sonando.' };
  }
  return { alreadyApplied: false };
}
