import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';

/** Volumen de reproducción del TTS del asistente (rango expo-audio: 0–1). */
export const VOICE_ASSISTANT_PLAYBACK_VOLUME = 1;

let activePreviewPlayer: AudioPlayer | null = null;

/** Aplica volumen máximo y desmutea el player del asistente. */
export function applyVoiceAssistantPlayerVolume(player: AudioPlayer): void {
  player.muted = false;
  player.volume = VOICE_ASSISTANT_PLAYBACK_VOLUME;
}

export function stopVoiceAssistantPlayback(): void {
  const p = activePreviewPlayer;
  activePreviewPlayer = null;
  if (!p) return;
  try {
    p.pause();
    p.remove();
  } catch {
    /* noop */
  }
}

/**
 * Modo de audio para que el TTS del asistente suene fuerte y claro.
 * `doNotMix` pide foco exclusivo (mejor que `mixWithOthers`, pensado para
 * efectos cortos y que en el iPhone suena muy bajo).
 */
export async function ensureVoiceAssistantSpeakAudioMode(): Promise<void> {
  try {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
    });
  } catch {
    /* noop */
  }
}

/** Reproduce un MP3 en base64 y espera a que termine. */
export async function playVoiceAssistantMp3Base64(audioBase64: string): Promise<void> {
  if (!audioBase64?.length) return;
  stopVoiceAssistantPlayback();
  await ensureVoiceAssistantSpeakAudioMode();
  const uri = `${FileSystem.cacheDirectory}evo-voice-preview-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(uri, audioBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const player = createAudioPlayer(null, { keepAudioSessionActive: true });
  activePreviewPlayer = player;
  player.replace(uri);
  const deadline = Date.now() + 12_000;
  while (!player.isLoaded && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 40));
  }
  applyVoiceAssistantPlayerVolume(player);
  player.play();
  const endBy = Date.now() + 30_000;
  while (Date.now() < endBy) {
    if (player.playing) {
      await new Promise((r) => setTimeout(r, 80));
      continue;
    }
    await new Promise((r) => setTimeout(r, 40));
    if (!player.playing) break;
  }
  if (activePreviewPlayer === player) activePreviewPlayer = null;
  try {
    player.pause();
    player.remove();
  } catch {
    /* noop */
  }
}
