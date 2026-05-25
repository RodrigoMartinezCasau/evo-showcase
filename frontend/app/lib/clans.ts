// Evo philosophical clans — bilingual source of truth (EN / ES).
// Copy is final and approved by the user. Do NOT edit text without explicit ask.

export type Lang = 'en' | 'es';

export interface Clan {
  /** URL slug + DOM id for anchor links — language-independent */
  id: string;
  name: string;
  animal: string;
  /** Long form, e.g. "Egyptian Mythology" */
  origin: string;
  /** Country / region only, e.g. "Egypt" */
  country: string;
  /** Per-clan accent colour, applied as CSS custom property --c */
  color: `#${string}`;
  /** Human-readable colour name shown in UI */
  colorName: string;
  short: string;
  long: string;
  motto: string;
  quote: string;
  author: string;
  img: string;
  map: string;
  mapScale: number;
  thinks: string;
  whyAnimal: string;
  whyColor: string;
}

const CLANS_EN: Clan[] = [
  {
    id: 'existentialists',
    name: 'Existentialists',
    animal: 'Phoenix',
    origin: 'Egyptian Mythology',
    country: 'Egypt',
    color: '#c93a39',
    colorName: 'Crimson Red',
    short: 'Meaning forged from chaos.',
    long: 'Rebirth, freedom, suffering, and the human need to create meaning after collapse.',
    motto: 'Become what survives you.',
    quote: '\u201cHuman beings call destiny everything they cannot bear.\u201d',
    author: 'Albert Camus',
    img: '/landing/animal-existentialist.png',
    map: '/landing/map-scandinavia.png',
    mapScale: 0.7,
    thinks:
      'Existentialists believe nobody is born with a predefined meaning. People become who they are through decisions, responsibility, suffering, and freedom. Existence comes first \u2014 identity is built, not inherited.',
    whyAnimal:
      'The Phoenix represents rebirth through suffering and transformation. It symbolizes the human ability to reconstruct meaning after collapse.',
    whyColor:
      'Crimson red reflects passion, freedom, pain, and the intensity of existing \u2014 the color of a life chosen against the absurd.',
  },
  {
    id: 'rationalists',
    name: 'Rationalists',
    animal: 'Owl of Athena',
    origin: 'Greek Mythology',
    country: 'Greece',
    color: '#395df2',
    colorName: 'Cyan Blue',
    short: 'Truth through thought.',
    long: 'Reason, clarity, wisdom, logic \u2014 the search for truth through disciplined thought.',
    motto: 'Truth begins with clarity.',
    quote: '\u201cIf truth kills them, let them die.\u201d',
    author: 'Immanuel Kant',
    img: '/landing/animal-rationalist.png',
    map: '/landing/map-south-africa.png',
    mapScale: 1,
    thinks:
      'Rationalists seek coherence above impulse. They distrust ideas that rely only on emotion, authority, or tradition. Truth must survive logic, structure, and criticism.',
    whyAnimal:
      'The Owl of Athena symbolizes wisdom, observation, logic, and intellectual clarity. It represents the belief that truth emerges through reason and critical thought.',
    whyColor:
      'Cyan blue reflects mental clarity and the cold precision of a thought tested against itself.',
  },
  {
    id: 'stoics',
    name: 'Stoics',
    animal: 'King Arthur',
    origin: 'English Mythology',
    country: 'England',
    color: '#818a41',
    colorName: 'Khaki Green',
    short: 'Master the self.',
    long: 'Discipline, duty, self-control, honor, and strength held against the weight of fate.',
    motto: 'Rule yourself first.',
    quote: '\u201cThey can kill me, but they cannot harm me.\u201d',
    author: 'Epictetus',
    img: '/landing/animal-stoic.png',
    map: '/landing/map-england.png',
    mapScale: 1,
    thinks:
      'Stoics understand that not everything can be controlled. Instead of fighting reality, they focus on discipline, action, resilience, and character. They seek mastery over themselves before mastery over the world.',
    whyAnimal:
      'King Arthur represents duty, sacrifice, honor, and stability during difficult times \u2014 the sovereign who serves something larger than himself.',
    whyColor:
      'Khaki green reflects endurance, temperance, and inner balance \u2014 the color of armor and earth that holds.',
  },
  {
    id: 'humanists',
    name: 'Humanists',
    animal: '!Khwa',
    origin: 'South African Mythology',
    country: 'South Africa',
    color: '#efb318',
    colorName: 'Warm Orange',
    short: 'The answer is each other.',
    long: 'Life, empathy, community, hope \u2014 the conviction that people can improve the world.',
    motto: 'Humanity is the answer.',
    quote: '\u201cMan is born good; society corrupts him.\u201d',
    author: 'Jean-Jacques Rousseau',
    img: '/landing/animal-humanist.png',
    map: '/landing/map-mexico.png',
    mapScale: 0.92,
    thinks:
      'Humanists place people at the center. Ideas matter only if they improve real human lives. Empathy, dignity, and connection are the foundation of meaning.',
    whyAnimal:
      '!Khwa symbolizes life, rain, cooperation, and shared hope \u2014 the everyday miracle of people choosing each other.',
    whyColor:
      'Warm orange reflects vitality, closeness, and the heat of human company.',
  },
  {
    id: 'transcendentalists',
    name: 'Transcendentalists',
    animal: 'Quetzalcoatl',
    origin: 'Mexican Mythology',
    country: 'Mexico',
    color: '#8d61d1',
    colorName: 'Mystic Purple',
    short: 'Beyond the visible.',
    long: 'Spiritual elevation, inner truth, mystery \u2014 the bridge between earth and the divine.',
    motto: 'Look beyond the visible.',
    quote: '\u201cWe are all in the gutter, but some of us are looking at the stars.\u201d',
    author: 'Oscar Wilde',
    img: '/landing/animal-transcendentalist.png',
    map: '/landing/map-egypt.png',
    mapScale: 0.92,
    thinks:
      'Transcendentalists feel reality goes beyond the visible. They search for meaning through beauty, intuition, consciousness, spirituality, and wonder.',
    whyAnimal:
      'Quetzalcoatl connects the earthly with the divine. It symbolizes transcendence, higher consciousness, and spiritual elevation.',
    whyColor:
      'Mystic purple reflects mystery, contemplation, and the threshold between worlds.',
  },
  {
    id: 'scientists',
    name: 'Scientists',
    animal: 'Oriental Dragon',
    origin: 'Chinese Mythology',
    country: 'China',
    color: '#529da2',
    colorName: 'Teal Blue',
    short: 'Understand. Then transform.',
    long: 'Discovery, natural forces, knowledge, experimentation, and technological progress.',
    motto: 'Understand the world. Then transform it.',
    quote:
      '\u201cThe most incomprehensible thing about the universe is that it is comprehensible.\u201d',
    author: 'Albert Einstein',
    img: '/landing/animal-scientist.png',
    map: '/landing/map-patagonia.png',
    mapScale: 0.95,
    thinks:
      'Scientists test reality instead of assuming it. They observe, measure, doubt, adapt, and evolve their beliefs when evidence changes.',
    whyAnimal:
      'The Eastern Dragon symbolizes wisdom, harmony, knowledge, and mastery of nature through understanding rather than force.',
    whyColor:
      'Teal blue reflects the cool, patient discipline of inquiry \u2014 ocean depth and instrument glass.',
  },
  {
    id: 'nihilists',
    name: 'Nihilists',
    animal: 'Penguin',
    origin: 'Patagonian Mythology',
    country: 'Patagonia',
    color: '#bdb29c',
    colorName: 'Pale Beige',
    short: 'Continue anyway.',
    long: 'Absurdity, emptiness, irony, distance, and a quiet persistence in a cold universe.',
    motto: 'Nothing matters. Continue anyway.',
    quote: '\u201cThere are more idols than realities.\u201d',
    author: 'Friedrich Nietzsche',
    img: '/landing/animal-nihilist.png',
    map: '/landing/map-china.png',
    mapScale: 1.1,
    thinks:
      'Nihilists reject inherited truths and easy certainties. They prefer an uncomfortable reality over comforting illusions.',
    whyAnimal:
      'The Patagonian Penguin represents absurd persistence in a cold and indifferent universe \u2014 walking anyway, in the wind.',
    whyColor:
      'Pale beige reflects emptiness without despair \u2014 the colour of a long horizon and a clear, indifferent sky.',
  },
  {
    id: 'realists',
    name: 'Realists',
    animal: 'Fenrir',
    origin: 'Scandinavian Mythology',
    country: 'Scandinavia',
    color: '#a2a3a8',
    colorName: 'Steel Gray',
    short: 'See without illusion.',
    long: 'Power, inevitability, survival, and the acceptance of the world exactly as it is.',
    motto: 'See the world without illusion.',
    quote: '\u201cIf you play fair in a world of wolves, you lose.\u201d',
    author: 'Niccol\u00f2 Machiavelli',
    img: '/landing/animal-realist.png',
    map: '/landing/map-greece.png',
    mapScale: 1,
    thinks:
      'Realists see the world as it is, not as they wish it to be. They understand power, conflict, and human limitations without romanticizing them.',
    whyAnimal:
      'Fenrir symbolizes unavoidable reality, conflict, survival, and pragmatic adaptation \u2014 the wolf that cannot be wished away.',
    whyColor:
      'Steel gray reflects pragmatism, weight, and the unsentimental clarity of cold metal.',
  },
];

const CLANS_ES: Clan[] = [
  {
    id: 'existentialists',
    name: 'Existencialistas',
    animal: 'F\u00e9nix',
    origin: 'Mitolog\u00eda Egipcia',
    country: 'Egipto',
    color: '#c93a39',
    colorName: 'Rojo Carmes\u00ed',
    short: 'Sentido forjado desde el caos.',
    long: 'Renacimiento, libertad, sufrimiento y la necesidad humana de crear significado tras el colapso.',
    motto: 'Convi\u00e9rtete en lo que te sobreviva.',
    quote: '\u00abEl ser humano llama destino a todo lo que no puede soportar.\u00bb',
    author: 'Albert Camus',
    img: '/landing/animal-existentialist.png',
    map: '/landing/map-scandinavia.png',
    mapScale: 0.7,
    thinks:
      'Los existencialistas creen que nadie nace con un significado predefinido. Las personas se convierten en quienes son a trav\u00e9s de decisiones, responsabilidad, sufrimiento y libertad. La existencia es lo primero \u2014 la identidad se construye, no se hereda.',
    whyAnimal:
      'El F\u00e9nix representa el renacimiento a trav\u00e9s del sufrimiento y la transformaci\u00f3n. Simboliza la capacidad humana de reconstruir el sentido tras el colapso.',
    whyColor:
      'El rojo carmes\u00ed refleja pasi\u00f3n, libertad, dolor y la intensidad de existir \u2014 el color de una vida elegida contra el absurdo.',
  },
  {
    id: 'rationalists',
    name: 'Racionalistas',
    animal: 'Lechuza de Atenea',
    origin: 'Mitolog\u00eda Griega',
    country: 'Grecia',
    color: '#395df2',
    colorName: 'Azul Cian',
    short: 'La verdad a trav\u00e9s del pensamiento.',
    long: 'Raz\u00f3n, claridad, sabidur\u00eda, l\u00f3gica \u2014 la b\u00fasqueda de la verdad mediante el pensamiento disciplinado.',
    motto: 'La verdad empieza con claridad.',
    quote: '\u00abSi la verdad los mata, que mueran.\u00bb',
    author: 'Immanuel Kant',
    img: '/landing/animal-rationalist.png',
    map: '/landing/map-south-africa.png',
    mapScale: 1,
    thinks:
      'Los racionalistas buscan la coherencia por encima del impulso. Desconf\u00edan de las ideas que se sostienen solo en la emoci\u00f3n, la autoridad o la tradici\u00f3n. La verdad debe sobrevivir a la l\u00f3gica, la estructura y la cr\u00edtica.',
    whyAnimal:
      'La Lechuza de Atenea simboliza sabidur\u00eda, observaci\u00f3n, l\u00f3gica y claridad intelectual. Representa la creencia de que la verdad emerge mediante la raz\u00f3n y el pensamiento cr\u00edtico.',
    whyColor:
      'El azul cian refleja la claridad mental y la fr\u00eda precisi\u00f3n de un pensamiento puesto a prueba contra s\u00ed mismo.',
  },
  {
    id: 'stoics',
    name: 'Estoicos',
    animal: 'Rey Arturo',
    origin: 'Mitolog\u00eda Inglesa',
    country: 'Inglaterra',
    color: '#818a41',
    colorName: 'Verde Caqui',
    short: 'Domina al ser.',
    long: 'Disciplina, deber, autocontrol, honor y fuerza sostenida contra el peso del destino.',
    motto: 'Gobi\u00e9rnate primero a ti mismo.',
    quote: '\u00abPueden matarme, pero no pueden hacerme da\u00f1o.\u00bb',
    author: 'Epicteto',
    img: '/landing/animal-stoic.png',
    map: '/landing/map-england.png',
    mapScale: 1,
    thinks:
      'Los estoicos entienden que no todo puede controlarse. En lugar de luchar contra la realidad, se centran en la disciplina, la acci\u00f3n, la resiliencia y el car\u00e1cter. Buscan el dominio sobre s\u00ed mismos antes que el dominio sobre el mundo.',
    whyAnimal:
      'El Rey Arturo representa el deber, el sacrificio, el honor y la estabilidad en tiempos dif\u00edciles \u2014 el soberano que sirve a algo mayor que \u00e9l mismo.',
    whyColor:
      'El verde caqui refleja resistencia, templanza y equilibrio interior \u2014 el color de la armadura y de la tierra que sostiene.',
  },
  {
    id: 'humanists',
    name: 'Humanistas',
    animal: '!Khwa',
    origin: 'Mitolog\u00eda Sudafricana',
    country: 'Sud\u00e1frica',
    color: '#efb318',
    colorName: 'Naranja C\u00e1lido',
    short: 'La respuesta somos los dem\u00e1s.',
    long: 'Vida, empat\u00eda, comunidad, esperanza \u2014 la convicci\u00f3n de que las personas pueden mejorar el mundo.',
    motto: 'La humanidad es la respuesta.',
    quote: '\u00abEl hombre nace bueno; la sociedad lo corrompe.\u00bb',
    author: 'Jean-Jacques Rousseau',
    img: '/landing/animal-humanist.png',
    map: '/landing/map-mexico.png',
    mapScale: 0.92,
    thinks:
      'Los humanistas colocan a las personas en el centro. Las ideas solo importan si mejoran vidas humanas reales. Empat\u00eda, dignidad y conexi\u00f3n son los cimientos del sentido.',
    whyAnimal:
      '!Khwa simboliza vida, lluvia, cooperaci\u00f3n y esperanza compartida \u2014 el milagro cotidiano de personas que se eligen mutuamente.',
    whyColor:
      'El naranja c\u00e1lido refleja vitalidad, cercan\u00eda y el calor de la compa\u00f1\u00eda humana.',
  },
  {
    id: 'transcendentalists',
    name: 'Trascendentalistas',
    animal: 'Quetzalc\u00f3atl',
    origin: 'Mitolog\u00eda Mexicana',
    country: 'M\u00e9xico',
    color: '#8d61d1',
    colorName: 'P\u00farpura M\u00edstico',
    short: 'M\u00e1s all\u00e1 de lo visible.',
    long: 'Elevaci\u00f3n espiritual, verdad interior, misterio \u2014 el puente entre la tierra y lo divino.',
    motto: 'Mira m\u00e1s all\u00e1 de lo visible.',
    quote: '\u00abTodos estamos en la cuneta, pero algunos miramos las estrellas.\u00bb',
    author: 'Oscar Wilde',
    img: '/landing/animal-transcendentalist.png',
    map: '/landing/map-egypt.png',
    mapScale: 0.92,
    thinks:
      'Los trascendentalistas sienten que la realidad va m\u00e1s all\u00e1 de lo visible. Buscan significado a trav\u00e9s de la belleza, la intuici\u00f3n, la conciencia, la espiritualidad y el asombro.',
    whyAnimal:
      'Quetzalc\u00f3atl conecta lo terrenal con lo divino. Simboliza la trascendencia, la conciencia superior y la elevaci\u00f3n espiritual.',
    whyColor:
      'El p\u00farpura m\u00edstico refleja misterio, contemplaci\u00f3n y el umbral entre mundos.',
  },
  {
    id: 'scientists',
    name: 'Cient\u00edficos',
    animal: 'Drag\u00f3n Oriental',
    origin: 'Mitolog\u00eda China',
    country: 'China',
    color: '#529da2',
    colorName: 'Azul Verdoso',
    short: 'Comprende. Luego transforma.',
    long: 'Descubrimiento, fuerzas naturales, conocimiento, experimentaci\u00f3n y progreso tecnol\u00f3gico.',
    motto: 'Comprende el mundo. Luego transf\u00f3rmalo.',
    quote:
      '\u00abLo m\u00e1s incomprensible del universo es que sea comprensible.\u00bb',
    author: 'Albert Einstein',
    img: '/landing/animal-scientist.png',
    map: '/landing/map-patagonia.png',
    mapScale: 0.95,
    thinks:
      'Los cient\u00edficos ponen a prueba la realidad en lugar de asumirla. Observan, miden, dudan, se adaptan y evolucionan sus creencias cuando la evidencia cambia.',
    whyAnimal:
      'El Drag\u00f3n Oriental simboliza la sabidur\u00eda, la armon\u00eda, el conocimiento y el dominio de la naturaleza mediante el entendimiento, no la fuerza.',
    whyColor:
      'El azul verdoso refleja la disciplina fr\u00eda y paciente de la indagaci\u00f3n \u2014 la profundidad del oc\u00e9ano y el cristal del instrumento.',
  },
  {
    id: 'nihilists',
    name: 'Nihilistas',
    animal: 'Ping\u00fcino',
    origin: 'Mitolog\u00eda Patag\u00f3nica',
    country: 'Patagonia',
    color: '#bdb29c',
    colorName: 'Beige P\u00e1lido',
    short: 'Contin\u00faa de todos modos.',
    long: 'Absurdo, vac\u00edo, iron\u00eda, distancia y una callada persistencia en un universo fr\u00edo.',
    motto: 'Nada importa. Contin\u00faa de todos modos.',
    quote: '\u00abHay m\u00e1s \u00eddolos que realidades.\u00bb',
    author: 'Friedrich Nietzsche',
    img: '/landing/animal-nihilist.png',
    map: '/landing/map-china.png',
    mapScale: 1.1,
    thinks:
      'Los nihilistas rechazan las verdades heredadas y las certezas f\u00e1ciles. Prefieren una realidad inc\u00f3moda antes que ilusiones reconfortantes.',
    whyAnimal:
      'El Ping\u00fcino patag\u00f3nico representa la persistencia absurda en un universo fr\u00edo e indiferente \u2014 caminando de todos modos, contra el viento.',
    whyColor:
      'El beige p\u00e1lido refleja un vac\u00edo sin desesperaci\u00f3n \u2014 el color de un horizonte largo y un cielo claro e indiferente.',
  },
  {
    id: 'realists',
    name: 'Realistas',
    animal: 'Fenrir',
    origin: 'Mitolog\u00eda Escandinava',
    country: 'Escandinavia',
    color: '#a2a3a8',
    colorName: 'Gris Acero',
    short: 'Ver sin ilusiones.',
    long: 'Poder, inevitabilidad, supervivencia y la aceptaci\u00f3n del mundo tal como es.',
    motto: 'Mira el mundo sin ilusiones.',
    quote: '\u00abSi juegas limpio en un mundo de lobos, pierdes.\u00bb',
    author: 'Niccol\u00f2 Machiavelli',
    img: '/landing/animal-realist.png',
    map: '/landing/map-greece.png',
    mapScale: 1,
    thinks:
      'Los realistas ven el mundo como es, no como desear\u00edan que fuera. Entienden el poder, el conflicto y las limitaciones humanas sin romantizarlos.',
    whyAnimal:
      'Fenrir simboliza la realidad ineludible, el conflicto, la supervivencia y la adaptaci\u00f3n pragm\u00e1tica \u2014 el lobo que no puede deseársele lejos.',
    whyColor:
      'El gris acero refleja pragmatismo, peso y la claridad sin sentimentalismos del metal fr\u00edo.',
  },
];

export function getClans(lang: Lang): Clan[] {
  return lang === 'es' ? CLANS_ES : CLANS_EN;
}

export const IOS_URL =
  (typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_IOS_APP_STORE_URL) ||
  'https://apps.apple.com/app/id6764981767';

export const ANDROID_URL =
  'https://play.google.com/store/apps/details?id=com.evoconn.evo';
