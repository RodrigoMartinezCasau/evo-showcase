/**
 * debugFeedData.ts
 *
 * Fake users and posts used exclusively by the DebugFeedOverlay.
 * COMPLETELY ISOLATED from simulatedNetwork.ts and from Supabase:
 *  - user IDs start with "du" (never treated as real UUIDs by isRealUserId)
 *  - post IDs start with "dbg-" (never inserted into Supabase)
 *  - no imports from SimulationContext
 *
 * One user per clan + one no-clan user, 4 posts each (reflections + phrases).
 */
import type { CommunityPost } from '@evoconn/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const D = 86_400_000;
const H = 3_600_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

let _postCounter = 0;
function pid() {
  _postCounter += 1;
  return `dbg-post-${String(_postCounter).padStart(3, '0')}`;
}

// ─── Debug users ──────────────────────────────────────────────────────────────

export const DEBUG_USERS: CommunityPost['author'][] = [
  { id: 'du1', username: '@SINCLAN',        clanId: null,                 rank: 'aprendiz' },
  { id: 'du2', username: '@NIHIL',          clanId: 'nihilista',          rank: 'filosofo'  },
  { id: 'du3', username: '@CIENCIA',        clanId: 'cientista',          rank: 'maestro'   },
  { id: 'du4', username: '@ESTOIKA',        clanId: 'estoico',            rank: 'filosofo'  },
  { id: 'du5', username: '@EXISTO',         clanId: 'existencialista',    rank: 'maestro'   },
  { id: 'du6', username: '@TRASCIENDE',     clanId: 'trascendentalista',  rank: 'filosofo'  },
  { id: 'du7', username: '@HUMANX',         clanId: 'humanista',          rank: 'maestro'   },
  { id: 'du8', username: '@REALIDAD',       clanId: 'realista',           rank: 'maestro'   },
  { id: 'du9', username: '@RACIONAL',       clanId: 'racionalista',       rank: 'filosofo'  },
];

const [du1, du2, du3, du4, du5, du6, du7, du8, du9] = DEBUG_USERS;

// ─── Helper to create posts cleanly ──────────────────────────────────────────

function reflection(
  author: CommunityPost['author'],
  title: string,
  body: string,
  msAgo: number,
  up = 0,
  down = 0,
): CommunityPost {
  return {
    id: pid(),
    type: 'reflection',
    author,
    title,
    body,
    voteStats: { up, down, save: 0 },
    createdAt: ago(msAgo),
  };
}

function phrase(
  author: CommunityPost['author'],
  body: string,
  quoteAuthor: string,
  msAgo: number,
  up = 0,
  down = 0,
): CommunityPost {
  return {
    id: pid(),
    type: 'phrase',
    author,
    body,
    quoteAuthor,
    voteStats: { up, down, save: 0 },
    createdAt: ago(msAgo),
  };
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export const DEBUG_POSTS: CommunityPost[] = [

  // ── Sin clan ──────────────────────────────────────────────────────────────
  reflection(
    du1,
    'Entre mundos',
    'Hay días en los que no sabes bien a dónde perteneces. No como pérdida, sino como libertad todavía sin forma.',
    2 * H, 3,
  ),
  reflection(
    du1,
    'La pregunta sin dueño',
    '¿Qué eres cuando nadie te mira? Eso y solo eso.',
    1 * D + 4 * H, 7, 1,
  ),
  phrase(
    du1,
    'La mayor aventura que puedes emprender es vivir la vida de tus sueños.',
    'Oprah Winfrey',
    3 * D, 5,
  ),
  reflection(
    du1,
    'Silencio fértil',
    'No todo silencio es vacío. A veces el silencio es el único lenguaje que no miente.',
    5 * D + 2 * H, 11, 2,
  ),

  // ── Nihilista ─────────────────────────────────────────────────────────────
  reflection(
    du2,
    'Nada permanece',
    'Cada certeza que construyes es un castillo de arena frente al mar. Y el mar siempre llega.',
    6 * H, 14, 3,
  ),
  reflection(
    du2,
    'El peso de no creer',
    'Cuando dejas de buscar sentido en el exterior, el interior se vuelve extrañamente más ligero.',
    1 * D + 1 * H, 9, 2,
  ),
  phrase(
    du2,
    'Dios ha muerto. Dios sigue muerto. Y nosotros lo hemos matado.',
    'Friedrich Nietzsche',
    2 * D + 8 * H, 18, 5,
  ),
  reflection(
    du2,
    'Ruido de fondo',
    'El universo no tiene propósito — y eso lo hace infinitamente más honesto que cualquier narrativa humana.',
    4 * D, 12, 4,
  ),

  // ── Cientista ─────────────────────────────────────────────────────────────
  reflection(
    du3,
    'El método como brújula',
    'La duda sistemática no es cobardía intelectual. Es la única forma de no engañarse a uno mismo.',
    30 * 60 * 1000, 6,
  ),
  phrase(
    du3,
    'La imaginación es más importante que el conocimiento.',
    'Albert Einstein',
    1 * D + 6 * H, 22, 1,
  ),
  reflection(
    du3,
    'Verdad provisional',
    'Todo lo que sabemos hoy está pendiente de revisión. Eso no es debilidad — es el motor del progreso.',
    2 * D + 3 * H, 8, 2,
  ),
  reflection(
    du3,
    'Asombro como práctica',
    'El científico no pierde la maravilla. La transforma en preguntas cada vez más precisas y cada vez más hermosas.',
    6 * D, 10, 0,
  ),

  // ── Estoico ───────────────────────────────────────────────────────────────
  reflection(
    du4,
    'Lo que depende de mí',
    'Hay dos tipos de cosas: las que controlo y las que no. Invertir energía en las segundas es el único error que importa evitar.',
    1 * H, 19, 2,
  ),
  phrase(
    du4,
    'Nunca te pido que te abstengas del sufrimiento, sino que lo soportes con cordura.',
    'Marco Aurelio',
    1 * D + 10 * H, 15, 1,
  ),
  reflection(
    du4,
    'Virtud sin testigos',
    'La virtud que necesita ser vista no es virtud. Es teatro.',
    3 * D + 5 * H, 17, 3,
  ),
  reflection(
    du4,
    'El obstáculo como camino',
    'Cada resistencia que enfrentas es una instrucción, no un castigo.',
    7 * D + 2 * H, 21, 0,
  ),

  // ── Existencialista ───────────────────────────────────────────────────────
  reflection(
    du5,
    'Condenado a ser libre',
    'La libertad no es un regalo. Es una condena. Y sin embargo, es lo más parecido a la dignidad que existe.',
    45 * 60 * 1000, 13, 4,
  ),
  reflection(
    du5,
    'El abismo nos mira',
    'Cuando te asomas al vacío el tiempo suficiente, el vacío se asoma de vuelta. Y entonces decides quién eres.',
    1 * D + 2 * H, 16, 5,
  ),
  phrase(
    du5,
    'El hombre está condenado a ser libre.',
    'Jean-Paul Sartre',
    3 * D + 1 * H, 20, 2,
  ),
  reflection(
    du5,
    'Autenticidad radical',
    'Vivir la vida de otro — aunque sea una vida más fácil — es una forma de muerte lenta y voluntaria.',
    8 * D, 24, 6,
  ),

  // ── Trascendentalista ─────────────────────────────────────────────────────
  reflection(
    du6,
    'Más allá del horizonte',
    'Lo visible es apenas el umbral. La realidad más profunda no se ve — se intuye, se siente, se vive.',
    2 * H, 11, 1,
  ),
  phrase(
    du6,
    'Lo que abajo es, arriba es. Lo que arriba es, abajo es.',
    'Hermes Trismegisto',
    1 * D + 7 * H, 14, 3,
  ),
  reflection(
    du6,
    'El alma como antena',
    'Hay momentos en los que el ruido del mundo se detiene y algo más profundo se filtra. No lo llames locura. Llámalo percepción.',
    4 * D + 6 * H, 9, 2,
  ),
  reflection(
    du6,
    'Unión imposible',
    'La paradoja del trascendentalista: estar en el mundo sin ser del mundo. Observar desde dentro.',
    9 * D, 7, 0,
  ),

  // ── Humanista ─────────────────────────────────────────────────────────────
  reflection(
    du7,
    'La dignidad no se negocia',
    'Todo ser humano lleva una dignidad intrínseca que no depende de sus logros, su tribu ni su historia.',
    3 * H, 16, 1,
  ),
  reflection(
    du7,
    'Empatía como acto político',
    'Ponerse en el lugar del otro no es debilidad emocional. Es la forma más sofisticada de inteligencia social.',
    1 * D + 3 * H, 18, 2,
  ),
  phrase(
    du7,
    'El hombre es la medida de todas las cosas.',
    'Protágoras',
    5 * D + 4 * H, 12, 4,
  ),
  reflection(
    du7,
    'Conexión como necesidad',
    'No somos islas. Somos archipiélagos. La distancia entre nosotros es real, pero también lo es la tierra bajo el agua.',
    10 * D, 20, 3,
  ),

  // ── Realista ──────────────────────────────────────────────────────────────
  reflection(
    du8,
    'Lo que es, es',
    'Las ilusiones no son pensamiento elevado. Son pensamiento evitativo. Ver la realidad sin filtros es el primer acto valiente.',
    4 * H, 10, 2,
  ),
  phrase(
    du8,
    'Los hechos no cesan de existir porque sean ignorados.',
    'Aldous Huxley',
    1 * D + 8 * H, 13, 1,
  ),
  reflection(
    du8,
    'Pragmatismo sin cinismo',
    'Ser realista no significa ser pesimista. Significa no dejar que el deseo distorsione el análisis.',
    3 * D + 7 * H, 15, 3,
  ),
  reflection(
    du8,
    'Fricción necesaria',
    'Sin la resistencia de los hechos duros, ninguna idea se fortifica. El choque con la realidad no destruye el pensamiento — lo afila.',
    11 * D, 8, 1,
  ),

  // ── Racionalista ──────────────────────────────────────────────────────────
  reflection(
    du9,
    'La razón como faro',
    'En la oscuridad de la incertidumbre, la razón no es el único camino — pero es el único que no te abandona en mitad de la noche.',
    5 * H, 17, 3,
  ),
  reflection(
    du9,
    'Sistemas y caos',
    'El pensamiento sistemático no elimina el caos — lo mapea. Y un caos mapeado ya no es caos, es complejidad.',
    1 * D + 5 * H, 19, 4,
  ),
  phrase(
    du9,
    'Pienso, luego existo.',
    'René Descartes',
    4 * D + 3 * H, 25, 2,
  ),
  reflection(
    du9,
    'Consistencia como virtud',
    'La contradicción interna no es creatividad. Es deshonestidad intelectual disfrazada de complejidad.',
    12 * D, 14, 5,
  ),
];

// ─── Default follow set for "Siguiendo" tab ───────────────────────────────────
// A pre-selected subset so the tab is not empty by default.
export const DEBUG_DEFAULT_FOLLOWING: Set<string> = new Set([
  'du2', 'du4', 'du5', 'du7', 'du9',
]);
