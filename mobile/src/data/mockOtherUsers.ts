import type { CommunityPost, User, Rank } from '../types';

export type OtherUserProfile = {
  id: string;
  username: string;
  clanId: string | null;
  rank: Rank;
  followersCount: number;
  followingCount: number;
  insigniaPhrase: string;
  philosophyPercentages: { clanId: string; label: string; pct: number }[];
  totalReflections: number;
  totalQuotes: number;
  recentPosts: CommunityPost[];
};

const MOCK_AUTHORS: Record<string, User> = {
  '1': { id: '1', username: '@DIEGOLLUBERES', clanId: 'nihilista', rank: 'maestro', followersCount: 1240, followingCount: 87 },
  '2': { id: '2', username: '@ALEJANDROSERRANO', clanId: 'estoico', rank: 'filosofo', followersCount: 3580, followingCount: 214 },
  '3': { id: '3', username: '@RODRIGOMARTINEZ', clanId: 'existencialista', rank: 'filosofo', followersCount: 8920, followingCount: 156 },
  '4': { id: '4', username: '@HERNANCHACON', clanId: 'realista', rank: 'aprendiz', followersCount: 420, followingCount: 63 },
};

const MOCK_PROFILES: OtherUserProfile[] = [
  {
    id: '1',
    username: '@DIEGOLLUBERES',
    clanId: 'nihilista',
    rank: 'maestro',
    followersCount: 1240,
    followingCount: 87,
    insigniaPhrase: '"El vacío no es ausencia, es el lienzo donde todo comienza."',
    philosophyPercentages: [
      { clanId: 'nihilista', label: 'Nihilista', pct: 65 },
      { clanId: 'existencialista', label: 'Existencialista', pct: 20 },
      { clanId: 'estoico', label: 'Estoico', pct: 10 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 5 },
    ],
    totalReflections: 47,
    totalQuotes: 23,
    recentPosts: [
      { id: 'p1', type: 'reflection', author: MOCK_AUTHORS['1'], title: 'AHORRAR TIEMPO SUCKS', body: 'Intentamos ganar minutos, pero la vida no se acelera.', voteStats: { up: 508, down: 347, save: 31 }, createdAt: new Date().toISOString() },
      { id: 'p5', type: 'phrase', author: MOCK_AUTHORS['1'], body: 'La duda es el principio de la sabiduría.', quoteAuthor: 'Aristóteles', voteStats: { up: 2340, down: 45, save: 190 }, createdAt: new Date().toISOString() },
    ],
  },
  {
    id: '2',
    username: '@ALEJANDROSERRANO',
    clanId: 'estoico',
    rank: 'filosofo',
    followersCount: 3580,
    followingCount: 214,
    insigniaPhrase: '"La virtud no necesita aplausos, se sostiene sola."',
    philosophyPercentages: [
      { clanId: 'estoico', label: 'Estoico', pct: 70 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 15 },
      { clanId: 'humanista', label: 'Humanista', pct: 10 },
      { clanId: 'realista', label: 'Realista', pct: 5 },
    ],
    totalReflections: 112,
    totalQuotes: 58,
    recentPosts: [
      { id: 'p2', type: 'reflection', author: MOCK_AUTHORS['2'], title: 'EL EXITO ES UNA MIERDA', body: 'El éxito prometido nunca coincide con la paz interior que buscabas.', voteStats: { up: 867, down: 12, save: 23 }, createdAt: new Date().toISOString() },
      { id: 'p6', type: 'phrase', author: MOCK_AUTHORS['2'], body: 'No busques la felicidad fuera. Construye el camino desde dentro.', quoteAuthor: 'Nietzsche', voteStats: { up: 1870, down: 22, save: 145 }, createdAt: new Date().toISOString() },
    ],
  },
  {
    id: '3',
    username: '@RODRIGOMARTINEZ',
    clanId: 'existencialista',
    rank: 'filosofo',
    followersCount: 8920,
    followingCount: 156,
    insigniaPhrase: '"Existir es elegir, y elegir es crear sentido donde no lo hay."',
    philosophyPercentages: [
      { clanId: 'existencialista', label: 'Existencialista', pct: 55 },
      { clanId: 'nihilista', label: 'Nihilista', pct: 25 },
      { clanId: 'trascendentalista', label: 'Trascendentalista', pct: 12 },
      { clanId: 'humanista', label: 'Humanista', pct: 8 },
    ],
    totalReflections: 203,
    totalQuotes: 89,
    recentPosts: [
      { id: 'p3', type: 'phrase', author: MOCK_AUTHORS['3'], body: 'Hay personas que llegan a tu vida para quedarse. Y otras que llegan para enseñarte algo.', quoteAuthor: 'Napoleón', voteStats: { up: 127000, down: 987, save: 300 }, createdAt: new Date().toISOString() },
    ],
  },
  {
    id: '4',
    username: '@HERNANCHACON',
    clanId: 'realista',
    rank: 'aprendiz',
    followersCount: 420,
    followingCount: 63,
    insigniaPhrase: '"Lo que es, es. Lo demás es ruido."',
    philosophyPercentages: [
      { clanId: 'realista', label: 'Realista', pct: 60 },
      { clanId: 'estoico', label: 'Estoico', pct: 20 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 15 },
      { clanId: 'cientista', label: 'Cientista', pct: 5 },
    ],
    totalReflections: 18,
    totalQuotes: 9,
    recentPosts: [
      { id: 'p4', type: 'reflection', author: MOCK_AUTHORS['4'], title: 'NO TENGAS MIEDO PRECIOSA', body: 'El miedo es la brújula que señala exactamente adonde necesitas ir.', voteStats: { up: 420, down: 12, save: 88 }, createdAt: new Date().toISOString() },
    ],
  },
];

export function getOtherUserProfile(userId: string): OtherUserProfile | undefined {
  return MOCK_PROFILES.find((p) => p.id === userId);
}

export function getOtherUserProfileOrFallback(userId: string): OtherUserProfile {
  return getOtherUserProfile(userId) ?? MOCK_PROFILES[0];
}
