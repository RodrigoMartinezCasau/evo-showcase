/**
 * mockUser.ts
 *
 * The active simulated user is stored as a mutable in-place object so that
 * all existing imports (`mockCurrentUser`) see the fresh data on every
 * re-render without requiring a full refactor of call sites.
 *
 * `SimulationContext` calls `setActiveSimUser` whenever `activeUserId` changes.
 */
import type { User, UserStats } from '../types';

// Mutable object — mutated via Object.assign so every reference stays live.
// El default queda vacío para que ninguna UI muestre un username "fantasma"
// antes de que AuthContext cargue el perfil real desde Supabase.
const _activeUser: User = {
  id: '',
  username: '',
  clanId: null,
  rank: 'aprendiz',
  followersCount: 0,
  followingCount: 0,
};

/**
 * Called by SimulationContext whenever the active user changes.
 * Mutates `_activeUser` in-place so all existing references remain valid.
 */
export function setActiveSimUser(user: User): void {
  Object.assign(_activeUser, user);
}

/** Returns the current active simulated user. */
export function getCurrentUser(): User {
  return _activeUser;
}

/**
 * Backward-compat export — points to the same mutable object.
 * All call sites see live data because the object is mutated in-place.
 */
export const mockCurrentUser: User = _activeUser;

export const mockUserStats: UserStats = {
  dailyUsesLeft: 28,
  streak: 7,
  unlockedPhrases: 30,
  unlockedPhrasesTotal: 1000,
};

/** IDs of users the current user follows at app start (mock seed — u1 follows u2, u4). */
export const MOCK_INITIAL_FOLLOWING: string[] = ['u2', 'u4'];
