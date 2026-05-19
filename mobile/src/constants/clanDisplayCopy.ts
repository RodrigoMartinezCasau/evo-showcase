/**
 * clanDisplayCopy.ts
 * ==================
 * Edita AQUÍ las frases y descripciones del display de clan (ClanDisplay).
 *
 * - `phrase`        → frase bajo el estandarte (tarjeta “frase del clan”).
 * - `phraseAuthor`  → autor visible bajo la frase.
 * - `description`   → texto del bloque «¿Cómo piensa este clan?».
 *
 * Usa `\n` para saltos de línea en `phrase`.
 * Los referentes filosóficos están en `clanConfig.ts` (no en este archivo).
 *
 * Frases insignia curadas desde `Desktop/EVOCONN/EVOCONN_FRASES_REFLEXIONES.md`.
 *
 * Claves: nihilista | cientista | estoico | existencialista | racionalista |
 *         humanista | realista | trascendentalista | indefinido (sin clan)
 */

export type ClanDisplayCopy = {
  /** Frase insignia del clan en la pantalla de display */
  phrase: string;
  /** Autor de la frase (nombre para mostrar bajo la cita) */
  phraseAuthor: string;
  /** Descripción larga del clan */
  description: string;
};

export const CLAN_DISPLAY_COPY: Record<string, ClanDisplayCopy> = {
  nihilista: {
    // Nietzsche — Reflexión «Hay más ídolos que realidades» (EVOCONN_FRASES_REFLEXIONES)
    phrase: 'Hay más ídolos\nque realidades.',
    phraseAuthor: 'Friedrich Nietzsche',
    description:
      'El nihilista no acepta una verdad solo porque otros la repitan. Cuestiona lo heredado, desmonta las certezas fáciles y prefiere una verdad incómoda antes que una ilusión cómoda. No busca consuelo en valores absolutos: busca mirar de frente lo que otros evitan.',
  },
  cientista: {
    // Einstein — guion EVOCONN / NUEVOS GUIONES (biblioteca Evoconn)
    phrase: 'Lo más incomprensible del universo\nes que sea comprensible.',
    phraseAuthor: 'Albert Einstein',
    description:
      'El cientista no se queda con lo que parece cierto: lo comprueba. Observa, mide, compara y cambia de opinión cuando los datos cambian. No teme decir “no lo sé”, porque para este clan la duda no es debilidad, es el inicio de entender mejor.',
  },
  estoico: {
    // Epicteto — Día 5 (RD1M)
    phrase: 'Podrán matarme,\npero no hacerme daño.',
    phraseAuthor: 'Epicteto',
    description:
      'El estoico sabe que no controla todo, pero sí controla cómo responde. No pierde energía peleando contra lo inevitable: se centra en sus actos, su carácter y su disciplina. Cuando algo sale mal, no pregunta “por qué a mí”, sino “qué puedo hacer ahora”.',
  },
  existencialista: {
    // Camus — Día 74 (RD1M; Top 5 Camus)
    phrase: 'El ser humano llama destino\na todo lo que no puede soportar.',
    phraseAuthor: 'Albert Camus',
    description:
      'El existencialista entiende que nadie nace con un sentido escrito de antemano. Cada persona se construye con sus decisiones, incluso cuando eso pesa. La libertad puede dar miedo, pero también permite crear una vida propia en vez de esperar que alguien la defina por ti.',
  },
  racionalista: {
    // Kant — Día 36 (RD1M)
    phrase: 'Si la verdad los mata,\ndéjalos que mueran.',
    phraseAuthor: 'Immanuel Kant',
    description:
      'El racionalista necesita que las ideas encajen. No cree algo solo por costumbre, emoción o autoridad: busca razones claras y coherentes. Puede tardar en convencerse, pero cuando lo hace, su pensamiento suele estar bien construido y preparado para resistir críticas.',
  },
  humanista: {
    // Rousseau — Día 47 (RD1M)
    phrase: 'El hombre es bueno por naturaleza,\nes la sociedad quien lo corrompe.',
    phraseAuthor: 'Jean-Jacques Rousseau',
    description:
      'El humanista pone a las personas en el centro. Para este clan, una idea no vale mucho si ignora el sufrimiento real de la gente. Cree en la dignidad, la empatía y la conexión entre personas como base para pensar mejor y vivir de forma más humana.',
  },
  realista: {
    // Maquiavelo — Día 28 (RD1M)
    phrase: 'Si juegas limpio en un mundo de tramposos,\nestás condenado a perder.',
    phraseAuthor: 'Nicolás Maquiavelo',
    description:
      'El realista mira el mundo como es, no como le gustaría que fuera. Entiende el poder, los intereses y las limitaciones humanas sin adornarlas. No necesariamente es cínico: simplemente prefiere una verdad difícil antes que una esperanza bonita pero falsa.',
  },
  trascendentalista: {
    // Wilde — Reflexión EVOCONN (no es referente de ningún clan)
    phrase: 'Todos miramos las estrellas.',
    phraseAuthor: 'Oscar Wilde',
    description:
      'El trascendentalista siente que la realidad no se agota en lo que se ve. Busca sentido en la naturaleza, la conciencia, la belleza y las experiencias difíciles de explicar. No rechaza la razón, pero también escucha la intuición, el asombro y lo que conecta la vida con algo más grande.',
  },
  /** Pantalla «Sin clan» (`clanId` indefinido / sin casa asignada). */
  indefinido: {
    // Shakespeare — Día 15 (RD1M)
    phrase: 'Ser o no ser,\nesa es la cuestión.',
    phraseAuthor: 'William Shakespeare',
    description:
      'Los Sin Clan todavía están descubriendo cómo piensan. Prueban ideas distintas, cambian de enfoque y aún no pertenecen a ningún estandarte. No es indecisión: es una etapa de búsqueda antes de encontrar el clan que mejor encaja con su forma de ver el mundo.',
  },
};

const FALLBACK_COPY: ClanDisplayCopy = CLAN_DISPLAY_COPY.indefinido;

export function getClanDisplayCopy(clanId: string): ClanDisplayCopy {
  return CLAN_DISPLAY_COPY[clanId.toLowerCase().trim()] ?? FALLBACK_COPY;
}
