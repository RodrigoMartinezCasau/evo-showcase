/**
 * Local structured book catalog for philosophical reading recommendations.
 *
 * Each entry has:
 *  - id          unique slug
 *  - title       book title (Spanish preferred where widely known)
 *  - author      full author name
 *  - difficulty  'beginner' | 'intermediate' | 'advanced'
 *  - philosophies clan ids this book maps to (primary matches first)
 *  - tags        free-form keywords for secondary scoring
 */

export type BookDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type BookRecord = {
  id: string;
  title: string;
  author: string;
  difficulty: BookDifficulty;
  /** Clan ids this book aligns with — ordered by relevance. */
  philosophies: string[];
  tags: string[];
};

export const BOOK_DATABASE: BookRecord[] = [
  // ─── Existencialista ───────────────────────────────────────────────────────
  {
    id: 'el-extranjero',
    title: 'El Extranjero',
    author: 'Albert Camus',
    difficulty: 'beginner',
    philosophies: ['existencialista', 'nihilista'],
    tags: ['absurdo', 'identidad', 'muerte', 'libertad'],
  },
  {
    id: 'el-mito-de-sisifo',
    title: 'El Mito de Sísifo',
    author: 'Albert Camus',
    difficulty: 'intermediate',
    philosophies: ['existencialista', 'nihilista'],
    tags: ['absurdo', 'existencia', 'sentido', 'rebelión'],
  },
  {
    id: 'la-nausea',
    title: 'La Náusea',
    author: 'Jean-Paul Sartre',
    difficulty: 'intermediate',
    philosophies: ['existencialista'],
    tags: ['existencia', 'libertad', 'angustia', 'identidad'],
  },
  {
    id: 'el-ser-y-la-nada',
    title: 'El Ser y la Nada',
    author: 'Jean-Paul Sartre',
    difficulty: 'advanced',
    philosophies: ['existencialista'],
    tags: ['ontología', 'conciencia', 'libertad', 'existencia'],
  },
  {
    id: 'ser-y-tiempo',
    title: 'Ser y Tiempo',
    author: 'Martin Heidegger',
    difficulty: 'advanced',
    philosophies: ['existencialista', 'trascendentalista'],
    tags: ['ontología', 'existencia', 'muerte', 'tiempo'],
  },
  {
    id: 'el-hombre-en-busca-de-sentido',
    title: 'El Hombre en Busca de Sentido',
    author: 'Viktor Frankl',
    difficulty: 'beginner',
    philosophies: ['existencialista', 'humanista'],
    tags: ['sentido', 'sufrimiento', 'libertad', 'psicología'],
  },
  {
    id: 'el-existencialismo-es-un-humanismo',
    title: 'El Existencialismo es un Humanismo',
    author: 'Jean-Paul Sartre',
    difficulty: 'beginner',
    philosophies: ['existencialista', 'humanista'],
    tags: ['existencia', 'libertad', 'responsabilidad'],
  },

  // ─── Estoico ──────────────────────────────────────────────────────────────
  {
    id: 'meditaciones',
    title: 'Meditaciones',
    author: 'Marco Aurelio',
    difficulty: 'beginner',
    philosophies: ['estoico'],
    tags: ['disciplina', 'razón', 'virtud', 'muerte', 'poder'],
  },
  {
    id: 'manual-epicteto',
    title: 'Manual',
    author: 'Epicteto',
    difficulty: 'beginner',
    philosophies: ['estoico'],
    tags: ['libertad', 'disciplina', 'virtud', 'control'],
  },
  {
    id: 'de-la-brevedad-de-la-vida',
    title: 'Sobre la Brevedad de la Vida',
    author: 'Lucio Anneo Séneca',
    difficulty: 'beginner',
    philosophies: ['estoico'],
    tags: ['tiempo', 'muerte', 'virtud', 'sabiduría'],
  },
  {
    id: 'cartas-a-lucilio',
    title: 'Cartas a Lucilio',
    author: 'Lucio Anneo Séneca',
    difficulty: 'intermediate',
    philosophies: ['estoico'],
    tags: ['virtud', 'amistad', 'sabiduría', 'disciplina'],
  },
  {
    id: 'discursos-epicteto',
    title: 'Disertaciones',
    author: 'Epicteto',
    difficulty: 'intermediate',
    philosophies: ['estoico'],
    tags: ['libertad', 'disciplina', 'razón', 'virtud'],
  },
  {
    id: 'de-vita-beata',
    title: 'Sobre la Felicidad',
    author: 'Lucio Anneo Séneca',
    difficulty: 'beginner',
    philosophies: ['estoico', 'humanista'],
    tags: ['felicidad', 'virtud', 'razón', 'sabiduría'],
  },

  // ─── Racionalista ─────────────────────────────────────────────────────────
  {
    id: 'discurso-del-metodo',
    title: 'Discurso del Método',
    author: 'René Descartes',
    difficulty: 'beginner',
    philosophies: ['racionalista'],
    tags: ['razón', 'método', 'conocimiento', 'duda'],
  },
  {
    id: 'meditaciones-metafisicas',
    title: 'Meditaciones Metafísicas',
    author: 'René Descartes',
    difficulty: 'intermediate',
    philosophies: ['racionalista', 'trascendentalista'],
    tags: ['duda', 'conocimiento', 'existencia', 'razón'],
  },
  {
    id: 'critica-razon-pura',
    title: 'Crítica de la Razón Pura',
    author: 'Immanuel Kant',
    difficulty: 'advanced',
    philosophies: ['racionalista', 'trascendentalista'],
    tags: ['conocimiento', 'razón', 'espacio', 'tiempo', 'causalidad'],
  },
  {
    id: 'fundamentacion-metafisica-costumbres',
    title: 'Fundamentación de la Metafísica de las Costumbres',
    author: 'Immanuel Kant',
    difficulty: 'intermediate',
    philosophies: ['racionalista'],
    tags: ['ética', 'deber', 'moral', 'razón', 'libertad'],
  },
  {
    id: 'etica-spinoza',
    title: 'Ética',
    author: 'Baruch Spinoza',
    difficulty: 'advanced',
    philosophies: ['racionalista', 'trascendentalista'],
    tags: ['dios', 'sustancia', 'razón', 'libertad', 'afectos'],
  },
  {
    id: 'tratado-naturaleza-humana',
    title: 'Tratado de la Naturaleza Humana',
    author: 'David Hume',
    difficulty: 'advanced',
    philosophies: ['racionalista', 'cientista'],
    tags: ['conocimiento', 'causalidad', 'identidad', 'razón'],
  },

  // ─── Nihilista ────────────────────────────────────────────────────────────
  {
    id: 'asi-hablo-zaratustra',
    title: 'Así habló Zaratustra',
    author: 'Friedrich Nietzsche',
    difficulty: 'intermediate',
    philosophies: ['nihilista'],
    tags: ['voluntad', 'poder', 'superhombre', 'nihilismo', 'valores'],
  },
  {
    id: 'mas-alla-bien-mal',
    title: 'Más Allá del Bien y del Mal',
    author: 'Friedrich Nietzsche',
    difficulty: 'intermediate',
    philosophies: ['nihilista'],
    tags: ['moralidad', 'poder', 'verdad', 'perspectivismo'],
  },
  {
    id: 'la-genealogia-de-la-moral',
    title: 'La Genealogía de la Moral',
    author: 'Friedrich Nietzsche',
    difficulty: 'intermediate',
    philosophies: ['nihilista'],
    tags: ['moralidad', 'ressentiment', 'poder', 'valores', 'dolor'],
  },
  {
    id: 'el-anticristo',
    title: 'El Anticristo',
    author: 'Friedrich Nietzsche',
    difficulty: 'beginner',
    philosophies: ['nihilista'],
    tags: ['religión', 'moralidad', 'poder', 'nihilismo'],
  },
  {
    id: 'mundo-como-voluntad',
    title: 'El Mundo como Voluntad y Representación',
    author: 'Arthur Schopenhauer',
    difficulty: 'advanced',
    philosophies: ['nihilista', 'trascendentalista'],
    tags: ['voluntad', 'pesimismo', 'sufrimiento', 'arte', 'ascetismo'],
  },
  {
    id: 'el-nacimiento-tragedia',
    title: 'El Nacimiento de la Tragedia',
    author: 'Friedrich Nietzsche',
    difficulty: 'beginner',
    philosophies: ['nihilista', 'existencialista'],
    tags: ['arte', 'tragedia', 'dionisio', 'apolo', 'vida'],
  },

  // ─── Humanista ────────────────────────────────────────────────────────────
  {
    id: 'utopia',
    title: 'Utopía',
    author: 'Tomás Moro',
    difficulty: 'beginner',
    philosophies: ['humanista'],
    tags: ['sociedad', 'justicia', 'política', 'humanismo'],
  },
  {
    id: 'elogio-de-la-locura',
    title: 'Elogio de la Locura',
    author: 'Erasmo de Rotterdam',
    difficulty: 'beginner',
    philosophies: ['humanista'],
    tags: ['razón', 'sátira', 'sociedad', 'humanismo'],
  },
  {
    id: 'ensayos-montaigne',
    title: 'Ensayos',
    author: 'Michel de Montaigne',
    difficulty: 'intermediate',
    philosophies: ['humanista', 'existencialista'],
    tags: ['identidad', 'escepticismo', 'experiencia', 'humanismo'],
  },
  {
    id: 'discurso-sobre-la-dignidad',
    title: 'Discurso sobre la Dignidad del Hombre',
    author: 'Giovanni Pico della Mirandola',
    difficulty: 'beginner',
    philosophies: ['humanista', 'trascendentalista'],
    tags: ['dignidad', 'libertad', 'humanismo', 'espiritualidad'],
  },
  {
    id: 'emile',
    title: 'Emilio, o De la Educación',
    author: 'Jean-Jacques Rousseau',
    difficulty: 'intermediate',
    philosophies: ['humanista'],
    tags: ['educación', 'naturaleza', 'libertad', 'sociedad'],
  },

  // ─── Trascendentalista ────────────────────────────────────────────────────
  {
    id: 'fenomenologia-espiritu',
    title: 'Fenomenología del Espíritu',
    author: 'Georg Wilhelm Friedrich Hegel',
    difficulty: 'advanced',
    philosophies: ['trascendentalista', 'racionalista'],
    tags: ['dialéctica', 'espíritu', 'historia', 'conciencia', 'razón'],
  },
  {
    id: 'critica-razon-practica',
    title: 'Crítica de la Razón Práctica',
    author: 'Immanuel Kant',
    difficulty: 'advanced',
    philosophies: ['trascendentalista', 'racionalista'],
    tags: ['moral', 'deber', 'libertad', 'razón', 'ética'],
  },
  {
    id: 'bhagavad-gita',
    title: 'Bhagavad Gita',
    author: 'Veda Vyasa',
    difficulty: 'beginner',
    philosophies: ['trascendentalista'],
    tags: ['deber', 'espiritualidad', 'acción', 'trascendencia', 'yo'],
  },
  {
    id: 'las-eneadas',
    title: 'Las Enéadas',
    author: 'Plotino',
    difficulty: 'advanced',
    philosophies: ['trascendentalista'],
    tags: ['neoplatonismo', 'alma', 'lo-uno', 'contemplación', 'bien'],
  },
  {
    id: 'walden',
    title: 'Walden',
    author: 'Henry David Thoreau',
    difficulty: 'beginner',
    philosophies: ['trascendentalista', 'humanista'],
    tags: ['naturaleza', 'simplicidad', 'autoconocimiento', 'libertad'],
  },

  // ─── Cientista ────────────────────────────────────────────────────────────
  {
    id: 'breve-historia-tiempo',
    title: 'Breve Historia del Tiempo',
    author: 'Stephen Hawking',
    difficulty: 'beginner',
    philosophies: ['cientista'],
    tags: ['cosmología', 'universo', 'tiempo', 'física', 'ciencia'],
  },
  {
    id: 'origen-de-las-especies',
    title: 'El Origen de las Especies',
    author: 'Charles Darwin',
    difficulty: 'intermediate',
    philosophies: ['cientista'],
    tags: ['evolución', 'naturaleza', 'selección-natural', 'ciencia'],
  },
  {
    id: 'estructura-revoluciones-cientificas',
    title: 'La Estructura de las Revoluciones Científicas',
    author: 'Thomas Kuhn',
    difficulty: 'intermediate',
    philosophies: ['cientista'],
    tags: ['paradigma', 'ciencia', 'historia', 'conocimiento'],
  },
  {
    id: 'logica-investigacion-cientifica',
    title: 'La Lógica de la Investigación Científica',
    author: 'Karl Popper',
    difficulty: 'intermediate',
    philosophies: ['cientista', 'racionalista'],
    tags: ['falsificabilidad', 'método', 'ciencia', 'conocimiento'],
  },
  {
    id: 'el-gen-egoista',
    title: 'El Gen Egoísta',
    author: 'Richard Dawkins',
    difficulty: 'beginner',
    philosophies: ['cientista'],
    tags: ['evolución', 'biología', 'genes', 'naturaleza'],
  },
  {
    id: 'cosmos-sagan',
    title: 'Cosmos',
    author: 'Carl Sagan',
    difficulty: 'beginner',
    philosophies: ['cientista'],
    tags: ['universo', 'ciencia', 'humanismo', 'cosmología'],
  },

  // ─── Realista ─────────────────────────────────────────────────────────────
  {
    id: 'la-republica',
    title: 'La República',
    author: 'Platón',
    difficulty: 'intermediate',
    philosophies: ['realista', 'racionalista'],
    tags: ['justicia', 'política', 'sociedad', 'filosofo-rey', 'verdad'],
  },
  {
    id: 'etica-a-nicomaco',
    title: 'Ética a Nicómaco',
    author: 'Aristóteles',
    difficulty: 'intermediate',
    philosophies: ['realista', 'humanista'],
    tags: ['virtud', 'felicidad', 'ética', 'razón', 'amistad'],
  },
  {
    id: 'politica-aristoteles',
    title: 'Política',
    author: 'Aristóteles',
    difficulty: 'advanced',
    philosophies: ['realista'],
    tags: ['ciudad', 'constitución', 'poder', 'justicia', 'sociedad'],
  },
  {
    id: 'el-principe',
    title: 'El Príncipe',
    author: 'Nicolás Maquiavelo',
    difficulty: 'beginner',
    philosophies: ['realista'],
    tags: ['poder', 'política', 'liderazgo', 'sociedad', 'ambición'],
  },
  {
    id: 'leviatan',
    title: 'Leviatán',
    author: 'Thomas Hobbes',
    difficulty: 'advanced',
    philosophies: ['realista'],
    tags: ['contrato-social', 'poder', 'política', 'estado', 'sociedad'],
  },
  {
    id: 'segundo-tratado-gobierno',
    title: 'Segundo Tratado sobre el Gobierno Civil',
    author: 'John Locke',
    difficulty: 'intermediate',
    philosophies: ['realista', 'humanista'],
    tags: ['libertad', 'propiedad', 'política', 'sociedad', 'derechos'],
  },
  {
    id: 'los-discursos',
    title: 'Discursos sobre la Primera Década de Tito Livio',
    author: 'Nicolás Maquiavelo',
    difficulty: 'intermediate',
    philosophies: ['realista'],
    tags: ['república', 'poder', 'libertad', 'historia', 'política'],
  },

  // ─── Cross-philosophy advanced ────────────────────────────────────────────
  {
    id: 'investigaciones-filosoficas',
    title: 'Investigaciones Filosóficas',
    author: 'Ludwig Wittgenstein',
    difficulty: 'advanced',
    philosophies: ['racionalista', 'cientista'],
    tags: ['lenguaje', 'significado', 'lógica', 'juegos-de-lenguaje'],
  },
  {
    id: 'el-contrato-social',
    title: 'El Contrato Social',
    author: 'Jean-Jacques Rousseau',
    difficulty: 'intermediate',
    philosophies: ['humanista', 'realista'],
    tags: ['sociedad', 'libertad', 'política', 'voluntad-general'],
  },
  {
    id: 'alegria-del-conocimiento',
    title: 'La Gaya Ciencia',
    author: 'Friedrich Nietzsche',
    difficulty: 'intermediate',
    philosophies: ['nihilista', 'existencialista'],
    tags: ['ciencia', 'alegría', 'valores', 'dios-ha-muerto'],
  },
];
