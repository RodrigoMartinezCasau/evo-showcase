/**
 * clanDisplayCopy.ts
 * ==================
 * Edita AQUÍ las frases y descripciones del display de clan (ClanDisplay).
 *
 * - `phrase`       → frase bajo el estandarte (tarjeta “frase del clan”).
 * - `description`  → texto del bloque «¿Cómo piensa este clan?».
 *
 * Usa `\n` para saltos de línea en `phrase`.
 * Los referentes filosóficos están en `clanConfig.ts` (no en este archivo).
 *
 * Claves: nihilista | cientista | estoico | existencialista | racionalista |
 *         humanista | realista | trascendentalista | indefinido (sin clan)
 */

export type ClanDisplayCopy = {
  /** Frase insignia del clan en la pantalla de display */
  phrase: string;
  /** Descripción larga del clan */
  description: string;
};

export const CLAN_DISPLAY_COPY: Record<string, ClanDisplayCopy> = {
  nihilista: {
    phrase: 'Nada tiene significado inherente.\nY eso lo cambia todo.',
    description:
      'El nihilista no colapsa ante el vacío — lo habita. Sus miembros cuestionan cada certeza heredada y encuentran en la deconstrucción una forma radical de honestidad. No buscan consuelo en sistemas de valores absolutos. Prefieren la incomodidad de la verdad desnuda a la comodidad de una ilusión bien construida. Su potencial: ver con claridad donde otros prefieren no mirar.',
  },
  cientista: {
    phrase: 'La evidencia no miente.\nLas personas sí.',
    description:
      'El cientista confía en el método por encima de la intuición. Sus miembros miden, contrastan y actualizan sus creencias cuando los datos cambian. No les incomoda la incertidumbre — la abrazan como motor del conocimiento. Rechazan el dogma en todas sus formas, incluyendo el científico mal aplicado. Su potencial: tomar decisiones sin dejarse engañar por sesgos ni narrativas.',
  },
  estoico: {
    phrase: 'Controla lo que puedes.\nSuelta lo que no.',
    description:
      'El estoico no evita el sufrimiento — lo entrena. Sus miembros distinguen con precisión lo que depende de ellos y lo que no, y actúan solo sobre lo primero. La disciplina no es un sacrificio para el estoico: es la expresión más alta de la libertad. Ante la adversidad, no preguntan "¿por qué a mí?" sino "¿qué puedo hacer con esto?". Su potencial: mantener la calma y la dirección cuando todo colapsa a su alrededor.',
  },
  existencialista: {
    phrase: 'No te encuentras.\nTe construyes.',
    description:
      'El existencialista rechaza la idea de una esencia predefinida. Naces sin manual y eso, lejos de ser una condena, es la mayor libertad posible. Sus miembros cargan con esa libertad de forma consciente: cada decisión es una declaración de identidad. La angustia no los paraliza — los define. Su potencial: crear significado propio allí donde otros buscan que alguien se lo dé.',
  },
  racionalista: {
    phrase: 'La razón es el único camino\nque no te traiciona.',
    description:
      'El racionalista construye su visión del mundo desde los primeros principios. No acepta nada por tradición ni por autoridad — solo por demostración lógica. Sus miembros tienen una relación casi íntima con la coherencia: la inconsistencia les duele como una piedra en el zapato. Son lentos para creer pero sólidos una vez convencidos. Su potencial: construir sistemas de pensamiento que resisten el tiempo y la crítica.',
  },
  humanista: {
    phrase: 'Al final,\nsolo quedan las personas.',
    description:
      'El humanista pone al ser humano en el centro de todo análisis. Sus miembros no separan la filosofía de la empatía: para ellos, un sistema de ideas que ignore el sufrimiento real es un sistema fallido. Creen en la dignidad como principio no negociable y en la conexión entre personas como fuente de sentido. Su potencial: construir puentes donde otros levantan muros, y encontrar lo humano en lo más oscuro.',
  },
  realista: {
    phrase: 'El mundo es como es,\nno como quisieras que fuera.',
    description:
      'El realista no se consuela con ideales que no existen. Sus miembros ven las estructuras de poder, los incentivos reales y las limitaciones humanas con una claridad que a veces incomoda. No son cínicos — son precisos. Prefieren una verdad difícil a una esperanza vacía. Cuando toman decisiones, lo hacen sobre el terreno que hay, no el que desearían. Su potencial: actuar con efectividad en un mundo imperfecto sin perder la brújula moral.',
  },
  trascendentalista: {
    phrase: 'Hay algo más allá\nde lo que puedes ver.',
    description:
      'El trascendentalista siente que la realidad visible es solo la superficie. Sus miembros buscan capas más profundas de sentido — en la naturaleza, en la conciencia, en lo que la ciencia aún no puede medir. No son irracionales: son sensibles a dimensiones de la experiencia que otros pasan por alto. La intuición, la belleza y el asombro son datos válidos para ellos. Su potencial: conectar lo cotidiano con algo mayor y encontrar sentido donde otros solo ven azar.',
  },
  /** Pantalla «Sin clan» (`clanId` indefinido / sin casa asignada). */
  indefinido: {
    phrase: 'Ser o no ser \nesa es la cuestión',
    description:
      'Los Sin Clan aún no juraron lealtad a ningún estandarte: van probando ideas como quien prueba el menú entero. Si les preguntas qué piensan, suelen responder “depende del día” no es evasión, es beta filosófica. Su ventaja: mezclar sin drama hasta elegir con criterio.',
  },
};

const FALLBACK_COPY: ClanDisplayCopy = CLAN_DISPLAY_COPY.indefinido;

export function getClanDisplayCopy(clanId: string): ClanDisplayCopy {
  return CLAN_DISPLAY_COPY[clanId.toLowerCase().trim()] ?? FALLBACK_COPY;
}
