/**
 * useFeedAudio — reproductor de audio para los visores ampliados (feed vertical).
 *
 * Reproduce en bucle la pista adjunta del post actualmente visible, al volumen
 * que el autor eligió al publicar (`post.audioVolume`). Se usa en TODOS los
 * displays ampliados: "Para ti", "Siguiendo" expandido, últimas publicaciones
 * (propias o de otro usuario) y el panel de perfil/clan.
 *
 * Diseño — SINGLETON a nivel de módulo: existe un único `AudioPlayer` en toda la
 * app (se hace `replace` al cambiar de pista). Esto evita audio solapado entre
 * pantallas distintas y minimiza el coste (un solo decodificador). El hook solo
 * devuelve métodos estables que operan sobre ese controlador compartido.
 *
 * Se detiene al salir del visor, al pasar la app a segundo plano y al desmontar
 * la pantalla que lo usa. No provoca re-renders (todo va por refs/módulo).
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import { getAudioTrackById } from '@evoconn/services/audioTracks';
import type { CommunityPost } from '../types';

type Player = ReturnType<typeof createAudioPlayer>;

function clampVolume(v: number | null | undefined): number {
  if (v == null || Number.isNaN(v)) return 1;
  return Math.min(1, Math.max(0, v));
}

/** Espera a que el player termine de cargar la pista antes de reproducir. */
function waitForLoaded(p: Player, timeoutMs = 15000): Promise<void> {
  if (p.isLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new Error('audio load timeout'));
    }, timeoutMs);
    const sub = p.addListener('playbackStatusUpdate', (status: { isLoaded: boolean }) => {
      if (!status.isLoaded) return;
      clearTimeout(timer);
      sub.remove();
      resolve();
    });
  });
}

export type FeedAudioController = {
  /** Reproduce el audio del post (o silencia si no tiene pista). */
  playForPost: (post: CommunityPost) => void;
  /** Detiene y libera el audio. */
  stop: () => void;
};

export type FeedAudioPlaybackState = {
  /** Id del post cuyo audio está activo (o null si ninguno). */
  activePostId: string | null;
  /** El usuario ha pausado el audio del feed (preferencia global). */
  paused: boolean;
};

// ─── Estado singleton (compartido por toda la app) ───────────────────────────
let player: Player | null = null;
let currentPostId: string | null = null;
let currentTrackId: string | null = null;
let requestSeq = 0;
let audioModeReady = false;
let appStateSubscribed = false;
/** Pausa global iniciada por el usuario (botón del visor). Persiste al deslizar. */
let userPaused = false;

// ── Estado observable (useSyncExternalStore) ────────────────────────────────
const stateListeners = new Set<() => void>();
let snapshot: FeedAudioPlaybackState = { activePostId: null, paused: false };

function refreshSnapshot() {
  const next: FeedAudioPlaybackState = { activePostId: currentPostId, paused: userPaused };
  if (next.activePostId === snapshot.activePostId && next.paused === snapshot.paused) return;
  snapshot = next;
  stateListeners.forEach((l) => l());
}

function subscribeState(listener: () => void): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

function disposePlayer() {
  requestSeq += 1;
  currentPostId = null;
  currentTrackId = null;
  const p = player;
  player = null;
  if (!p) return;
  try {
    p.pause();
    p.remove();
  } catch {
    /* noop */
  }
  refreshSnapshot();
}

async function ensureAudioMode() {
  if (audioModeReady) return;
  audioModeReady = true;
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

function ensureAppStateSubscription() {
  if (appStateSubscribed) return;
  appStateSubscribed = true;
  AppState.addEventListener('change', (state: AppStateStatus) => {
    const p = player;
    if (!p) return;
    try {
      if (state === 'active') {
        if (!userPaused) p.play();
      } else {
        p.pause();
      }
    } catch {
      /* noop */
    }
  });
}

function playForPost(post: CommunityPost) {
  const trackId = post.audioTrackId ?? null;
  if (__DEV__) console.log('[FeedAudio] playForPost', post.id, 'trackId=', trackId, 'vol=', post.audioVolume);

  // Sin pista → silenciar lo que suene.
  if (!trackId) {
    disposePlayer();
    return;
  }

  // Mismo post ya sonando → solo refrescar volumen.
  if (currentPostId === post.id && player) {
    player.volume = clampVolume(post.audioVolume);
    return;
  }

  const requestId = ++requestSeq;
  currentPostId = post.id;
  const volume = clampVolume(post.audioVolume);
  refreshSnapshot();

  void (async () => {
    try {
      ensureAppStateSubscription();
      await ensureAudioMode();
      if (requestId !== requestSeq) return;

      const track = await getAudioTrackById(trackId);
      if (__DEV__) console.log('[FeedAudio] resolved track', trackId, '→', track?.url ?? 'NULL');
      if (!track) return;
      if (requestId !== requestSeq) return;

      let p = player;
      if (!p) {
        p = createAudioPlayer(null, { keepAudioSessionActive: true });
        player = p;
      }

      p.loop = true;
      p.volume = volume;

      // Evita recargar la misma pista si solo cambió el post (mismo track).
      if (currentTrackId !== trackId) {
        currentTrackId = trackId;
        p.replace(track.url);
        // Esperar a que la pista cargue antes de reproducir (si no, play() con
        // isLoaded=false no suena de forma fiable en iOS/Expo Go).
        await waitForLoaded(p);
        if (requestId !== requestSeq) return;
        if (track.previewStartMs > 0) {
          try {
            await p.seekTo(track.previewStartMs / 1000);
          } catch {
            /* noop */
          }
          if (requestId !== requestSeq) return;
        }
      }

      p.volume = volume;
      // Respeta la pausa global del usuario: prepara la pista pero no suena
      // hasta que el usuario reanude.
      if (!userPaused) p.play();
      if (__DEV__) console.log('[FeedAudio] play() called, paused=', userPaused, 'isLoaded=', p.isLoaded);
    } catch (e) {
      if (__DEV__) console.warn('[FeedAudio] playForPost error:', e);
    }
  })();
}

function stop() {
  // Al salir del visor reseteamos la pausa: la próxima sesión arranca con audio.
  userPaused = false;
  disposePlayer();
}

/** Pausa/reanuda el audio del feed (preferencia global del usuario). */
function toggle() {
  userPaused = !userPaused;
  const p = player;
  if (p) {
    try {
      if (userPaused) p.pause();
      else p.play();
    } catch {
      /* noop */
    }
  }
  refreshSnapshot();
}

const controller: FeedAudioController = { playForPost, stop };

export function useFeedAudio(): FeedAudioController {
  // Al desmontar la pantalla que lo usa, parar el audio (la pantalla que quede
  // visible volverá a llamar a `playForPost` desde su callback de visibilidad).
  useEffect(() => () => stop(), []);
  return useMemo(() => controller, []);
}

/**
 * Estado de reproducción del feed para la UI (botón pausa/play). Se re-renderiza
 * solo cuando cambia el post activo o el estado de pausa. `toggle` pausa o
 * reanuda el audio del feed (preferencia global).
 */
export function useFeedAudioPlayback(): FeedAudioPlaybackState & { toggle: () => void } {
  const state = useSyncExternalStore(subscribeState, () => snapshot, () => snapshot);
  return useMemo(() => ({ ...state, toggle }), [state]);
}
