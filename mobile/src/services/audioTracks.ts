/**
 * audioTracks
 *
 * Catálogo de pistas de audio (royalty-free / dominio público) que el usuario
 * puede adjuntar a una frase o reflexión. Las pistas suenan SOLO en el feed
 * "Para ti". Los archivos viven en el bucket público `audio-tracks` de Supabase
 * Storage; esta capa lee los metadatos de la tabla `audio_tracks` y resuelve la
 * URL pública de cada archivo a partir de su `storage_path`.
 *
 * Ver `supabase_audio_tracks.sql` para el esquema.
 */
import { supabase } from '../../mobile/lib/supabase';

const AUDIO_BUCKET = 'audio-tracks';

export type AudioTrack = {
  id: string;
  /** Nombre visible (el usuario los nombró por etiqueta: 'Poder', 'Amor', …). */
  title: string;
  artist: string | null;
  /** URL pública del archivo, lista para reproducir. */
  url: string;
  durationMs: number | null;
  /** Punto (ms) desde el que arranca al sonar en el feed. */
  previewStartMs: number;
  requiresAttribution: boolean;
};

type AudioTrackRow = {
  id: string;
  title: string;
  artist: string | null;
  storage_path: string;
  duration_ms: number | null;
  preview_start_ms: number | null;
  requires_attribution: boolean | null;
};

function rowToAudioTrack(row: AudioTrackRow): AudioTrack | null {
  const path = row.storage_path?.trim();
  if (!path) return null;
  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
  const url = data?.publicUrl;
  if (!url) return null;
  return {
    id: row.id,
    title: row.title,
    artist: row.artist ?? null,
    url,
    durationMs: row.duration_ms ?? null,
    previewStartMs: row.preview_start_ms ?? 0,
    requiresAttribution: row.requires_attribution ?? false,
  };
}

/**
 * Trae todas las pistas activas como lista plana, ordenadas por `sort_order`.
 * Pensado para poblar el picker de audio al publicar. Devuelve [] si falla (la
 * app sigue funcionando sin audio).
 */
export async function fetchAudioTracks(): Promise<AudioTrack[]> {
  const { data, error } = await supabase
    .from('audio_tracks')
    .select('id, title, artist, storage_path, duration_ms, preview_start_ms, requires_attribution')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    console.warn('[audioTracks] fetchAudioTracks:', error.message);
    return [];
  }
  return ((data ?? []) as AudioTrackRow[])
    .map(rowToAudioTrack)
    .filter((t): t is AudioTrack => t !== null);
}

/**
 * Mapa cacheado `id → AudioTrack`, para resolver una pista por su `audioTrackId`
 * (p. ej. al reproducir el audio de un post en "Para ti") sin re-consultar la
 * tabla cada vez. La primera llamada hace fetch; las siguientes reutilizan el
 * resultado en memoria.
 */
let trackMapPromise: Promise<Map<string, AudioTrack>> | null = null;

export function getAudioTrackMap(): Promise<Map<string, AudioTrack>> {
  if (!trackMapPromise) {
    trackMapPromise = fetchAudioTracks()
      .then((list) => new Map(list.map((t) => [t.id, t])))
      .catch((e) => {
        trackMapPromise = null; // permite reintentar tras un fallo
        throw e;
      });
  }
  return trackMapPromise;
}

export async function getAudioTrackById(id: string): Promise<AudioTrack | null> {
  try {
    const map = await getAudioTrackMap();
    return map.get(id) ?? null;
  } catch {
    return null;
  }
}
