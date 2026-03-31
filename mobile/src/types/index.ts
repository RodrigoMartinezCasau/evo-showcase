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
}

export type ReflectionPost = CommunityPost & { type: 'reflection'; title: string }
export type PhrasePost = CommunityPost & { type: 'phrase' }

export type Comment = {
  id: string
  author: User
  body: string
  upCount: number
  createdAt: string
}

export type ConversationItem = {
  id: string
  type: 'reflection' | 'phrase'
  title: string
  updatedAt: string
  isFavorite?: boolean
  folderId?: string | null
}

export type SidebarFolder = {
  id: string
  name: string
}
