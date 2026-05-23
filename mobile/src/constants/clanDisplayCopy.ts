/**
 * clanDisplayCopy.ts
 * ==================
 * Edita AQUÍ las frases y descripciones del display de clan (ClanDisplay).
 *
 * - `phrase` / `phraseAuthor` → tarjeta «frase del clan».
 * - `descriptionPoints` → viñetas de «¿Cómo piensa este clan?».
 * - `mythology` → bloque «Símbolo mitológico del clan» (animal + color).
 *
 * Los referentes filosóficos están en `clanConfig.ts` (no en este archivo).
 */

export type ClanMythologyCopy = {
  /** Nombre del animal o figura (p. ej. «Ave Fénix»). */
  animalName: string;
  /** Región o país de origen; en pantalla se muestra en forma adjetiva (p. ej. «Egipto» → «egipcia»). */
  mythologyOrigin: string;
  /** Etiqueta del color (p. ej. «Rojo»). */
  colorName: string;
  /** Hex del color principal (debe coincidir con clanColors). */
  colorHex: string;
  /** Texto tras el prefijo de origen mitológico. */
  description: string;
};

export type ClanDisplayCopy = {
  phrase: string;
  phraseAuthor: string;
  descriptionPoints: string[];
  mythology?: ClanMythologyCopy;
};

export const CLAN_DISPLAY_COPY: Record<string, ClanDisplayCopy> = {
  existencialista: {
    phrase: 'El ser humano llama destino\na todo lo que no puede soportar.',
    phraseAuthor: 'Albert Camus',
    descriptionPoints: [
      'El existencialista entiende que nadie nace con un sentido escrito de antemano.',
      'Cada persona se construye con sus decisiones, incluso cuando eso pesa.',
      'La libertad puede dar miedo, pero también permite crear una vida propia en vez de esperar que alguien la defina por ti.',
    ],
    mythology: {
      animalName: 'Ave Fénix',
      mythologyOrigin: 'Egipto',
      colorName: 'Rojo',
      colorHex: '#c93a39',
      description:
        'El Ave Fénix representa la idea existencialista de que el individuo no nace con un significado fijo, sino que debe construirlo a través del sufrimiento, la transformación y la voluntad propia. Su renacimiento constante simboliza la capacidad humana de redefinirse incluso después del caos o la destrucción. El rojo refleja pasión, dolor, libertad y la intensidad de existir.',
    },
  },
  racionalista: {
    phrase: 'Si la verdad los mata,\ndéjalos que mueran.',
    phraseAuthor: 'Immanuel Kant',
    descriptionPoints: [
      'El racionalista necesita que las ideas encajen.',
      'No cree algo solo por costumbre, emoción o autoridad: busca razones claras y coherentes.',
      'Puede tardar en convencerse, pero cuando lo hace, su pensamiento suele estar bien construido y preparado para resistir críticas.',
    ],
    mythology: {
      animalName: 'Búho de Atenea',
      mythologyOrigin: 'Grecia',
      colorName: 'Azul cian',
      colorHex: '#395df2',
      description:
        'El búho de Atenea simboliza la búsqueda racional de la verdad mediante la lógica, la observación y el pensamiento crítico. Como criatura asociada a la sabiduría y la claridad mental, representa la idea racionalista de que el conocimiento surge principalmente de la razón. El azul cian transmite inteligencia, precisión y serenidad intelectual.',
    },
  },
  estoico: {
    phrase: 'Podrán matarme,\npero no hacerme daño.',
    phraseAuthor: 'Epicteto',
    descriptionPoints: [
      'El estoico sabe que no controla todo, pero sí controla cómo responde.',
      'No pierde energía peleando contra lo inevitable: se centra en sus actos, su carácter y su disciplina.',
      'Cuando algo sale mal, no pregunta “por qué a mí”, sino “qué puedo hacer ahora”.',
    ],
    mythology: {
      animalName: 'Rey Arturo',
      mythologyOrigin: 'Inglaterra',
      colorName: 'Verde kaki',
      colorHex: '#818a41',
      description:
        'El Rey Arturo encarna el deber, la disciplina y el sacrificio personal por un propósito superior. Más que un conquistador, representa al líder que mantiene el orden incluso en tiempos de decadencia y sufrimiento. Su vínculo con la espada y el reino refleja el ideal estoico de autocontrol y honor frente al destino. El verde kaki simboliza estabilidad, resistencia y templanza.',
    },
  },
  humanista: {
    phrase: 'El hombre es bueno por naturaleza,\nes la sociedad quien lo corrompe.',
    phraseAuthor: 'Jean-Jacques Rousseau',
    descriptionPoints: [
      'El humanista pone a las personas en el centro.',
      'Para este clan, una idea no vale mucho si ignora el sufrimiento real de la gente.',
      'Cree en la dignidad, la empatía y la conexión entre personas como base para pensar mejor y vivir de forma más humana.',
    ],
    mythology: {
      animalName: '!Khwa',
      mythologyOrigin: 'Sudáfrica',
      colorName: 'Naranja',
      colorHex: '#efb318',
      description:
        'El !Khwa, antílope celestial portador de lluvia y vida, representa la conexión entre los seres vivos y la cooperación que permite prosperar a la comunidad. En la filosofía humanista simboliza empatía, fertilidad cultural y esperanza compartida. Su capacidad de traer lluvia al mundo refleja la creencia de que el ser humano puede mejorar la realidad mediante sus acciones. El naranja transmite calidez, vitalidad y cercanía humana.',
    },
  },
  trascendentalista: {
    phrase: 'Todos miramos las estrellas.',
    phraseAuthor: 'Oscar Wilde',
    descriptionPoints: [
      'El trascendentalista siente que la realidad no se agota en lo que se ve.',
      'Busca sentido en la naturaleza, la conciencia, la belleza y las experiencias difíciles de explicar.',
      'No rechaza la razón, pero también escucha la intuición, el asombro y lo que conecta la vida con algo más grande.',
    ],
    mythology: {
      animalName: 'Quetzalcóatl',
      mythologyOrigin: 'México',
      colorName: 'Morado',
      colorHex: '#8d61d1',
      description:
        'Quetzalcóatl simboliza la unión entre conocimiento, espiritualidad y trascendencia. Como serpiente emplumada, conecta lo terrenal con lo divino, reflejando la idea trascendentalista de que existe una realidad superior más allá de lo material. Representa la búsqueda interior, la elevación del espíritu y la conexión con el universo. El morado expresa misticismo, profundidad y expansión de conciencia.',
    },
  },
  cientista: {
    phrase: 'Lo más incomprensible del universo\nes que sea comprensible.',
    phraseAuthor: 'Albert Einstein',
    descriptionPoints: [
      'El cientista no se queda con lo que parece cierto: lo comprueba.',
      'Observa, mide, compara y cambia de opinión cuando los datos cambian.',
      'No teme decir “no lo sé”, porque para este clan la duda no es debilidad, es el inicio de entender mejor.',
    ],
    mythology: {
      animalName: 'Dragón Oriental',
      mythologyOrigin: 'China',
      colorName: 'Azul verdoso',
      colorHex: '#529da2',
      description:
        'El dragón oriental representa el dominio de las fuerzas de la naturaleza mediante conocimiento, equilibrio y comprensión profunda del mundo. A diferencia del dragón occidental destructivo, este simboliza sabiduría, progreso y armonía con las leyes del universo. Encaja con el pensamiento cientista al representar la búsqueda constante de descubrimiento e innovación. El azul verdoso transmite tecnología, fluidez y avance intelectual.',
    },
  },
  nihilista: {
    phrase: 'Hay más ídolos\nque realidades.',
    phraseAuthor: 'Friedrich Nietzsche',
    descriptionPoints: [
      'El nihilista no acepta una verdad solo porque otros la repitan.',
      'Cuestiona lo heredado, desmonta las certezas fáciles y prefiere una verdad incómoda antes que una ilusión cómoda.',
      'No busca consuelo en valores absolutos: busca mirar de frente lo que otros evitan.',
    ],
    mythology: {
      animalName: 'Pingüino Patagónico',
      mythologyOrigin: 'Patagonia',
      colorName: 'Beige',
      colorHex: '#bdb29c',
      description:
        'El pingüino patagónico simboliza la indiferencia del universo y la absurda persistencia de la existencia en un mundo frío y vacío. Inspirado tanto en la estética melancólica de internet como en los paisajes desolados del sur, representa al individuo que acepta que no existe un significado objetivo predeterminado. El beige refleja vacío, desgaste y neutralidad emocional.',
    },
  },
  realista: {
    phrase: 'Si juegas limpio en un mundo de tramposos,\nestás condenado a perder.',
    phraseAuthor: 'Nicolás Maquiavelo',
    descriptionPoints: [
      'El realista mira el mundo como es, no como le gustaría que fuera.',
      'Entiende el poder, los intereses y las limitaciones humanas sin adornarlas.',
      'No necesariamente es cínico: simplemente prefiere una verdad difícil antes que una esperanza bonita pero falsa.',
    ],
    mythology: {
      animalName: 'Fenrir',
      mythologyOrigin: 'Escandinavia',
      colorName: 'Gris',
      colorHex: '#a2a3a8',
      description:
        'Fenrir representa la fuerza inevitable de la realidad, imposible de contener mediante ideales o ilusiones. En la filosofía realista simboliza la aceptación del conflicto, el poder y las consecuencias naturales del mundo tal y como es. Su figura transmite pragmatismo, supervivencia y adaptación frente a la dureza de la existencia. El gris refleja crudeza, equilibrio y objetividad.',
    },
  },
  indefinido: {
    phrase: 'Ser o no ser,\nesa es la cuestión.',
    phraseAuthor: 'William Shakespeare',
    descriptionPoints: [
      'Los Sin Clan todavía están descubriendo cómo piensan.',
      'Prueban ideas distintas, cambian de enfoque y aún no pertenecen a ningún estandarte.',
      'No es indecisión: es una etapa de búsqueda antes de encontrar el clan que mejor encaja con su forma de ver el mundo.',
    ],
  },
};

const FALLBACK_COPY: ClanDisplayCopy = CLAN_DISPLAY_COPY.indefinido;

export function getClanDisplayCopy(clanId: string): ClanDisplayCopy {
  return CLAN_DISPLAY_COPY[clanId.toLowerCase().trim()] ?? FALLBACK_COPY;
}

/** Convierte el lugar de origen al adjetivo mitológico en español. */
const MYTHOLOGY_ORIGIN_ADJECTIVES: Record<string, string> = {
  Egipto: 'egipcia',
  Grecia: 'griega',
  Inglaterra: 'inglesa',
  Sudáfrica: 'sudafricana',
  México: 'mexicana',
  China: 'china',
  Patagonia: 'patagónica',
  Escandinavia: 'escandinava',
};

export function mythologyOriginToAdjective(mythologyOrigin: string): string {
  const trimmed = mythologyOrigin.trim();
  if (!trimmed) return '';
  return MYTHOLOGY_ORIGIN_ADJECTIVES[trimmed] ?? trimmed.toLowerCase();
}

/** Prefijo estándar para el bloque mitológico. */
export function formatMythologyOriginPrefix(mythologyOrigin: string): string {
  const adjective = mythologyOriginToAdjective(mythologyOrigin);
  if (!adjective) return 'Originario de la mitología.';
  return `Originario de la mitología ${adjective}.`;
}
