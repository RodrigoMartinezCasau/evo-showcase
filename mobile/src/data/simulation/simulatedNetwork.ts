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
    totalReflections: 1,
    totalQuotes: 0,
    streakDays: 3,
    remainingUses: 10,
    unlockedPhrases: 0,
    recommendedBookIds: [],
  },
  {
    id: 'u2',
    username: '@DIEGOLLUBERES',
    clanId: null,
    rank: 'maestro',
    insigniaPhrase: '"El vacío no es ausencia — es el lienzo donde todo comienza."',
    philosophyPercentages: [
      { clanId: 'nihilista',       label: 'Nihilista',       pct: 65 },
      { clanId: 'existencialista', label: 'Existencialista', pct: 20 },
      { clanId: 'estoico',         label: 'Estoico',         pct: 10 },
      { clanId: 'racionalista',    label: 'Racionalista',    pct:  5 },
    ],
    totalReflections: 1,
    totalQuotes: 1,
    streakDays: 6,
    remainingUses: 10,
    unlockedPhrases: 3,
    recommendedBookIds: [],
  },
  {
    id: 'u3',
    username: '@VALENTINAORTIZ',
    clanId: null,
    rank: 'aprendiz',
    insigniaPhrase: '"La realidad no se negocia — se comprende."',
    philosophyPercentages: [
      { clanId: 'cientista',    label: 'Cientista',    pct: 55 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 25 },
      { clanId: 'realista',     label: 'Realista',     pct: 15 },
      { clanId: 'humanista',    label: 'Humanista',    pct:  5 },
    ],
    totalReflections: 0,
    totalQuotes: 1,
    streakDays: 2,
    remainingUses: 10,
    unlockedPhrases: 1,
    recommendedBookIds: [],
  },
  {
    id: 'u4',
    username: '@ALEJANDROSERRANO',
    clanId: null,
    rank: 'filosofo',
    insigniaPhrase: '"La virtud no necesita aplausos. Se sostiene sola."',
    philosophyPercentages: [
      { clanId: 'estoico',      label: 'Estoico',      pct: 70 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 15 },
      { clanId: 'humanista',    label: 'Humanista',    pct: 10 },
      { clanId: 'realista',     label: 'Realista',     pct:  5 },
    ],
    totalReflections: 2,
    totalQuotes: 1,
    streakDays: 14,
    remainingUses: 10,
    unlockedPhrases: 5,
    recommendedBookIds: [],
  },
  {
    id: 'u5',
    username: '@PABLOMORENO',
    clanId: null,
    rank: 'maestro',
    insigniaPhrase: '"Existir es elegir, y elegir es crear sentido donde no lo hay."',
    philosophyPercentages: [
      { clanId: 'existencialista',   label: 'Existencialista',   pct: 60 },
      { clanId: 'nihilista',         label: 'Nihilista',         pct: 20 },
      { clanId: 'trascendentalista', label: 'Trascendentalista', pct: 12 },
      { clanId: 'humanista',         label: 'Humanista',         pct:  8 },
    ],
    totalReflections: 3,
    totalQuotes: 1,
    streakDays: 21,
    remainingUses: 10,
    unlockedPhrases: 7,
    recommendedBookIds: [],
  },
  {
    id: 'u6',
    username: '@SOFIAREYES',
    clanId: null,
    rank: 'filosofo',
    insigniaPhrase: '"Lo visible es apenas el umbral de lo verdadero."',
    philosophyPercentages: [
      { clanId: 'trascendentalista', label: 'Trascendentalista', pct: 65 },
      { clanId: 'humanista',         label: 'Humanista',         pct: 15 },
      { clanId: 'existencialista',   label: 'Existencialista',   pct: 12 },
      { clanId: 'racionalista',      label: 'Racionalista',      pct:  8 },
    ],
    totalReflections: 2,
    totalQuotes: 1,
    streakDays: 12,
    remainingUses: 10,
    unlockedPhrases: 4,
    recommendedBookIds: [],
  },
  {
    id: 'u7',
    username: '@MARIANALOPEZ',
    clanId: null,
    rank: 'aprendiz',
    insigniaPhrase: '"La dignidad no se concede — se reconoce."',
    philosophyPercentages: [
      { clanId: 'humanista',         label: 'Humanista',         pct: 55 },
      { clanId: 'realista',          label: 'Realista',          pct: 20 },
      { clanId: 'estoico',           label: 'Estoico',           pct: 15 },
      { clanId: 'trascendentalista', label: 'Trascendentalista', pct: 10 },
    ],
    totalReflections: 1,
    totalQuotes: 0,
    streakDays: 4,
    remainingUses: 10,
    unlockedPhrases: 1,
    recommendedBookIds: [],
  },
  {
    id: 'u8',
    username: '@HERNANCHACON',
    clanId: null,
    rank: 'maestro',
    insigniaPhrase: '"Lo que es, es. Lo demás es ruido."',
    philosophyPercentages: [
      { clanId: 'realista',     label: 'Realista',     pct: 60 },
      { clanId: 'estoico',      label: 'Estoico',      pct: 20 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 15 },
      { clanId: 'cientista',    label: 'Cientista',    pct:  5 },
    ],
    totalReflections: 1,
    totalQuotes: 1,
    streakDays: 8,
    remainingUses: 10,
    unlockedPhrases: 3,
    recommendedBookIds: [],
  },
  {
    id: 'u9',
    username: '@CARLOSDUARTE',
    clanId: null,
    rank: 'filosofo',
    insigniaPhrase: '"La razón es el único faro en la oscuridad."',
    philosophyPercentages: [
      { clanId: 'racionalista', label: 'Racionalista', pct: 70 },
      { clanId: 'cientista',    label: 'Cientista',    pct: 15 },
      { clanId: 'estoico',      label: 'Estoico',      pct: 10 },
      { clanId: 'realista',     label: 'Realista',     pct:  5 },
    ],
    totalReflections: 1,
    totalQuotes: 1,
    streakDays: 9,
    remainingUses: 10,
    unlockedPhrases: 4,
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
// Seed posts represent realistic activity within the current 30-day ranking
// period (all within the last 26 days so they always fall inside the window).
// SimulationContext merges these with any posts published in-app (AsyncStorage).
//
// Activity distribution → ranking points (posts / 1 member per clan):
//   existencialista  4 posts → 4.0 pts  (rank 1)
//   estoico          3 posts → 3.0 pts  (rank 2)
//   trascendentalista 3 posts → 3.0 pts (rank 2 tie)
//   nihilista        2 posts → 2.0 pts  (rank 4)
//   racionalista     2 posts → 2.0 pts  (rank 4 tie)
//   realista         2 posts → 2.0 pts  (rank 4 tie)
//   humanista        1 post  → 1.0 pts  (rank 7)
//   cientista        1 post  → 1.0 pts  (rank 7 tie)

export const SIM_POSTS: SimPost[] = [

  // ── u1 · @RODRIGOMARTINEZ · sin clan ──────────────────────────────────────
  {
    id: 'p-u1-1',
    authorId: 'u1',
    type: 'reflection',
    body: 'No tener clan no es un defecto. Es una pregunta abierta.',
    createdAt: ago(1 * D),
    upvoterIds: ['u5', 'u7'],
    downvoterIds: [],
    saverIds: ['u4'],
  },

  // ── u2 · @DIEGOLLUBERES · nihilista ────────────────────────────────────────
  {
    id: 'p-u2-1',
    authorId: 'u2',
    type: 'reflection',
    body: 'El sentido no existe. Lo inventamos para soportarlo. Eso tampoco es malo.',
    createdAt: ago(5 * D),
    upvoterIds: ['u1', 'u5'],
    downvoterIds: ['u4'],
    saverIds: ['u1'],
  },
  {
    id: 'p-u2-2',
    authorId: 'u2',
    type: 'phrase',
    title: 'Friedrich Nietzsche',
    body: 'Quien tiene un porqué puede soportar casi cualquier cómo.',
    quoteAuthor: 'Friedrich Nietzsche',
    createdAt: ago(6 * D),
    upvoterIds: ['u1', 'u8', 'u9'],
    downvoterIds: [],
    saverIds: ['u5', 'u9'],
  },

  // ── u3 · @VALENTINAORTIZ · cientista ───────────────────────────────────────
  {
    id: 'p-u3-1',
    authorId: 'u3',
    type: 'phrase',
    title: 'Carl Sagan',
    body: 'Somos polvo de estrellas contemplándose a sí mismo.',
    quoteAuthor: 'Carl Sagan',
    createdAt: ago(11 * D),
    upvoterIds: ['u6', 'u9'],
    downvoterIds: [],
    saverIds: ['u6'],
  },

  // ── u4 · @ALEJANDROSERRANO · estoico ───────────────────────────────────────
  {
    id: 'p-u4-1',
    authorId: 'u4',
    type: 'reflection',
    body: 'Lo que perturba a los hombres no son las cosas, sino las opiniones sobre las cosas.',
    createdAt: ago(2 * D),
    upvoterIds: ['u5', 'u6', 'u9'],
    downvoterIds: [],
    saverIds: ['u5', 'u6'],
  },
  {
    id: 'p-u4-2',
    authorId: 'u4',
    type: 'phrase',
    title: 'Marco Aurelio',
    body: 'Pierdes el tiempo cuando lo gastas en lo que no depende de ti.',
    quoteAuthor: 'Marco Aurelio',
    createdAt: ago(4 * D),
    upvoterIds: ['u1', 'u5', 'u8'],
    downvoterIds: [],
    saverIds: ['u1', 'u8'],
  },
  {
    id: 'p-u4-3',
    authorId: 'u4',
    type: 'reflection',
    body: 'La disciplina no limita la libertad. Es la forma más alta de ella.',
    createdAt: ago(14 * D),
    upvoterIds: ['u6', 'u9'],
    downvoterIds: ['u2'],
    saverIds: ['u9'],
  },

  // ── u5 · @PABLOMORENO · existencialista ────────────────────────────────────
  {
    id: 'p-u5-1',
    authorId: 'u5',
    type: 'reflection',
    body: 'La libertad es la condena más bella que existe. Sartre no mentía.',
    createdAt: ago(3 * D),
    upvoterIds: ['u1', 'u4', 'u6'],
    downvoterIds: [],
    saverIds: ['u1', 'u6'],
  },
  {
    id: 'p-u5-2',
    authorId: 'u5',
    type: 'reflection',
    body: 'Somos lo que hacemos con lo que hicieron de nosotros. Y con lo que no hicieron.',
    createdAt: ago(7 * D),
    upvoterIds: ['u7', 'u8'],
    downvoterIds: [],
    saverIds: ['u7'],
  },
  {
    id: 'p-u5-3',
    authorId: 'u5',
    type: 'reflection',
    body: 'No hay esencia antes de la existencia. Cada acto te define más que cualquier naturaleza.',
    createdAt: ago(13 * D),
    upvoterIds: ['u1', 'u6'],
    downvoterIds: ['u9'],
    saverIds: ['u6'],
  },
  {
    id: 'p-u5-4',
    authorId: 'u5',
    type: 'phrase',
    title: 'Albert Camus',
    body: 'Hay que imaginarse a Sísifo feliz.',
    quoteAuthor: 'Albert Camus',
    createdAt: ago(18 * D),
    upvoterIds: ['u2', 'u4', 'u7'],
    downvoterIds: [],
    saverIds: ['u2', 'u7'],
  },

  // ── u6 · @SOFIAREYES · trascendentalista ───────────────────────────────────
  {
    id: 'p-u6-1',
    authorId: 'u6',
    type: 'reflection',
    body: 'El alma no tiene coordenadas geográficas. Y en eso reside su fuerza.',
    createdAt: ago(1 * D),
    upvoterIds: ['u5', 'u7', 'u1'],
    downvoterIds: [],
    saverIds: ['u5'],
  },
  {
    id: 'p-u6-2',
    authorId: 'u6',
    type: 'reflection',
    body: 'Emerson lo dijo antes que todos: lo que llamamos destino es en realidad carácter.',
    createdAt: ago(8 * D),
    upvoterIds: ['u4', 'u9'],
    downvoterIds: [],
    saverIds: ['u4'],
  },
  {
    id: 'p-u6-3',
    authorId: 'u6',
    type: 'phrase',
    title: 'Henry David Thoreau',
    body: 'Fui a los bosques porque quería vivir con propósito y no descubrir, al morir, que no había vivido.',
    quoteAuthor: 'Henry David Thoreau',
    createdAt: ago(15 * D),
    upvoterIds: ['u5', 'u7', 'u1'],
    downvoterIds: [],
    saverIds: ['u5', 'u1'],
  },

  // ── u7 · @MARIANALOPEZ · humanista ─────────────────────────────────────────
  {
    id: 'p-u7-1',
    authorId: 'u7',
    type: 'reflection',
    body: 'Reconocer la dignidad del otro no es virtud — es el primer acto filosófico posible.',
    createdAt: ago(10 * D),
    upvoterIds: ['u1', 'u5'],
    downvoterIds: [],
    saverIds: ['u5'],
  },

  // ── u8 · @HERNANCHACON · realista ──────────────────────────────────────────
  {
    id: 'p-u8-1',
    authorId: 'u8',
    type: 'reflection',
    body: 'La realidad no te pide permiso. Solo te pide atención.',
    createdAt: ago(20 * H),
    upvoterIds: ['u4', 'u9'],
    downvoterIds: [],
    saverIds: ['u4'],
  },
  {
    id: 'p-u8-2',
    authorId: 'u8',
    type: 'phrase',
    title: 'Arthur Schopenhauer',
    body: 'El mundo es mi representación — y eso cambia absolutamente todo.',
    quoteAuthor: 'Arthur Schopenhauer',
    createdAt: ago(9 * D),
    upvoterIds: ['u2', 'u9'],
    downvoterIds: ['u5'],
    saverIds: ['u9'],
  },

  // ── u9 · @CARLOSDUARTE · racionalista ──────────────────────────────────────
  {
    id: 'p-u9-1',
    authorId: 'u9',
    type: 'reflection',
    body: 'Dudar no es debilidad intelectual. Es el primer acto serio del pensamiento.',
    createdAt: ago(3 * D),
    upvoterIds: ['u3', 'u4'],
    downvoterIds: [],
    saverIds: ['u3'],
  },
  {
    id: 'p-u9-2',
    authorId: 'u9',
    type: 'phrase',
    title: 'René Descartes',
    body: 'Pienso, luego existo — pero primero dudo, luego pienso.',
    quoteAuthor: 'René Descartes',
    createdAt: ago(5 * D),
    upvoterIds: ['u3', 'u6', 'u8'],
    downvoterIds: [],
    saverIds: ['u3', 'u6'],
  },
];

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

/** Reverse map from userId → clanId. All null — nadie ha revelado clan todavía. */
export const USER_ID_TO_CLAN: Record<string, string | null> = {
  u1: null,
  u2: null,
  u3: null,
  u4: null,
  u5: null,
  u6: null,
  u7: null,
  u8: null,
  u9: null,
};
