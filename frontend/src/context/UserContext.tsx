'use client'

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'

export type UserStats = {
  groupName: string
  groupIcon?: string
  unlockedPhrasesCount: number
  unlockedPhrasesTotal: number
  usesLeft: number
  streakDays: number
  rankTitle: string
  username: string
}

const DEFAULT_STATS: UserStats = {
  groupName: 'Nihilista',
  unlockedPhrasesCount: 173,
  unlockedPhrasesTotal: 1000,
  usesLeft: 30,
  streakDays: 567,
  rankTitle: 'APRENDIZ',
  username: 'Rodrigo',
}

const UserContext = createContext<UserStats>(DEFAULT_STATS)

export function UserProvider({ children }: { children: ReactNode }) {
  return (
    <UserContext.Provider value={DEFAULT_STATS}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserStats() {
  return useContext(UserContext)
}
