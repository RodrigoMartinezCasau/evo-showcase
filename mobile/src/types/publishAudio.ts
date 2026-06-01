/** Elección de audio al publicar una frase o reflexión. */
export type PublishAudioChoice = {
  audioTrackId: string | null;
  /** 0 = mudo … 1 = máximo (ajustable en el picker). */
  audioVolume: number;
};

export const DEFAULT_PUBLISH_AUDIO: PublishAudioChoice = {
  audioTrackId: null,
  audioVolume: 1,
};
