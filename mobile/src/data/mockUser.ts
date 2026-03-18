import type { User, UserStats } from '../types'

export const mockCurrentUser: User = {
  id: 'me',
  username: 'RODRIGOMARTINEZ',
  // Pre-assignment default: no clan yet.
  clanId: null,
  rank: 'aprendiz',
}

export const mockUserStats: UserStats = {
  dailyUsesLeft: 30,
  streak: 30,
  unlockedPhrases: 30,
  unlockedPhrasesTotal: 1000,
}
