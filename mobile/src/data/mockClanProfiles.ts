import type { CommunityPost, Rank } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────

export type ClanMember = {
  id: string;
  username: string;
  clanId: string | null;
  rank: Rank;
  followersCount?: number;
};

export type ClanStats = {
  members: number;
  publications: number;
  interactionRatio: number; // 0–100
};

export type ClanPhilosophyEntry = {
  clanId: string;
  label: string;
  pct: number;
};

export type ClanProfile = {
  id: string;
  name: string;
  description: string;
  stats: ClanStats;
  philosophyDistribution: ClanPhilosophyEntry[];
  topMembers: ClanMember[];
  recentPosts: CommunityPost[];
};

// ─── Shared authors from the 9-user simulation ────────────────────────────

import { SIM_USERS_BY_ID, SIM_POSTS, SIM_FOLLOW_GRAPH } from './simulation/simulatedNetwork';

function simAuthor(id: string) {
  const u = SIM_USERS_BY_ID[id];
  return u
    ? {
        id: u.id,
        username: u.username,
        clanId: u.clanId,
        rank: u.rank as Rank,
        followersCount: Object.values(SIM_FOLLOW_GRAPH).filter(arr => arr.includes(id)).length,
        followingCount: (SIM_FOLLOW_GRAPH[id] ?? []).length,
      }
    : { id, username: '?', clanId: null, rank: 'aprendiz' as Rank };
}

function postsBy(userId: string) {
  return SIM_POSTS.filter(p => p.authorId === userId).map(p => ({
    id: p.id,
    type: p.type,
    author: simAuthor(p.authorId),
    title: p.title,
    body: p.body,
    quoteAuthor: p.quoteAuthor,
    voteStats: { up: p.upvoterIds.length, down: p.downvoterIds.length, save: p.saverIds.length },
    createdAt: p.createdAt,
  }));
}

const AUTHOR_DIEGO      = simAuthor('u2');
const AUTHOR_ALEJANDRO  = simAuthor('u4');
const AUTHOR_RODRIGO    = simAuthor('u1');
const AUTHOR_HERNAN     = simAuthor('u8');
const AUTHOR_SOFIA      = simAuthor('u6');
const AUTHOR_LUCAS      = simAuthor('u9');

/** Construye un ClanMember con followersCount real del grafo de simulación. */
function member(id: string, rank: Rank): ClanMember {
  const a = simAuthor(id);
  return { id: a.id, username: a.username, clanId: a.clanId, rank, followersCount: a.followersCount };
}

// ─── Clan profiles ────────────────────────────────────────────────────────

const CLAN_PROFILES: ClanProfile[] = [
  {
    id: 'nihilista',
    name: 'Clan Nihilista',
    description: 'La negación de todo valor absoluto como forma de liberación intelectual. El vacío no es ausencia — es el lienzo donde todo comienza.',
    stats: { members: 8400, publications: 74200, interactionRatio: 82 },
    philosophyDistribution: [
      { clanId: 'nihilista', label: 'Nihilista', pct: 60 },
      { clanId: 'existencialista', label: 'Existencialista', pct: 22 },
      { clanId: 'estoico', label: 'Estoico', pct: 12 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 6 },
    ],
    topMembers: [member('u2', 'maestro')],
    recentPosts: postsBy('u2'),
  },
  {
    id: 'estoico',
    name: 'Clan Estoico',
    description: 'Disciplina, razón y control emocional por encima de todo. La virtud no necesita aplausos — se sostiene sola.',
    stats: { members: 12300, publications: 98000, interactionRatio: 87 },
    philosophyDistribution: [
      { clanId: 'estoico', label: 'Estoico', pct: 60 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 20 },
      { clanId: 'existencialista', label: 'Existencialista', pct: 15 },
      { clanId: 'nihilista', label: 'Nihilista', pct: 5 },
    ],
    topMembers: [member('u4', 'filosofo')],
    recentPosts: postsBy('u4'),
  },
  {
    id: 'existencialista',
    name: 'Clan Existencialista',
    description: 'La libertad y la responsabilidad de crear tu propio sentido. Existir es elegir, y elegir es crear sentido donde no lo hay.',
    stats: { members: 9100, publications: 81000, interactionRatio: 79 },
    philosophyDistribution: [
      { clanId: 'existencialista', label: 'Existencialista', pct: 55 },
      { clanId: 'nihilista', label: 'Nihilista', pct: 25 },
      { clanId: 'trascendentalista', label: 'Trascendentalista', pct: 12 },
      { clanId: 'humanista', label: 'Humanista', pct: 8 },
    ],
    topMembers: [member('u5', 'maestro')],
    recentPosts: postsBy('u5'),
  },
  {
    id: 'racionalista',
    name: 'Clan Racionalista',
    description: 'La razón pura como fundamento de todo conocimiento verdadero. Lo que no puede ser demostrado, no merece ser afirmado.',
    stats: { members: 6800, publications: 62000, interactionRatio: 91 },
    philosophyDistribution: [
      { clanId: 'racionalista', label: 'Racionalista', pct: 65 },
      { clanId: 'cientista', label: 'Cientista', pct: 18 },
      { clanId: 'estoico', label: 'Estoico', pct: 12 },
      { clanId: 'realista', label: 'Realista', pct: 5 },
    ],
    topMembers: [member('u9', 'filosofo')],
    recentPosts: postsBy('u9'),
  },
  {
    id: 'humanista',
    name: 'Clan Humanista',
    description: 'El ser humano como medida y fin último de todas las cosas. La empatía y la dignidad como ejes de toda filosofía.',
    stats: { members: 7500, publications: 55000, interactionRatio: 76 },
    philosophyDistribution: [
      { clanId: 'humanista', label: 'Humanista', pct: 58 },
      { clanId: 'existencialista', label: 'Existencialista', pct: 22 },
      { clanId: 'trascendentalista', label: 'Trascendentalista', pct: 14 },
      { clanId: 'estoico', label: 'Estoico', pct: 6 },
    ],
    topMembers: [member('u7', 'aprendiz')],
    recentPosts: postsBy('u7'),
  },
  {
    id: 'realista',
    name: 'Clan Realista',
    description: 'Ver el mundo tal como es, sin ilusiones ni idealizaciones. La claridad brutal como acto de valentía intelectual.',
    stats: { members: 4200, publications: 38000, interactionRatio: 74 },
    philosophyDistribution: [
      { clanId: 'realista', label: 'Realista', pct: 60 },
      { clanId: 'estoico', label: 'Estoico', pct: 20 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 15 },
      { clanId: 'cientista', label: 'Cientista', pct: 5 },
    ],
    topMembers: [member('u8', 'maestro')],
    recentPosts: postsBy('u8'),
  },
  {
    id: 'trascendentalista',
    name: 'Clan Trascendentalista',
    description: 'La búsqueda de lo eterno más allá de la experiencia sensible. Lo visible es solo el umbral de lo que realmente importa.',
    stats: { members: 3600, publications: 29000, interactionRatio: 71 },
    philosophyDistribution: [
      { clanId: 'trascendentalista', label: 'Trascendentalista', pct: 62 },
      { clanId: 'humanista', label: 'Humanista', pct: 18 },
      { clanId: 'existencialista', label: 'Existencialista', pct: 14 },
      { clanId: 'nihilista', label: 'Nihilista', pct: 6 },
    ],
    topMembers: [member('u6', 'filosofo')],
    recentPosts: postsBy('u6'),
  },
  {
    id: 'cientista',
    name: 'Clan Cientista',
    description: 'La razón, el método y la evidencia como única guía del pensamiento. Todo aquello que no puede medirse, se examina con escepticismo.',
    stats: { members: 5100, publications: 46000, interactionRatio: 88 },
    philosophyDistribution: [
      { clanId: 'cientista', label: 'Cientista', pct: 65 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 22 },
      { clanId: 'realista', label: 'Realista', pct: 10 },
      { clanId: 'estoico', label: 'Estoico', pct: 3 },
    ],
    topMembers: [member('u3', 'aprendiz')],
    recentPosts: postsBy('u3'),
  },
  {
    id: 'indefinido',
    name: 'Clan indefinido',
    description: 'Tu identidad filosófica aún no ha tomado forma. El camino hacia el autoconocimiento comienza con la pregunta correcta — ¿quién eres y qué piensas del mundo?',
    stats: { members: 0, publications: 0, interactionRatio: 0 },
    philosophyDistribution: [
      { clanId: 'nihilista', label: 'Nihilista', pct: 13 },
      { clanId: 'estoico', label: 'Estoico', pct: 13 },
      { clanId: 'existencialista', label: 'Existencialista', pct: 13 },
      { clanId: 'racionalista', label: 'Racionalista', pct: 12 },
      { clanId: 'humanista', label: 'Humanista', pct: 12 },
      { clanId: 'realista', label: 'Realista', pct: 12 },
      { clanId: 'cientista', label: 'Cientista', pct: 13 },
      { clanId: 'trascendentalista', label: 'Trascendentalista', pct: 12 },
    ],
    topMembers: [member('u1', 'aprendiz')],
    recentPosts: postsBy('u1'),
  },
];

// ─── Lookup ───────────────────────────────────────────────────────────────

export function getClanProfile(clanId: string): ClanProfile | undefined {
  return CLAN_PROFILES.find((c) => c.id === clanId.toLowerCase().trim());
}

export function getClanProfileOrFallback(clanId: string): ClanProfile {
  return getClanProfile(clanId) ?? CLAN_PROFILES[0];
}
