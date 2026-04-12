import type { CommunityPost, User } from '../types';
import { mockCurrentUser } from './mockUser';

export type FriendEntry = {
  id: string;
  username: string;
  clanId: string | null;
};

export type PersonalProfile = {
  id: string;
  username: string;
  clanId: string | null;
  rank: 'aprendiz' | 'maestro' | 'filosofo';
  followersCount: number;
  followingCount: number;
  insigniaPhrase: string;
  philosophyPercentages: { clanId: string; label: string; pct: number }[];
  totalReflections: number;
  totalQuotes: number;
  recentPosts: CommunityPost[];
  friends: FriendEntry[];
  savedPosts: CommunityPost[];
};

const ME_AS_AUTHOR: User = {
  id: mockCurrentUser.id,
  username: mockCurrentUser.username,
  clanId: mockCurrentUser.clanId,
  rank: mockCurrentUser.rank,
  followersCount: mockCurrentUser.followersCount,
  followingCount: mockCurrentUser.followingCount,
};

export const MOCK_PERSONAL_PROFILE: PersonalProfile = {
  id: mockCurrentUser.id,
  username: mockCurrentUser.username,
  clanId: mockCurrentUser.clanId,
  rank: mockCurrentUser.rank,
  followersCount: mockCurrentUser.followersCount ?? 42,
  followingCount: mockCurrentUser.followingCount ?? 3,
  insigniaPhrase: '"El universo no tiene obligación de tener sentido para ti."',
  philosophyPercentages: [
    { clanId: 'existencialista', label: 'Existencialista', pct: 40 },
    { clanId: 'nihilista', label: 'Nihilista', pct: 30 },
    { clanId: 'estoico', label: 'Estoico', pct: 20 },
    { clanId: 'racionalista', label: 'Racionalista', pct: 10 },
  ],
  totalReflections: 15,
  totalQuotes: 7,
  recentPosts: [
    {
      id: 'own-p1',
      type: 'reflection',
      author: ME_AS_AUTHOR,
      title: 'LA VERDAD DEL SILENCIO',
      body: 'A veces callar es la forma más honesta de decir algo.',
      voteStats: { up: 88, down: 3, save: 12 },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'own-p2',
      type: 'phrase',
      author: ME_AS_AUTHOR,
      body: 'El hombre está condenado a ser libre.',
      quoteAuthor: 'Sartre',
      voteStats: { up: 210, down: 8, save: 45 },
      createdAt: new Date().toISOString(),
    },
  ],
  friends: [
    { id: '1', username: '@DIEGOLLUBERES', clanId: 'nihilista' },
    { id: '2', username: '@ALEJANDROSERRANO', clanId: 'estoico' },
    { id: '4', username: '@HERNANCHACON', clanId: 'realista' },
    { id: '5', username: '@CARLOSDUARTE', clanId: 'racionalista' },
    { id: '6', username: '@MARIANALOPEZ', clanId: 'humanista' },
    { id: '7', username: '@PABLOMORENO', clanId: 'existencialista' },
    { id: '8', username: '@SOFIAREYES', clanId: 'trascendentalista' },
  ],
  savedPosts: [
    {
      id: 'saved-1',
      type: 'reflection',
      author: { id: '1', username: '@DIEGOLLUBERES', clanId: 'nihilista', rank: 'maestro' },
      title: 'AHORRAR TIEMPO SUCKS',
      body: 'Intentamos ganar minutos, pero la vida no se acelera.',
      voteStats: { up: 508, down: 347, save: 31 },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'saved-2',
      type: 'phrase',
      author: { id: '2', username: '@ALEJANDROSERRANO', clanId: 'estoico', rank: 'filosofo' },
      body: 'No busques la felicidad fuera. Construye el camino desde dentro.',
      quoteAuthor: 'Nietzsche',
      voteStats: { up: 1870, down: 22, save: 145 },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'saved-3',
      type: 'reflection',
      author: { id: '4', username: '@HERNANCHACON', clanId: 'realista', rank: 'aprendiz' },
      title: 'NO TENGAS MIEDO PRECIOSA',
      body: 'El miedo es la brújula que señala exactamente adonde necesitas ir.',
      voteStats: { up: 420, down: 12, save: 88 },
      createdAt: new Date().toISOString(),
    },
  ],
};

export function getPersonalProfile(): PersonalProfile {
  return MOCK_PERSONAL_PROFILE;
}
