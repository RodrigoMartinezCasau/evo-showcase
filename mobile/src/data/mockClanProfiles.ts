import type { CommunityPost, Rank } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────

export type ClanMember = {
  id: string;
  username: string;
  clanId: string;
  rank: Rank;
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

// ─── Shared mock authors ──────────────────────────────────────────────────

const AUTHOR_DIEGO = {
  id: '1', username: '@DIEGOLLUBERES', clanId: 'nihilista', rank: 'maestro' as Rank,
  followersCount: 1240, followingCount: 87,
};
const AUTHOR_ALEJANDRO = {
  id: '2', username: '@ALEJANDROSERRANO', clanId: 'estoico', rank: 'filosofo' as Rank,
  followersCount: 3580, followingCount: 214,
};
const AUTHOR_RODRIGO = {
  id: '3', username: '@RODRIGOMARTINEZ', clanId: 'existencialista', rank: 'filosofo' as Rank,
  followersCount: 8920, followingCount: 156,
};
const AUTHOR_HERNAN = {
  id: '4', username: '@HERNANCHACON', clanId: 'realista', rank: 'aprendiz' as Rank,
  followersCount: 420, followingCount: 63,
};
const AUTHOR_SOFIA = {
  id: '5', username: '@SOFIAVALDES', clanId: 'humanista', rank: 'maestro' as Rank,
  followersCount: 2100, followingCount: 95,
};
const AUTHOR_LUCAS = {
  id: '6', username: '@LUCASNIETO', clanId: 'racionalista', rank: 'filosofo' as Rank,
  followersCount: 4800, followingCount: 310,
};

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
    topMembers: [
      { id: '1', username: '@DIEGOLLUBERES', clanId: 'nihilista', rank: 'maestro' },
      { id: '7', username: '@MATIASCRUZ', clanId: 'nihilista', rank: 'filosofo' },
      { id: '8', username: '@PAULAFONTE', clanId: 'nihilista', rank: 'maestro' },
    ],
    recentPosts: [
      {
        id: 'cn1', type: 'reflection', author: AUTHOR_DIEGO,
        title: 'EL SENTIDO QUE INVENTAMOS',
        body: 'No hay propósito inherente. Eso no es una tragedia, es una puerta abierta.',
        voteStats: { up: 1240, down: 88, save: 74 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'cn2', type: 'phrase', author: AUTHOR_DIEGO,
        body: 'En el abismo de la nada descansa toda la libertad posible.',
        quoteAuthor: 'Nietzsche',
        voteStats: { up: 3300, down: 44, save: 210 },
        createdAt: new Date().toISOString(),
      },
    ],
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
    topMembers: [
      { id: '2', username: '@ALEJANDROSERRANO', clanId: 'estoico', rank: 'filosofo' },
      { id: '9', username: '@GABRIELARENAS', clanId: 'estoico', rank: 'maestro' },
      { id: '10', username: '@TOMASPRADO', clanId: 'estoico', rank: 'aprendiz' },
    ],
    recentPosts: [
      {
        id: 'ce1', type: 'reflection', author: AUTHOR_ALEJANDRO,
        title: 'EL CONTROL QUE SÍ IMPORTA',
        body: 'Distinguir lo que depende de ti y lo que no es el comienzo de toda sabiduría.',
        voteStats: { up: 2870, down: 120, save: 199 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ce2', type: 'phrase', author: AUTHOR_ALEJANDRO,
        body: 'No busques la felicidad fuera. Construye el camino desde dentro.',
        quoteAuthor: 'Marco Aurelio',
        voteStats: { up: 5400, down: 31, save: 370 },
        createdAt: new Date().toISOString(),
      },
    ],
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
    topMembers: [
      { id: '3', username: '@RODRIGOMARTINEZ', clanId: 'existencialista', rank: 'filosofo' },
      { id: '11', username: '@VALENTINASOSA', clanId: 'existencialista', rank: 'maestro' },
      { id: '12', username: '@IGNACIOVILA', clanId: 'existencialista', rank: 'filosofo' },
    ],
    recentPosts: [
      {
        id: 'cex1', type: 'phrase', author: AUTHOR_RODRIGO,
        body: 'El hombre está condenado a ser libre.',
        quoteAuthor: 'Sartre',
        voteStats: { up: 12700, down: 450, save: 890 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'cex2', type: 'reflection', author: AUTHOR_RODRIGO,
        title: 'LA RESPONSABILIDAD DE EXISTIR',
        body: 'Nadie puede decidir por ti quién eres. Eso es el peso y la gloria de estar vivo.',
        voteStats: { up: 4200, down: 88, save: 310 },
        createdAt: new Date().toISOString(),
      },
    ],
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
    topMembers: [
      { id: '6', username: '@LUCASNIETO', clanId: 'racionalista', rank: 'filosofo' },
      { id: '13', username: '@MILAGROSRUIZ', clanId: 'racionalista', rank: 'maestro' },
      { id: '14', username: '@CARLOSMENDEZ', clanId: 'racionalista', rank: 'aprendiz' },
    ],
    recentPosts: [
      {
        id: 'cr1', type: 'reflection', author: AUTHOR_LUCAS,
        title: 'LA LÓGICA COMO BRÚJULA',
        body: 'No todo lo que se siente es verdad. La razón existe para filtrar el ruido emocional.',
        voteStats: { up: 3100, down: 210, save: 180 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'cr2', type: 'phrase', author: AUTHOR_LUCAS,
        body: 'Pienso, luego existo.',
        quoteAuthor: 'Descartes',
        voteStats: { up: 7800, down: 120, save: 540 },
        createdAt: new Date().toISOString(),
      },
    ],
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
    topMembers: [
      { id: '5', username: '@SOFIAVALDES', clanId: 'humanista', rank: 'maestro' },
      { id: '15', username: '@ANDREAPOLO', clanId: 'humanista', rank: 'filosofo' },
      { id: '16', username: '@JUANPABLORIOS', clanId: 'humanista', rank: 'maestro' },
    ],
    recentPosts: [
      {
        id: 'ch1', type: 'reflection', author: AUTHOR_SOFIA,
        title: 'EL OTRO COMO ESPEJO',
        body: 'Entender al otro no es ceder en tus creencias. Es ampliar tu mundo.',
        voteStats: { up: 2200, down: 64, save: 155 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ch2', type: 'phrase', author: AUTHOR_SOFIA,
        body: 'La medida del hombre es la forma en que trata a quienes no pueden darle nada.',
        quoteAuthor: 'Séneca',
        voteStats: { up: 6100, down: 55, save: 420 },
        createdAt: new Date().toISOString(),
      },
    ],
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
    topMembers: [
      { id: '4', username: '@HERNANCHACON', clanId: 'realista', rank: 'aprendiz' },
      { id: '17', username: '@MARTINQUINTERO', clanId: 'realista', rank: 'maestro' },
      { id: '18', username: '@CLAUDIAORTIZ', clanId: 'realista', rank: 'filosofo' },
    ],
    recentPosts: [
      {
        id: 'crl1', type: 'reflection', author: AUTHOR_HERNAN,
        title: 'LAS COSAS COMO SON',
        body: 'Preferir la verdad incómoda a la mentira confortable es el primer acto de madurez.',
        voteStats: { up: 1800, down: 340, save: 120 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'crl2', type: 'phrase', author: AUTHOR_HERNAN,
        body: 'La realidad no necesita tu aprobación para existir.',
        quoteAuthor: 'Schopenhauer',
        voteStats: { up: 4300, down: 230, save: 280 },
        createdAt: new Date().toISOString(),
      },
    ],
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
    topMembers: [
      { id: '19', username: '@ISABELCASTRO', clanId: 'trascendentalista', rank: 'filosofo' },
      { id: '20', username: '@FEDELOPEZ', clanId: 'trascendentalista', rank: 'maestro' },
      { id: '21', username: '@CAMILAVEGA', clanId: 'trascendentalista', rank: 'aprendiz' },
    ],
    recentPosts: [
      {
        id: 'ct1', type: 'reflection', author: AUTHOR_RODRIGO,
        title: 'MÁS ALLÁ DE LO VISIBLE',
        body: 'Hay dimensiones de la realidad que el pensamiento ordinario no puede alcanzar.',
        voteStats: { up: 1400, down: 90, save: 110 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ct2', type: 'phrase', author: AUTHOR_RODRIGO,
        body: 'Lo eterno no está fuera del tiempo — está en cada instante pleno.',
        quoteAuthor: 'Emerson',
        voteStats: { up: 3200, down: 67, save: 240 },
        createdAt: new Date().toISOString(),
      },
    ],
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
    topMembers: [
      { id: '22', username: '@NICOLASVARGAS', clanId: 'cientista', rank: 'filosofo' },
      { id: '23', username: '@ANAMARIAJIMENEZ', clanId: 'cientista', rank: 'maestro' },
      { id: '24', username: '@SEBASTIANMORALES', clanId: 'cientista', rank: 'aprendiz' },
    ],
    recentPosts: [
      {
        id: 'csc1', type: 'reflection', author: AUTHOR_LUCAS,
        title: 'EL MÉTODO COMO ACTITUD',
        body: 'No es suficiente tener buenas intenciones. La verdad requiere rigor, datos y humildad.',
        voteStats: { up: 2600, down: 130, save: 170 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'csc2', type: 'phrase', author: AUTHOR_LUCAS,
        body: 'Lo extraordinario requiere evidencia extraordinaria.',
        quoteAuthor: 'Carl Sagan',
        voteStats: { up: 9100, down: 140, save: 680 },
        createdAt: new Date().toISOString(),
      },
    ],
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
    topMembers: [],
    recentPosts: [
      {
        id: 'ci1', type: 'reflection', author: AUTHOR_RODRIGO,
        title: 'EL INICIO DEL CAMINO',
        body: 'No saber a qué clan perteneces no es una debilidad — es el punto de partida honesto.',
        voteStats: { up: 0, down: 0, save: 0 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ci2', type: 'phrase', author: AUTHOR_RODRIGO,
        body: 'El hombre que empieza a conocerse a sí mismo ya ha comenzado a filosofar.',
        quoteAuthor: 'Sócrates',
        voteStats: { up: 0, down: 0, save: 0 },
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

// ─── Lookup ───────────────────────────────────────────────────────────────

export function getClanProfile(clanId: string): ClanProfile | undefined {
  return CLAN_PROFILES.find((c) => c.id === clanId.toLowerCase().trim());
}

export function getClanProfileOrFallback(clanId: string): ClanProfile {
  return getClanProfile(clanId) ?? CLAN_PROFILES[0];
}
