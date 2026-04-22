/**
 * clanConfig.ts
 * =============
 * Toda la configuración de contenido por clan:
 * frase representativa, filósofos y descripción extendida.
 *
 * Este es el único archivo que hay que editar para cambiar
 * textos del ClanDisplay — sin tocar componentes.
 */

export type Philosopher = {
  /** Nombre visible bajo la foto */
  name: string;
  /** Iniciales para el placeholder circular */
  initials: string;
  /** URI de imagen opcional. Si null se muestra el placeholder de iniciales */
  imageUri?: string | null;
};

export type ClanConfigEntry = {
  phrase: string;
  description: string;
  philosophers: [Philosopher, Philosopher, Philosopher, Philosopher];
};

export const CLAN_CONFIG: Record<string, ClanConfigEntry> = {
  nihilista: {
    phrase: 'Nada tiene significado inherente.\nY eso lo cambia todo.',
    description:
      'El nihilista no colapsa ante el vacío — lo habita. Sus miembros cuestionan cada certeza heredada y encuentran en la deconstrucción una forma radical de honestidad. No buscan consuelo en sistemas de valores absolutos. Prefieren la incomodidad de la verdad desnuda a la comodidad de una ilusión bien construida. Su potencial: ver con claridad donde otros prefieren no mirar.',
    philosophers: [
      { name: 'Nietzsche', initials: 'N' },
      { name: 'Cioran', initials: 'C' },
      { name: 'Schopenhauer', initials: 'S' },
      { name: 'Camus', initials: 'C' },
    ],
  },
  cientista: {
    phrase: 'La evidencia no miente.\nLas personas sí.',
    description:
      'El cientista confía en el método por encima de la intuición. Sus miembros miden, contrastan y actualizan sus creencias cuando los datos cambian. No les incomoda la incertidumbre — la abrazan como motor del conocimiento. Rechazan el dogma en todas sus formas, incluyendo el científico mal aplicado. Su potencial: tomar decisiones sin dejarse engañar por sesgos ni narrativas.',
    philosophers: [
      { name: 'Dawkins', initials: 'D' },
      { name: 'Sagan', initials: 'S' },
      { name: 'Hawking', initials: 'H' },
      { name: 'Darwin', initials: 'D' },
    ],
  },
  estoico: {
    phrase: 'Controla lo que puedes.\nSuelta lo que no.',
    description:
      'El estoico no evita el sufrimiento — lo entrena. Sus miembros distinguen con precisión lo que depende de ellos y lo que no, y actúan solo sobre lo primero. La disciplina no es un sacrificio para el estoico: es la expresión más alta de la libertad. Ante la adversidad, no preguntan "¿por qué a mí?" sino "¿qué puedo hacer con esto?". Su potencial: mantener la calma y la dirección cuando todo colapsa a su alrededor.',
    philosophers: [
      { name: 'Marco Aurelio', initials: 'MA' },
      { name: 'Séneca', initials: 'S' },
      { name: 'Musashi', initials: 'M' },
      { name: 'Epicteto', initials: 'E' },
    ],
  },
  existencialista: {
    phrase: 'No te encuentras.\nTe construyes.',
    description:
      'El existencialista rechaza la idea de una esencia predefinida. Naces sin manual y eso, lejos de ser una condena, es la mayor libertad posible. Sus miembros cargan con esa libertad de forma consciente: cada decisión es una declaración de identidad. La angustia no los paraliza — los define. Su potencial: crear significado propio allí donde otros buscan que alguien se lo dé.',
    philosophers: [
      { name: 'Sartre', initials: 'S' },
      { name: 'Camus', initials: 'C' },
      { name: 'Heidegger', initials: 'H' },
      { name: 'Kierkegaard', initials: 'K' },
    ],
  },
  racionalista: {
    phrase: 'La razón es el único camino\nque no te traiciona.',
    description:
      'El racionalista construye su visión del mundo desde los primeros principios. No acepta nada por tradición ni por autoridad — solo por demostración lógica. Sus miembros tienen una relación casi íntima con la coherencia: la inconsistencia les duele como una piedra en el zapato. Son lentos para creer pero sólidos una vez convencidos. Su potencial: construir sistemas de pensamiento que resisten el tiempo y la crítica.',
    philosophers: [
      { name: 'Descartes', initials: 'D' },
      { name: 'Spinoza', initials: 'S' },
      { name: 'Leibniz', initials: 'L' },
      { name: 'Kant', initials: 'K' },
    ],
  },
  humanista: {
    phrase: 'Al final,\nsolo quedan las personas.',
    description:
      'El humanista pone al ser humano en el centro de todo análisis. Sus miembros no separan la filosofía de la empatía: para ellos, un sistema de ideas que ignore el sufrimiento real es un sistema fallido. Creen en la dignidad como principio no negociable y en la conexión entre personas como fuente de sentido. Su potencial: construir puentes donde otros levantan muros, y encontrar lo humano en lo más oscuro.',
    philosophers: [
      { name: 'Rousseau', initials: 'R' },
      { name: 'Erasmo', initials: 'E' },
      { name: 'Fromm', initials: 'F' },
      { name: 'Maslow', initials: 'M' },
    ],
  },
  realista: {
    phrase: 'El mundo es como es,\nno como quisieras que fuera.',
    description:
      'El realista no se consuela con ideales que no existen. Sus miembros ven las estructuras de poder, los incentivos reales y las limitaciones humanas con una claridad que a veces incomoda. No son cínicos — son precisos. Prefieren una verdad difícil a una esperanza vacía. Cuando toman decisiones, lo hacen sobre el terreno que hay, no el que desearían. Su potencial: actuar con efectividad en un mundo imperfecto sin perder la brújula moral.',
    philosophers: [
      { name: 'Maquiavelo', initials: 'M' },
      { name: 'Hobbes', initials: 'H' },
      { name: 'Tocqueville', initials: 'T' },
      { name: 'Weber', initials: 'W' },
    ],
  },
  trascendentalista: {
    phrase: 'Hay algo más allá\nde lo que puedes ver.',
    description:
      'El trascendentalista siente que la realidad visible es solo la superficie. Sus miembros buscan capas más profundas de sentido — en la naturaleza, en la conciencia, en lo que la ciencia aún no puede medir. No son irracionales: son sensibles a dimensiones de la experiencia que otros pasan por alto. La intuición, la belleza y el asombro son datos válidos para ellos. Su potencial: conectar lo cotidiano con algo mayor y encontrar sentido donde otros solo ven azar.',
    philosophers: [
      { name: 'Emerson', initials: 'E' },
      { name: 'Thoreau', initials: 'T' },
      { name: 'Jung', initials: 'J' },
      { name: 'Plotino', initials: 'P' },
    ],
  },
};

const FALLBACK_CONFIG: ClanConfigEntry = CLAN_CONFIG.estoico;

export function getClanConfig(clanId: string): ClanConfigEntry {
  return CLAN_CONFIG[clanId.toLowerCase().trim()] ?? FALLBACK_CONFIG;
}
