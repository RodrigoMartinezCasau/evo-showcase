import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';

let activePreviewPlayer: AudioPlayer | null = null;

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

async function ensurePlaybackAudioMode(): Promise<void> {
  try {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
  } catch {
    /* noop */
  }
}

/** Reproduce un MP3 en base64 y espera a que termine. */
export async function playVoiceAssistantMp3Base64(audioBase64: string): Promise<void> {
  if (!audioBase64?.length) return;
  stopVoiceAssistantPlayback();
  await ensurePlaybackAudioMode();
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
