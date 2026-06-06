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
import { getRankForUser } from '@evoconn/utils/getRankFromPct';

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
  /** Snapshot of the author's display name at publish time (survives restarts). */
  authorUsername?: string;
  authorClanId?: string | null;
  authorRank?: Rank;
  type: 'reflection' | 'phrase';
  title?: string;
  body: string;
  quoteAuthor?: string;
  createdAt: string;
  /** Pista de audio adjunta (biblioteca `audio_tracks`). Suena solo en "Para ti". */
  audioTrackId?: string | null;
  /** Volumen elegido por el autor para su publicación (0 = mudo … 1 = máx). */
  audioVolume?: number | null;
  /** Foto adjunta (bucket `post-images`, ya moderada). URL pública o null. */
  imageUrl?: string | null;
  /** Dimensiones originales de la foto (aspect ratio sin medir). */
  imageWidth?: number | null;
  imageHeight?: number | null;
  imageCropFocusY?: number | null;
  imageCropFocusYFollowing?: number | null;
  imageShowParaTi?: boolean | null;
  imageShowSiguiendo?: boolean | null;
  /** User IDs that upvoted — max combined with downvoterIds ≤ 8, author excluded. */
  upvoterIds: string[];
  downvoterIds: string[];
  /** User IDs that saved this post initially. */
  saverIds: string[];
};

/** True for frases y reflexiones publicadas (excluye cualquier otro `type` en `posts`). */
export function isPublishedSimPostType(t: unknown): t is SimPost['type'] {
  return t === 'reflection' || t === 'phrase';
}

export type SimComment = {
  id: string;
  postId: string;
  authorId: string;
  /** Snapshot of the author's display name at comment time (survives restarts). */
  authorUsername?: string;
  authorClanId?: string | null;
  authorRank?: Rank;
  body: string;
  upCount: number;
  createdAt: string;
  /**
   * Si está informado, este comentario es una respuesta a otro comentario
   * del mismo post. La UI muestra los comentarios con `parentId == null`
   * como raíces y agrupa los hijos en un hilo plegable.
   */
  parentId?: string | null;
};

/** followerId → array of followed user IDs */
export type FollowGraph = Record<string, string[]>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const H = 3_600_000;
const D = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/**
 * Derives rank considering both dominant clan percentage and whether
 * a clan has been assigned. Users without a clan are always 'aprendiz'.
 */
function rankFrom(pcts: ClanPct[], clanId: string | null): Rank {
  const dominant = pcts[0]?.pct ?? 0;
  return getRankForUser(dominant, clanId);
}

// ─── 9 Simulated Users ────────────────────────────────────────────────────────
// Rank is derived automatically from philosophyPercentages[0].pct via rankFrom().
// Do NOT set rank manually — it will be overwritten at the end of this array.

const _SIM_USERS_RAW: Omit<SimUser, 'rank'>[] = [
  {
    id: 'u1',
    username: '@INVITADO',
    clanId: null,
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

/** Rank auto-computed from dominant clan percentage and clanId — never stale. */
export const SIM_USERS: SimUser[] = _SIM_USERS_RAW.map(u => ({
  ...u,
  rank: rankFrom(u.philosophyPercentages, u.clanId),
}));

/** Quick lookup map — built once at module load. */
export const SIM_USERS_BY_ID: Record<string, SimUser> = Object.fromEntries(
  SIM_USERS.map(u => [u.id, u]),
);

// ─── Follow Graph ─────────────────────────────────────────────────────────────
// Mutual pairs:  u1↔u2, u1↔u4, u1↔u5, u1↔u7
//                u4↔u5, u4↔u8, u5↔u6, u5↔u7
//                u6↔u9, u8↔u9

// Cleared for public launch — all users start with zero follows.
export const SIM_FOLLOW_GRAPH: FollowGraph = {};

// Derived follower counts (computed from the graph above)
// u1: 4  u2: 3  u3: 3  u4: 4  u5: 5  u6: 4  u7: 3  u8: 4  u9: 3

// ─── Posts ────────────────────────────────────────────────────────────────────
// Seed posts represent realistic activity within the current 30-day ranking
// period (all within the last 26 days so they always fall inside the window).
// SimulationContext merges these with any posts published in-app (AsyncStorage).
//
// Cleared for public launch — all posts start from scratch.
export const SIM_POSTS: SimPost[] = [];

/** Quick lookup map for posts. */
export const SIM_POSTS_BY_ID: Record<string, SimPost> = Object.fromEntries(
  SIM_POSTS.map(p => [p.id, p]),
);

// ─── Comments ─────────────────────────────────────────────────────────────────

// Cleared for public launch.
export const SIM_COMMENTS: SimComment[] = [];

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
