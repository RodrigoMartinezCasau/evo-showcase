import type { CommunityPost, User } from '../types';
import { mockCurrentUser } from './mockUser';

export type FriendEntry = {
  id: string;
  username: string;
  clanId: string | null;
};

export type FollowerEntry = {
  id: string;
  username: string;
  clanId: string | null;
  rank?: string;
};

export type FollowingEntry = {
  id: string;
  username: string;
  clanId: string | null;
  rank?: string;
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
  followers: FollowerEntry[];
  following: FollowingEntry[];
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
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'own-p2',
      type: 'phrase',
      author: ME_AS_AUTHOR,
      body: 'El hombre está condenado a ser libre.',
      quoteAuthor: 'Sartre',
      voteStats: { up: 210, down: 8, save: 45 },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'own-p3',
      type: 'reflection',
      author: ME_AS_AUTHOR,
      title: 'EL PESO DE LO POSIBLE',
      body: 'La angustia no viene de lo que ocurre, sino de todo lo que podría ocurrir.',
      voteStats: { up: 144, down: 6, save: 28 },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'own-p4',
      type: 'phrase',
      author: ME_AS_AUTHOR,
      body: 'No sufras por lo que puedes controlar, ni por lo que no puedes.',
      quoteAuthor: 'Marco Aurelio',
      voteStats: { up: 320, down: 14, save: 67 },
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'own-p5',
      type: 'reflection',
      author: ME_AS_AUTHOR,
      title: 'IDENTIDAD Y VACÍO',
      body: 'Quizá el yo no es algo que se encuentra, sino algo que se construye cada día.',
      voteStats: { up: 97, down: 11, save: 19 },
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'own-p6',
      type: 'phrase',
      author: ME_AS_AUTHOR,
      body: 'Conocerse a uno mismo es el principio de toda sabiduría.',
      quoteAuthor: 'Aristóteles',
      voteStats: { up: 480, down: 21, save: 93 },
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'own-p7',
      type: 'reflection',
      author: ME_AS_AUTHOR,
      title: 'EL TIEMPO Y LA MEMORIA',
      body: 'Recordar es siempre reinterpretar. No hay pasado puro, solo versiones de él.',
      voteStats: { up: 156, down: 9, save: 34 },
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'own-p8',
      type: 'phrase',
      author: ME_AS_AUTHOR,
      body: 'La vida no examinada no merece ser vivida.',
      quoteAuthor: 'Sócrates',
      voteStats: { up: 612, down: 44, save: 128 },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
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
  followers: [
    { id: '1', username: '@DIEGOLLUBERES', clanId: 'nihilista', rank: 'maestro' },
    { id: '2', username: '@ALEJANDROSERRANO', clanId: 'estoico', rank: 'filosofo' },
    { id: '4', username: '@HERNANCHACON', clanId: 'realista', rank: 'aprendiz' },
    { id: '5', username: '@CARLOSDUARTE', clanId: 'racionalista', rank: 'maestro' },
    { id: '6', username: '@MARIANALOPEZ', clanId: 'humanista', rank: 'aprendiz' },
    { id: '7', username: '@PABLOMORENO', clanId: 'existencialista', rank: 'filosofo' },
    { id: '8', username: '@SOFIAREYES', clanId: 'trascendentalista', rank: 'maestro' },
    { id: '9', username: '@LUCASNIETO', clanId: 'racionalista', rank: 'filosofo' },
    { id: '10', username: '@VALENTINAORTIZ', clanId: 'cientista', rank: 'aprendiz' },
    { id: '11', username: '@FERNANDOVEGA', clanId: 'nihilista', rank: 'maestro' },
  ],
  following: [
    { id: '1',  username: '@DIEGOLLUBERES',    clanId: 'nihilista',       rank: 'maestro'  },
    { id: '2',  username: '@ALEJANDROSERRANO', clanId: 'estoico',         rank: 'filosofo' },
    { id: '4',  username: '@HERNANCHACON',     clanId: 'realista',        rank: 'aprendiz' },
    { id: '6',  username: '@MARIANALOPEZ',     clanId: 'humanista',       rank: 'aprendiz' },
    { id: '7',  username: '@PABLOMORENO',      clanId: 'existencialista', rank: 'filosofo' },
    { id: '9',  username: '@LUCASNIETO',       clanId: 'racionalista',    rank: 'filosofo' },
  ],
};

export function getPersonalProfile(): PersonalProfile {
  return MOCK_PERSONAL_PROFILE;
}
