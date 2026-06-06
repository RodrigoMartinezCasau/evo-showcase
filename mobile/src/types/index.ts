export type Rank = 'aprendiz' | 'maestro' | 'filosofo'

export type User = {
  id: string
  username: string
  /** Null when user is pre-assignment (no clan yet). */
  clanId: string | null
  rank: Rank
  avatarUri?: string
  followersCount?: number
  followingCount?: number
}

export type Clan = {
  id: string
  name: string
  shortLabel: string
  color: string
}

export type VoteStats = {
  up: number
  down: number
  save: number
}

export type UserStats = {
  dailyUsesLeft: number
  streak: number
  unlockedPhrases: number
  unlockedPhrasesTotal: number
}

export type CommunityPost = {
  id: string
  type: 'reflection' | 'phrase'
  author: User
  title?: string
  body: string
  /** Original author of the quote (for phrases). Not the posting user. */
  quoteAuthor?: string
  voteStats: VoteStats
  createdAt: string
  /** Pista de audio adjunta (biblioteca `audio_tracks`). Suena solo en "Para ti". */
  audioTrackId?: string | null
  /** Volumen elegido por el autor para su publicación (0 = mudo … 1 = máx). */
  audioVolume?: number | null
  /** Foto adjunta (bucket `post-images`, ya moderada). URL pública o null. */
  imageUrl?: string | null
  /** Dimensiones originales de la foto (para calcular el aspect ratio sin medir). */
  imageWidth?: number | null
  imageHeight?: number | null
  /** Punto vertical normalizado en la imagen fuente (0–1) para encuadre universal. */
  imageCropFocusY?: number | null
  /** Encuadre en Siguiendo; si null, cae back a `imageCropFocusY`. */
  imageCropFocusYFollowing?: number | null
  /** Si false, no mostrar imagen en Para ti. */
  imageShowParaTi?: boolean | null
  /** Si false, no mostrar imagen en Siguiendo. */
  imageShowSiguiendo?: boolean | null
}

export type ReflectionPost = CommunityPost & { type: 'reflection'; title: string }
export type PhrasePost = CommunityPost & { type: 'phrase' }

export type Comment = {
  id: string
  author: User
  body: string
  upCount: number
  createdAt: string
  /**
   * Si está informado, este comentario responde a otro del mismo post.
   * La UI agrupa los hijos en hilos plegables bajo su padre raíz.
   */
  parentId?: string | null
}

export type ConversationItem = {
  id: string
  type: 'reflection' | 'phrase'
  title: string
  updatedAt: string
  isFavorite?: boolean
  folderId?: string | null
  /**
   * ID of the simulated user who created this item (e.g. 'u1'–'u9').
   * Used to scope thoughts to the correct user and to prevent cross-user leakage
   * when switching users in the simulator. Optional for backward compatibility
   * with older persisted data (migrated items may not have it yet).
   */
  ownerUserId?: string
}

export type SidebarFolder = {
  id: string
  name: string
}
