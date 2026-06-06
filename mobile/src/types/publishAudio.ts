/** Elección de audio + foto al publicar una frase o reflexión. */
export type PublishAudioChoice = {
  audioTrackId: string | null;
  /** 0 = mudo … 1 = máximo (ajustable en el picker). */
  audioVolume: number;
  /** Foto adjunta ya moderada y subida (URL pública), o null si no hay. */
  imageUrl?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  /** Encuadre vertical universal en Para ti (0 = tope de imagen, 1 = base). */
  imageCropFocusY?: number | null;
  /** Encuadre en tarjetas de Siguiendo; si null, usa `imageCropFocusY`. */
  imageCropFocusYFollowing?: number | null;
  /** Mostrar foto en Para ti (default true si hay `imageUrl`). */
  imageShowParaTi?: boolean | null;
  /** Mostrar foto en Siguiendo (default true si hay `imageUrl`). */
  imageShowSiguiendo?: boolean | null;
};

export const DEFAULT_PUBLISH_AUDIO: PublishAudioChoice = {
  audioTrackId: null,
  audioVolume: 1,
  imageUrl: null,
  imageWidth: null,
  imageHeight: null,
  imageCropFocusY: null,
  imageCropFocusYFollowing: null,
  imageShowParaTi: null,
  imageShowSiguiendo: null,
};
