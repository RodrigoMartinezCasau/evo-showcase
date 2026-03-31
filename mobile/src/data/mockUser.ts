import type { User, UserStats } from '../types'

export const mockCurrentUser: User = {
  id: 'me',
  username: 'RODRIGOMARTINEZ',
  clanId: null,
  rank: 'aprendiz',
  followersCount: 42,
  followingCount: 3,
}

export const mockUserStats: UserStats = {
  dailyUsesLeft: 30,
  streak: 30,
  unlockedPhrases: 30,
  unlockedPhrasesTotal: 1000,
}

/** IDs of users the current user follows at app start (mock seed). */
export const MOCK_INITIAL_FOLLOWING: string[] = ['1', '3']
