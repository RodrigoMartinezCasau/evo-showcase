import type { User, UserStats } from '../types'

export const mockCurrentUser: User = {
  id: 'me',
  username: 'RODRIGOMARTINEZ',
  clanId: 'nihilista',
  rank: 'aprendiz',
}

export const mockUserStats: UserStats = {
  dailyUsesLeft: 30,
  streak: 30,
  unlockedPhrases: 30,
  unlockedPhrasesTotal: 1000,
}
