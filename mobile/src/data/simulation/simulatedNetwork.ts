/**
 * simulatedNetwork.ts
 *
 * Single source of truth for the 9-user simulation.
 * All data here is the SEED (initial state).
 * SimulationContext holds the mutable runtime copy.
 *
 * Rules:
 *  - Exactly 9 users, each representing one clan/state
 *  - Every ID in followers/following/voters/savers resolves to one of the 9 users
 *  - No post has more than 8 votes (upvoters + downvoters), author never votes own post
 */
import type { Rank } from '@evoconn/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClanPct = { clanId: string; label: string; pct: number };

export type SimUser = {
  id: string;
  username: string;          // includes leading @
  clanId: string | null;
  rank: Rank;
  insigniaPhrase: string;
  philosophyPercentages: ClanPct[];
  totalReflections: number;
  totalQuotes: number;
  streakDays: number;
  remainingUses: number;
  unlockedPhrases: number;
  recommendedBookIds: string[];
};

export type SimPost = {
  id: string;
  authorId: string;
  type: 'reflection' | 'phrase';
  title?: string;
  body: string;
  quoteAuthor?: string;
  createdAt: string;
  /** User IDs that upvoted — max combined with downvoterIds ≤ 8, author excluded. */
  upvoterIds: string[];
  downvoterIds: string[];
  /** User IDs that saved this post initially. */
  saverIds: string[];
};

export type SimComment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  upCount: number;
  createdAt: string;
};

/** followerId → array of followed user IDs */
export type FollowGraph = Record<string, string[]>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const H = 3_600_000;
const D = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

// ─── 9 Simulated Users ────────────────────────────────────────────────────────

export const SIM_USERS: SimUser[] = [
  {
    id: 'u1',
    username: '@RODRIGOMARTINEZ',
    clanId: null,
    rank: 'aprendiz',
    insigniaPhrase: '"El universo no tiene obligación de tener sentido para ti."',
    philosophyPercentages: [
      { clanId: 'existencialista', label: 'Existencialista', pct: 40 },
      { clanId: 'nihilista',       label: 'Nihilista',       pct: 30 },
      { clanId: 'estoico',         label: 'Estoico',         pct: 20 },
      { clanId: 'racionalista',    label: 'Racionalista',    pct: 10 },
    ],
    totalReflections: 0,
    totalQuotes: 0,
    streakDays: 0,
    remainingUses: 10,
    unlockedPhrases: 0,
    recommendedBookIds: [],
  },
  {
    id: 'u2',
    username: '@DIEGOLLUBERES',
    clanId: 'nihilista',
    rank: 'maestro',
    insigniaPhrase: '"El vacío no es ausencia — es el lienzo donde todo comienza."',
    philosophyPercentages: [
      { clanId: 'nihilista',       label: 'Nihilista',       pct: 65 },
      { clanId: 'existencialista', label: 'Existencialista', pct: 20 },
      { clanId: 'estoico',         label: 'Estoico',         pct: 10 },
      { clanId: 'racionalista',    label: 'Racionalista',    pct:  5 },
    ],
    totalReflections: 0,
    totalQuotes: 0,
    streakDays: 0,
    remainingUses: 10,
    unlockedPhrases: 0,
    recommendedBookIds: [],
  },
  {
    id: 'u3',
    username: '@VALENTINAORTIZ',
    clanId: 'cientista',
    rank: 'aprendiz',
    insigniaPhrase: '"La realidad no se negocia — se comprende."',
    philosophyPercentages: [
      { clanId: 'cientista',    label: 'Cientista',    pct: 55 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 25 },
      { clanId: 'realista',     label: 'Realista',     pct: 15 },
      { clanId: 'humanista',    label: 'Humanista',    pct:  5 },
    ],
    totalReflections: 0,
    totalQuotes: 0,
    streakDays: 0,
    remainingUses: 10,
    unlockedPhrases: 0,
    recommendedBookIds: [],
  },
  {
    id: 'u4',
    username: '@ALEJANDROSERRANO',
    clanId: 'estoico',
    rank: 'filosofo',
    insigniaPhrase: '"La virtud no necesita aplausos. Se sostiene sola."',
    philosophyPercentages: [
      { clanId: 'estoico',      label: 'Estoico',      pct: 70 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 15 },
      { clanId: 'humanista',    label: 'Humanista',    pct: 10 },
      { clanId: 'realista',     label: 'Realista',     pct:  5 },
    ],
    totalReflections: 0,
    totalQuotes: 0,
    streakDays: 0,
    remainingUses: 10,
    unlockedPhrases: 0,
    recommendedBookIds: [],
  },
  {
    id: 'u5',
    username: '@PABLOMORENO',
    clanId: 'existencialista',
    rank: 'maestro',
    insigniaPhrase: '"Existir es elegir, y elegir es crear sentido donde no lo hay."',
    philosophyPercentages: [
      { clanId: 'existencialista', label: 'Existencialista',  pct: 60 },
      { clanId: 'nihilista',       label: 'Nihilista',        pct: 20 },
      { clanId: 'trascendentalista', label: 'Trascendentalista', pct: 12 },
      { clanId: 'humanista',       label: 'Humanista',        pct:  8 },
    ],
    totalReflections: 0,
    totalQuotes: 0,
    streakDays: 0,
    remainingUses: 10,
    unlockedPhrases: 0,
    recommendedBookIds: [],
  },
  {
    id: 'u6',
    username: '@SOFIAREYES',
    clanId: 'trascendentalista',
    rank: 'filosofo',
    insigniaPhrase: '"Lo visible es apenas el umbral de lo verdadero."',
    philosophyPercentages: [
      { clanId: 'trascendentalista', label: 'Trascendentalista', pct: 65 },
      { clanId: 'humanista',         label: 'Humanista',         pct: 15 },
      { clanId: 'existencialista',   label: 'Existencialista',   pct: 12 },
      { clanId: 'racionalista',      label: 'Racionalista',      pct:  8 },
    ],
    totalReflections: 0,
    totalQuotes: 0,
    streakDays: 0,
    remainingUses: 10,
    unlockedPhrases: 0,
    recommendedBookIds: [],
  },
  {
    id: 'u7',
    username: '@MARIANALOPEZ',
    clanId: 'humanista',
    rank: 'aprendiz',
    insigniaPhrase: '"La dignidad no se concede — se reconoce."',
    philosophyPercentages: [
      { clanId: 'humanista',    label: 'Humanista',    pct: 55 },
      { clanId: 'realista',     label: 'Realista',     pct: 20 },
      { clanId: 'estoico',      label: 'Estoico',      pct: 15 },
      { clanId: 'trascendentalista', label: 'Trascendentalista', pct: 10 },
    ],
    totalReflections: 0,
    totalQuotes: 0,
    streakDays: 0,
    remainingUses: 10,
    unlockedPhrases: 0,
    recommendedBookIds: [],
  },
  {
    id: 'u8',
    username: '@HERNANCHACON',
    clanId: 'realista',
    rank: 'maestro',
    insigniaPhrase: '"Lo que es, es. Lo demás es ruido."',
    philosophyPercentages: [
      { clanId: 'realista',     label: 'Realista',     pct: 60 },
      { clanId: 'estoico',      label: 'Estoico',      pct: 20 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 15 },
      { clanId: 'cientista',    label: 'Cientista',    pct:  5 },
    ],
    totalReflections: 0,
    totalQuotes: 0,
    streakDays: 0,
    remainingUses: 10,
    unlockedPhrases: 0,
    recommendedBookIds: [],
  },
  {
    id: 'u9',
    username: '@CARLOSDUARTE',
    clanId: 'racionalista',
    rank: 'filosofo',
    insigniaPhrase: '"La razón es el único faro en la oscuridad."',
    philosophyPercentages: [
      { clanId: 'racionalista', label: 'Racionalista', pct: 70 },
      { clanId: 'cientista',    label: 'Cientista',    pct: 15 },
      { clanId: 'estoico',      label: 'Estoico',      pct: 10 },
      { clanId: 'realista',     label: 'Realista',     pct:  5 },
    ],
    totalReflections: 0,
    totalQuotes: 0,
    streakDays: 0,
    remainingUses: 10,
    unlockedPhrases: 0,
    recommendedBookIds: [],
  },
];

/** Quick lookup map — built once at module load. */
export const SIM_USERS_BY_ID: Record<string, SimUser> = Object.fromEntries(
  SIM_USERS.map(u => [u.id, u]),
);

// ─── Follow Graph ─────────────────────────────────────────────────────────────
// Mutual pairs:  u1↔u2, u1↔u4, u1↔u5, u1↔u7
//                u4↔u5, u4↔u8, u5↔u6, u5↔u7
//                u6↔u9, u8↔u9

export const SIM_FOLLOW_GRAPH: FollowGraph = {
  u1: ['u2', 'u4', 'u5', 'u7'],
  u2: ['u1', 'u3', 'u5', 'u8'],
  u3: ['u2', 'u6', 'u9'],
  u4: ['u1', 'u5', 'u6', 'u8'],
  u5: ['u1', 'u4', 'u6', 'u7'],
  u6: ['u3', 'u4', 'u5', 'u9'],
  u7: ['u1', 'u5', 'u8'],
  u8: ['u2', 'u4', 'u7', 'u9'],
  u9: ['u3', 'u6', 'u8'],
};

// Derived follower counts (computed from the graph above)
// u1: 4  u2: 3  u3: 3  u4: 4  u5: 5  u6: 4  u7: 3  u8: 4  u9: 3

// ─── Posts ────────────────────────────────────────────────────────────────────
// Seed posts have been removed. All posts are now created by real in-app
// publish actions and persisted via SimulationContext → AsyncStorage.

export const SIM_POSTS: SimPost[] = [];

/** Quick lookup map for posts. */
export const SIM_POSTS_BY_ID: Record<string, SimPost> = Object.fromEntries(
  SIM_POSTS.map(p => [p.id, p]),
);

// ─── Comments ─────────────────────────────────────────────────────────────────

export const SIM_COMMENTS: SimComment[] = [
  { id: 'co1', postId: 'p-u5-1', authorId: 'u1', body: 'Exactamente lo que sentí al leer a Sartre por primera vez.', upCount: 3, createdAt: ago(10 * H) },
  { id: 'co2', postId: 'p-u5-1', authorId: 'u4', body: 'El libre albedrío como carga — tema inagotable.', upCount: 2, createdAt: ago(8 * H) },
  { id: 'co3', postId: 'p-u4-2', authorId: 'u5', body: 'Marco Aurelio siempre en el momento justo.', upCount: 5, createdAt: ago(3 * D) },
  { id: 'co4', postId: 'p-u2-2', authorId: 'u1', body: 'Nietzsche nunca decepciona.', upCount: 1, createdAt: ago(6 * D) },
  { id: 'co5', postId: 'p-u6-1', authorId: 'u5', body: 'El viaje interior es el único que vale la pena.', upCount: 4, createdAt: ago(1 * D) },
  { id: 'co6', postId: 'p-u9-2', authorId: 'u3', body: 'La base de todo pensamiento crítico moderno.', upCount: 2, createdAt: ago(2 * D) },
  { id: 'co7', postId: 'p-u1-1', authorId: 'u7', body: 'El silencio como honestidad — profundo.', upCount: 3, createdAt: ago(1 * D) },
  { id: 'co8', postId: 'p-u8-1', authorId: 'u9', body: 'La realidad no se negocia. Coincido.', upCount: 1, createdAt: ago(20 * H) },
];

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** Map from clanId (or '__sinclan__') → simUser ID for DebugClanSelector wiring. */
export const CLAN_TO_USER_ID: Record<string, string> = {
  '__sinclan__':       'u1',
  'nihilista':         'u2',
  'cientista':         'u3',
  'estoico':           'u4',
  'existencialista':   'u5',
  'trascendentalista': 'u6',
  'humanista':         'u7',
  'realista':          'u8',
  'racionalista':      'u9',
};

/** Reverse map from userId → clanId (null for u1). */
export const USER_ID_TO_CLAN: Record<string, string | null> = {
  u1: null,
  u2: 'nihilista',
  u3: 'cientista',
  u4: 'estoico',
  u5: 'existencialista',
  u6: 'trascendentalista',
  u7: 'humanista',
  u8: 'realista',
  u9: 'racionalista',
};
