// EVO — Centro de tutoriales (Info): diccionario ES / EN.
// Todo el "chrome" de la página + el contenido de los 5 tutoriales (incluidos
// los textos internos de cada slide) viven aquí para poder traducirlos.

import type { Lang } from '../lib/clans';

// ── Slide descriptors (plain data → rendered by EvoTutoriales.tsx) ──
export type TutorialSlideSpec = {
  type: 'tutorial';
  kind: 'cover' | 'step' | 'result';
  step: number;
  count: number;
  coverKicker?: string;
  coverTitleLines?: string[];
  coverAccentWord?: string;
  coverVisual?: 'clan' | 'star' | 'image';
  coverImageSrc?: string;
  stepNum?: string;
  stepKicker?: string;
  stepHeadline?: string;
  stepDesc?: string;
  stepButtonSrc?: string;
  stepLogos?: string[];
  stepShotSrc?: string;
  resultEyebrow?: string;
  resultTitleLines?: string[];
  resultAccentWord?: string;
  resultDesc?: string;
};

export type CompSlideSpec = {
  type: 'comp';
  kind: 'cover' | 'step' | 'note';
  step: number;
  count: number;
  coverKicker?: string;
  coverTitleLines?: string[];
  coverAccentWord?: string;
  stepNum?: string;
  stepKicker?: string;
  stepHeadline?: string;
  stepDesc?: string;
  visual?: 'number' | 'formula' | 'widget' | 'season' | 'reward';
  widgetSrc?: string;
  season?: { day: string; month: string; time: string };
  noteKicker?: string;
  noteHeadline?: string;
  noteDesc?: string;
  dots?: {
    lowTitle: string; lowOn: number; lowTotal: number; lowAvg: string;
    highTitle: string; highOn: number; highTotal: number; highAvg: string;
  };
};

export type WidgetSlideSpec = {
  type: 'widget';
  kind: 'cover' | 'step' | 'final';
  step: number;
  count: number;
  shot: 'phone' | 'card';
  img: string;
  ratio?: number;
  kicker?: string;
  title?: string;
  accent?: string;
  desc?: string;
  note?: string;
};

export type SlideSpec = TutorialSlideSpec | CompSlideSpec | WidgetSlideSpec;

export type Tutorial = {
  id: string;
  cat: string;
  title: string;
  accent: string;
  desc: string;
  tags: string[];
  search: string;
  slides: SlideSpec[];
};

export interface TutChrome {
  tutEyebrow: string;
  compEyebrow: string;
  widgetEyebrow: string;
  swipe: string;
  continue: string;
  outro: string;
  buttonHint: string;
  seasonLabel: string;
  vs: string;
}

export interface TutDict {
  nav: { active: string; download: string; back: string };
  hero: { eyebrow: string; title: string; titleAccent: string; sub: string };
  search: { placeholder: string; clear: string; ariaSearch: string };
  chips: string[];
  meta: { one: string; many: string; forWord: string };
  empty: { title: (q: string) => string; sub: string; reset: string };
  footer: { left: string; right: string };
  chrome: TutChrome;
  langToggle: { label: string; other: string };
  tutorials: Tutorial[];
  metaTitle: string;
  metaDesc: string;
}

// ──────────────────────────────────────────────────────────────────
// ESPAÑOL
// ──────────────────────────────────────────────────────────────────
const CHROME_ES: TutChrome = {
  tutEyebrow: 'EVO · TUTORIAL',
  compEyebrow: 'EVO · COMPETICIÓN',
  widgetEyebrow: 'EVO · CÓMO AÑADIR WIDGETS',
  swipe: 'Desliza',
  continue: 'Continúa',
  outro: 'evo.app · @evo',
  buttonHint: 'Pulsa este botón en la barra lateral',
  seasonLabel: 'Fin de temporada',
  vs: 'vs',
};

const TUTORIALS_ES: Tutorial[] = [
  {
    id: 'clan',
    cat: 'Identidad',
    title: 'Cómo desbloquear tu clan filosófico',
    accent: 'clan',
    desc: 'Manda tus primeras frases y reflexiones para que EVO pueda leerte y revelar a qué clan perteneces.',
    tags: ['clan', 'frases', 'reflexiones', 'empezar', 'perfil filosófico'],
    search: 'clan filosófico desbloquear frases reflexiones largas privadas cuaderno empezar identidad enviar app honestas',
    slides: [
      { type: 'tutorial', kind: 'cover', step: 1, count: 4,
        coverKicker: 'Un mini-tutorial',
        coverTitleLines: ['Cómo desbloquear', 'tu clan filosófico.'],
        coverAccentWord: 'clan' },
      { type: 'tutorial', kind: 'step', step: 2, count: 4, stepNum: '01',
        stepKicker: 'Paso 01 · Frases',
        stepHeadline: 'Envía entre siete y ocho frases.',
        stepDesc: 'Desde la app. No hace falta que las publiques — pueden quedarse privadas en tu cuaderno.',
        stepButtonSrc: 'btn-nueva-frase.png' },
      { type: 'tutorial', kind: 'step', step: 3, count: 4, stepNum: '02',
        stepKicker: 'Paso 02 · Reflexiones',
        stepHeadline: 'Envía al menos cuatro reflexiones largas.',
        stepDesc: 'Tómatelas con calma. Cuanto más profundas y honestas, mejor te lee tu clan.',
        stepButtonSrc: 'btn-nueva-reflexion.png' },
      { type: 'tutorial', kind: 'result', step: 4, count: 4,
        resultEyebrow: 'Listo',
        resultTitleLines: ['Tu clan filosófico', 'queda desbloqueado.'],
        resultAccentWord: 'desbloqueado',
        resultDesc: 'Y podrá seguir cambiando a medida que evoluciones.' },
    ],
  },
  {
    id: 'borrar',
    cat: 'Publicaciones',
    title: 'Cómo borrar una publicación',
    accent: 'borrar',
    desc: 'Elimina u oculta cualquier frase o reflexión que ya no quieras tener en tu perfil, en tres pasos.',
    tags: ['borrar', 'eliminar', 'ocultar', 'publicación', 'perfil'],
    search: 'borrar eliminar ocultar publicación post perfil usuario tres puntos opciones menú feed retira frase reflexión',
    slides: [
      { type: 'tutorial', kind: 'cover', step: 1, count: 5,
        coverVisual: 'image', coverImageSrc: 'btn-eliminar-post.png',
        coverKicker: 'Un mini-tutorial',
        coverTitleLines: ['Cómo borrar', 'una publicación.'],
        coverAccentWord: 'borrar' },
      { type: 'tutorial', kind: 'step', step: 2, count: 5, stepNum: '01',
        stepKicker: 'Paso 01 · Perfil',
        stepHeadline: 'Ve a tu perfil de usuario.',
        stepDesc: 'Abre la app y entra en tu perfil para ver tus publicaciones.',
        stepShotSrc: 'shot-perfil.png' },
      { type: 'tutorial', kind: 'step', step: 3, count: 5, stepNum: '02',
        stepKicker: 'Paso 02 · Opciones',
        stepHeadline: 'Pulsa los tres puntos de la publicación.',
        stepDesc: 'Aparecen arriba a la derecha de cada publicación y abren el menú.',
        stepShotSrc: 'shot-tres-puntos.png' },
      { type: 'tutorial', kind: 'step', step: 4, count: 5, stepNum: '03',
        stepKicker: 'Paso 03 · Eliminar',
        stepHeadline: 'Pulsa Eliminar u Ocultar.',
        stepDesc: 'El que prefieras: eliminar la borra del todo, ocultar solo la retira de tu perfil.',
        stepShotSrc: 'shot-eliminar.png' },
      { type: 'tutorial', kind: 'result', step: 5, count: 5,
        resultEyebrow: 'Listo',
        resultTitleLines: ['Tu publicación', 'se elimina por completo.'],
        resultAccentWord: 'por completo',
        resultDesc: 'Desaparece de tu perfil y del feed al instante.' },
    ],
  },
  {
    id: 'widgets',
    cat: 'Pantalla de inicio',
    title: 'Cómo añadir los widgets de EVO',
    accent: 'widgets',
    desc: 'Coloca EVO en tu pantalla de inicio o de bloqueo para tener tu frase del día siempre a la vista.',
    tags: ['widget', 'widgets', 'pantalla de inicio', 'pantalla de bloqueo', 'iphone', 'android'],
    search: 'widget widgets pantalla de inicio bloqueo iphone android mantener pulsado zona vacía editar buscar evo tamaño pequeño grande añadir',
    slides: [
      { type: 'widget', kind: 'cover', step: 1, count: 5, shot: 'card',
        img: 'shot-home-widget.jpg', ratio: 1290 / 1831,
        kicker: 'Antes de empezar',
        title: '¿Cómo añadir los widgets de EVO?', accent: 'widgets de EVO',
        note: 'Las instrucciones también están dentro de tu perfil.' },
      { type: 'widget', kind: 'step', step: 2, count: 5, shot: 'phone',
        img: 'shot-editmode.jpg',
        kicker: 'Paso 01 · Pantalla de inicio',
        title: 'Mantén pulsada una zona vacía', accent: 'zona vacía',
        desc: 'Se abre el menú de edición de tu teléfono.' },
      { type: 'widget', kind: 'step', step: 3, count: 5, shot: 'phone',
        img: 'shot-widgetmenu.png',
        kicker: 'Paso 02 · Buscar',
        title: 'Busca EVO', accent: 'EVO',
        desc: 'Encuentra la aplicación dentro del menú de widgets.' },
      { type: 'widget', kind: 'step', step: 4, count: 5, shot: 'card',
        img: 'shot-sizes.jpg', ratio: 1290 / 1589,
        kicker: 'Paso 03 · Tamaño',
        title: 'Elige el tamaño', accent: 'tamaño',
        desc: 'Puedes usar el widget pequeño o el grande.' },
      { type: 'widget', kind: 'final', step: 5, count: 5, shot: 'phone',
        img: 'shot-lockscreen.png',
        kicker: 'Usuarios de iPhone',
        title: 'También puedes añadir EVO a tu pantalla de bloqueo.', accent: 'pantalla de bloqueo',
        desc: 'Sigue exactamente los mismos pasos, pero desde la pantalla de bloqueo.' },
    ],
  },
  {
    id: 'competicion',
    cat: 'Clanes',
    title: 'Cómo funciona la competición entre clanes',
    accent: 'competición',
    desc: 'Lo que puntúa es la media por persona, no el total. Te explicamos cómo gana tu clan cada temporada.',
    tags: ['competición', 'clanes', 'media', 'temporada', 'ranking', 'premio'],
    search: 'competición clanes media por persona puntuación participación temporada mes duración premio recompensa ranking miembros activo dormido junio cierre',
    slides: [
      { type: 'comp', kind: 'cover', step: 1, count: 6,
        coverKicker: 'Guía rápida',
        coverTitleLines: ['¿Cómo funciona', 'la competición', 'entre clanes?'],
        coverAccentWord: 'competición' },
      { type: 'comp', kind: 'step', step: 2, count: 6, visual: 'widget',
        stepKicker: 'Paso 01 · Puntuación',
        widgetSrc: 'widget-ranking-clan.jpg',
        stepHeadline: 'Cada clan compite con su media.',
        stepDesc: 'No se suma el total de frases y reflexiones: se divide entre sus miembros. Lo que puntúa es la media por persona, no el número absoluto.' },
      { type: 'comp', kind: 'step', step: 3, count: 6, visual: 'number', stepNum: '02',
        stepKicker: 'Paso 02 · Participación',
        stepHeadline: '¿Te unes con el mes empezado? También cuentas.',
        stepDesc: 'Los usuarios que entran a un clan después de arrancar la competición participan igual, desde su primer día.' },
      { type: 'comp', kind: 'step', step: 4, count: 6, visual: 'season',
        stepKicker: 'Paso 03 · Duración',
        season: { day: '30', month: 'Junio', time: '23:59 · cierre' },
        stepHeadline: 'Cada temporada dura un mes.',
        stepDesc: 'Esta edición se cierra el 30 de junio a las 23:59. Después arranca una temporada nueva, de cero.' },
      { type: 'comp', kind: 'step', step: 5, count: 6, visual: 'reward',
        stepKicker: 'Paso 04 · Premio',
        stepHeadline: 'El clan ganador puede llevarse recompensas.',
        stepDesc: 'Cuanto más participe tu clan a lo largo del mes, más cerca estaréis del primer puesto.' },
      { type: 'comp', kind: 'note', step: 6, count: 6,
        noteKicker: 'Aclaración importante',
        dots: { lowTitle: 'Clan grande', lowOn: 3, lowTotal: 12, lowAvg: 'media baja', highTitle: 'Clan activo', highOn: 5, highTotal: 5, highAvg: 'media alta' },
        noteHeadline: 'Tener muchos miembros no es una ventaja.',
        noteDesc: 'Si un clan es enorme pero la mayoría no participa, su media baja y sale perjudicado. Vale más un clan pequeño y activo que uno grande y dormido.' },
    ],
  },
  {
    id: 'foto',
    cat: 'Publicaciones',
    title: 'Cómo añadir una foto a tu publicación',
    accent: 'foto',
    desc: 'Acompaña tus frases y reflexiones con una imagen de tu galería y, si quieres, música. Disponible con la última actualización.',
    tags: ['foto', 'imagen', 'publicación', 'música', 'actualizar'],
    search: 'foto imagen galería publicación frase reflexión actualizar app store play store nueva publicar añadir foto ajustar encuadre para ti siguiendo música audio canción sin audio publicar flecha última actualización',
    slides: [
      { type: 'tutorial', kind: 'cover', step: 1, count: 9,
        coverVisual: 'image', coverImageSrc: 'post-img-tutorial/cover-post.jpg',
        coverKicker: 'Un mini-tutorial',
        coverTitleLines: ['Cómo añadir una foto', 'a tu publicación.'],
        coverAccentWord: 'foto' },
      { type: 'tutorial', kind: 'step', step: 2, count: 9, stepNum: '00',
        stepKicker: 'Paso 00 · Actualiza',
        stepHeadline: 'Actualiza la app en el App Store o Play Store.',
        stepDesc: 'La función de fotos solo está en la última versión — asegúrate de tenerla al día.',
        stepLogos: ['post-img-tutorial/logo-appstore.png', 'post-img-tutorial/logo-playstore.png'] },
      { type: 'tutorial', kind: 'step', step: 3, count: 9, stepNum: '01',
        stepKicker: 'Paso 01 · Crear',
        stepHeadline: 'Crea una nueva reflexión o frase.',
        stepDesc: 'Desde el menú, abre Nueva reflexión o Nueva frase.',
        stepShotSrc: 'post-img-tutorial/real-01.png' },
      { type: 'tutorial', kind: 'step', step: 4, count: 9, stepNum: '02',
        stepKicker: 'Paso 02 · Publicar',
        stepHeadline: 'Pulsa el botón de publicar.',
        stepDesc: 'Dentro de la reflexión o frase, toca publicar para abrir las opciones.',
        stepShotSrc: 'post-img-tutorial/real-02.png' },
      { type: 'tutorial', kind: 'step', step: 5, count: 9, stepNum: '03',
        stepKicker: 'Paso 03 · Foto',
        stepHeadline: 'Pulsa Añadir foto.',
        stepDesc: 'En tu publicación aparece la nueva opción Añadir foto.',
        stepShotSrc: 'post-img-tutorial/real-03.png' },
      { type: 'tutorial', kind: 'step', step: 6, count: 9, stepNum: '04',
        stepKicker: 'Paso 04 · Galería',
        stepHeadline: 'Elige la foto de tu galería.',
        stepDesc: 'Selecciona desde el carrete la imagen que quieres adjuntar.',
        stepShotSrc: 'post-img-tutorial/real-04.png' },
      { type: 'tutorial', kind: 'step', step: 7, count: 9, stepNum: '05',
        stepKicker: 'Paso 05 · Ajustar',
        stepHeadline: 'Ajusta cómo se verá.',
        stepDesc: 'Encuádrala para Para ti y para Siguiendo — son dos vistas distintas.',
        stepShotSrc: 'post-img-tutorial/real-05.png' },
      { type: 'tutorial', kind: 'step', step: 8, count: 9, stepNum: '06',
        stepKicker: 'Paso 06 · Música',
        stepHeadline: 'Elige música y publica.',
        stepDesc: 'Añade una canción (o ninguna) y pulsa la flecha para publicar.',
        stepShotSrc: 'post-img-tutorial/real-06.png' },
      { type: 'tutorial', kind: 'result', step: 9, count: 9,
        resultEyebrow: 'Listo',
        resultTitleLines: ['Tu publicación sale', 'con foto y música.'],
        resultAccentWord: 'con foto',
        resultDesc: 'Aparece en el feed tal y como la encuadraste, en Para ti y en Siguiendo.' },
    ],
  },
];

const DICT_ES: TutDict = {
  nav: { active: 'Info / Ayuda', download: 'Descargar', back: 'Volver a la web' },
  hero: { eyebrow: 'Evo · Guías', title: '¿En qué necesitas ayuda?', titleAccent: 'ayuda',
    sub: 'Cada guía, paso a paso. Busca tu duda o desliza por los tutoriales.' },
  search: { placeholder: 'Busca: clan, widget, borrar, foto, competición…', clear: 'Borrar búsqueda', ariaSearch: 'Buscar tutoriales' },
  chips: ['clan', 'widgets', 'borrar', 'foto', 'competición', 'reflexiones'],
  meta: { one: 'tutorial', many: 'tutoriales', forWord: 'para' },
  empty: {
    title: (q) => `Sin resultados para “${q}”.`,
    sub: 'Prueba con otra palabra: clan, widget, borrar, foto o competición.',
    reset: 'Ver todos los tutoriales',
  },
  footer: { left: '© MMXXVI Evo · Centro de ayuda', right: 'evo.app · @evo' },
  chrome: CHROME_ES,
  langToggle: { label: 'ES', other: 'EN' },
  tutorials: TUTORIALS_ES,
  metaTitle: 'Evo · Centro de tutoriales',
  metaDesc: 'Todas las guías de EVO, paso a paso: clanes, widgets, publicaciones, fotos y competición.',
};

// ──────────────────────────────────────────────────────────────────
// ENGLISH
// ──────────────────────────────────────────────────────────────────
const CHROME_EN: TutChrome = {
  tutEyebrow: 'EVO · TUTORIAL',
  compEyebrow: 'EVO · COMPETITION',
  widgetEyebrow: 'EVO · HOW TO ADD WIDGETS',
  swipe: 'Swipe',
  continue: 'Continue',
  outro: 'evo.app · @evo',
  buttonHint: 'Tap this button in the sidebar',
  seasonLabel: 'Season ends',
  vs: 'vs',
};

const TUTORIALS_EN: Tutorial[] = [
  {
    id: 'clan',
    cat: 'Identity',
    title: 'How to unlock your philosophical clan',
    accent: 'clan',
    desc: 'Send your first phrases and reflections so EVO can read you and reveal which clan you belong to.',
    tags: ['clan', 'phrases', 'reflections', 'get started', 'philosophical profile'],
    search: 'clan philosophical unlock phrases reflections long private notebook start identity send app honest',
    slides: [
      { type: 'tutorial', kind: 'cover', step: 1, count: 4,
        coverKicker: 'A mini-tutorial',
        coverTitleLines: ['How to unlock', 'your philosophical clan.'],
        coverAccentWord: 'clan' },
      { type: 'tutorial', kind: 'step', step: 2, count: 4, stepNum: '01',
        stepKicker: 'Step 01 · Phrases',
        stepHeadline: 'Send seven or eight phrases.',
        stepDesc: 'From the app. You don’t have to publish them — they can stay private in your notebook.',
        stepButtonSrc: 'btn-nueva-frase.png' },
      { type: 'tutorial', kind: 'step', step: 3, count: 4, stepNum: '02',
        stepKicker: 'Step 02 · Reflections',
        stepHeadline: 'Send at least four long reflections.',
        stepDesc: 'Take your time. The deeper and more honest they are, the better your clan reads you.',
        stepButtonSrc: 'btn-nueva-reflexion.png' },
      { type: 'tutorial', kind: 'result', step: 4, count: 4,
        resultEyebrow: 'Done',
        resultTitleLines: ['Your philosophical clan', 'is now unlocked.'],
        resultAccentWord: 'unlocked',
        resultDesc: 'And it can keep changing as you evolve.' },
    ],
  },
  {
    id: 'borrar',
    cat: 'Posts',
    title: 'How to delete a post',
    accent: 'delete',
    desc: 'Delete or hide any phrase or reflection you no longer want on your profile, in three steps.',
    tags: ['delete', 'remove', 'hide', 'post', 'profile'],
    search: 'delete remove hide post profile user three dots options menu feed phrase reflection',
    slides: [
      { type: 'tutorial', kind: 'cover', step: 1, count: 5,
        coverVisual: 'image', coverImageSrc: 'btn-eliminar-post.png',
        coverKicker: 'A mini-tutorial',
        coverTitleLines: ['How to delete', 'a post.'],
        coverAccentWord: 'delete' },
      { type: 'tutorial', kind: 'step', step: 2, count: 5, stepNum: '01',
        stepKicker: 'Step 01 · Profile',
        stepHeadline: 'Go to your user profile.',
        stepDesc: 'Open the app and head to your profile to see your posts.',
        stepShotSrc: 'shot-perfil.png' },
      { type: 'tutorial', kind: 'step', step: 3, count: 5, stepNum: '02',
        stepKicker: 'Step 02 · Options',
        stepHeadline: 'Tap the three dots on the post.',
        stepDesc: 'They appear at the top right of each post and open the menu.',
        stepShotSrc: 'shot-tres-puntos.png' },
      { type: 'tutorial', kind: 'step', step: 4, count: 5, stepNum: '03',
        stepKicker: 'Step 03 · Delete',
        stepHeadline: 'Tap Delete or Hide.',
        stepDesc: 'Whichever you prefer: delete removes it completely, hide just takes it off your profile.',
        stepShotSrc: 'shot-eliminar.png' },
      { type: 'tutorial', kind: 'result', step: 5, count: 5,
        resultEyebrow: 'Done',
        resultTitleLines: ['Your post', 'is deleted completely.'],
        resultAccentWord: 'completely',
        resultDesc: 'It disappears from your profile and the feed instantly.' },
    ],
  },
  {
    id: 'widgets',
    cat: 'Home screen',
    title: 'How to add the EVO widgets',
    accent: 'widgets',
    desc: 'Place EVO on your home or lock screen to keep your phrase of the day always in sight.',
    tags: ['widget', 'widgets', 'home screen', 'lock screen', 'iphone', 'android'],
    search: 'widget widgets home screen lock screen iphone android long press empty area edit search evo size small large add',
    slides: [
      { type: 'widget', kind: 'cover', step: 1, count: 5, shot: 'card',
        img: 'shot-home-widget.jpg', ratio: 1290 / 1831,
        kicker: 'Before you start',
        title: 'How do you add the EVO widgets?', accent: 'EVO widgets',
        note: 'The instructions are also inside your profile.' },
      { type: 'widget', kind: 'step', step: 2, count: 5, shot: 'phone',
        img: 'shot-editmode.jpg',
        kicker: 'Step 01 · Home screen',
        title: 'Press and hold an empty area', accent: 'empty area',
        desc: 'Your phone’s edit menu opens.' },
      { type: 'widget', kind: 'step', step: 3, count: 5, shot: 'phone',
        img: 'shot-widgetmenu.png',
        kicker: 'Step 02 · Search',
        title: 'Search for EVO', accent: 'EVO',
        desc: 'Find the app inside the widget menu.' },
      { type: 'widget', kind: 'step', step: 4, count: 5, shot: 'card',
        img: 'shot-sizes.jpg', ratio: 1290 / 1589,
        kicker: 'Step 03 · Size',
        title: 'Choose the size', accent: 'size',
        desc: 'You can use the small widget or the large one.' },
      { type: 'widget', kind: 'final', step: 5, count: 5, shot: 'phone',
        img: 'shot-lockscreen.png',
        kicker: 'iPhone users',
        title: 'You can also add EVO to your lock screen.', accent: 'lock screen',
        desc: 'Follow the exact same steps, but from the lock screen.' },
    ],
  },
  {
    id: 'competicion',
    cat: 'Clans',
    title: 'How the clan competition works',
    accent: 'competition',
    desc: 'What scores is the average per person, not the total. Here’s how your clan wins each season.',
    tags: ['competition', 'clans', 'average', 'season', 'ranking', 'prize'],
    search: 'competition clans average per person score participation season month duration prize reward ranking members active dormant june close',
    slides: [
      { type: 'comp', kind: 'cover', step: 1, count: 6,
        coverKicker: 'Quick guide',
        coverTitleLines: ['How does', 'the clan', 'competition work?'],
        coverAccentWord: 'competition' },
      { type: 'comp', kind: 'step', step: 2, count: 6, visual: 'widget',
        stepKicker: 'Step 01 · Scoring',
        widgetSrc: 'widget-ranking-clan.jpg',
        stepHeadline: 'Each clan competes with its average.',
        stepDesc: 'The total of phrases and reflections isn’t added up: it’s divided among its members. What scores is the average per person, not the absolute number.' },
      { type: 'comp', kind: 'step', step: 3, count: 6, visual: 'number', stepNum: '02',
        stepKicker: 'Step 02 · Participation',
        stepHeadline: 'Joining mid-month? You count too.',
        stepDesc: 'Users who join a clan after the competition starts take part just the same, from their very first day.' },
      { type: 'comp', kind: 'step', step: 4, count: 6, visual: 'season',
        stepKicker: 'Step 03 · Duration',
        season: { day: '30', month: 'June', time: '23:59 · close' },
        stepHeadline: 'Each season lasts one month.',
        stepDesc: 'This edition closes on June 30 at 23:59. Then a brand-new season starts, from scratch.' },
      { type: 'comp', kind: 'step', step: 5, count: 6, visual: 'reward',
        stepKicker: 'Step 04 · Prize',
        stepHeadline: 'The winning clan can earn rewards.',
        stepDesc: 'The more your clan takes part throughout the month, the closer you’ll be to first place.' },
      { type: 'comp', kind: 'note', step: 6, count: 6,
        noteKicker: 'Important note',
        dots: { lowTitle: 'Large clan', lowOn: 3, lowTotal: 12, lowAvg: 'low average', highTitle: 'Active clan', highOn: 5, highTotal: 5, highAvg: 'high average' },
        noteHeadline: 'Having many members is not an advantage.',
        noteDesc: 'If a clan is huge but most members don’t take part, its average drops and it loses out. A small, active clan beats a large, sleepy one.' },
    ],
  },
  {
    id: 'foto',
    cat: 'Posts',
    title: 'How to add a photo to your post',
    accent: 'photo',
    desc: 'Pair your phrases and reflections with an image from your gallery and, if you like, music. Available with the latest update.',
    tags: ['photo', 'image', 'post', 'music', 'update'],
    search: 'photo image gallery post phrase reflection update app store play store new publish add photo adjust crop for you following music audio song no audio publish arrow latest update',
    slides: [
      { type: 'tutorial', kind: 'cover', step: 1, count: 9,
        coverVisual: 'image', coverImageSrc: 'post-img-tutorial/cover-post.jpg',
        coverKicker: 'A mini-tutorial',
        coverTitleLines: ['How to add a photo', 'to your post.'],
        coverAccentWord: 'photo' },
      { type: 'tutorial', kind: 'step', step: 2, count: 9, stepNum: '00',
        stepKicker: 'Step 00 · Update',
        stepHeadline: 'Update the app on the App Store or Play Store.',
        stepDesc: 'The photo feature is only in the latest version — make sure you’re up to date.',
        stepLogos: ['post-img-tutorial/logo-appstore.png', 'post-img-tutorial/logo-playstore.png'] },
      { type: 'tutorial', kind: 'step', step: 3, count: 9, stepNum: '01',
        stepKicker: 'Step 01 · Create',
        stepHeadline: 'Create a new reflection or phrase.',
        stepDesc: 'From the menu, open New reflection or New phrase.',
        stepShotSrc: 'post-img-tutorial/real-01.png' },
      { type: 'tutorial', kind: 'step', step: 4, count: 9, stepNum: '02',
        stepKicker: 'Step 02 · Publish',
        stepHeadline: 'Tap the publish button.',
        stepDesc: 'Inside the reflection or phrase, tap publish to open the options.',
        stepShotSrc: 'post-img-tutorial/real-02.png' },
      { type: 'tutorial', kind: 'step', step: 5, count: 9, stepNum: '03',
        stepKicker: 'Step 03 · Photo',
        stepHeadline: 'Tap Add photo.',
        stepDesc: 'The new Add photo option appears on your post.',
        stepShotSrc: 'post-img-tutorial/real-03.png' },
      { type: 'tutorial', kind: 'step', step: 6, count: 9, stepNum: '04',
        stepKicker: 'Step 04 · Gallery',
        stepHeadline: 'Choose a photo from your gallery.',
        stepDesc: 'Select the image you want to attach from your camera roll.',
        stepShotSrc: 'post-img-tutorial/real-04.png' },
      { type: 'tutorial', kind: 'step', step: 7, count: 9, stepNum: '05',
        stepKicker: 'Step 05 · Adjust',
        stepHeadline: 'Adjust how it will look.',
        stepDesc: 'Crop it for For you and Following — they are two different views.',
        stepShotSrc: 'post-img-tutorial/real-05.png' },
      { type: 'tutorial', kind: 'step', step: 8, count: 9, stepNum: '06',
        stepKicker: 'Step 06 · Music',
        stepHeadline: 'Choose music and publish.',
        stepDesc: 'Add a song (or none) and tap the arrow to publish.',
        stepShotSrc: 'post-img-tutorial/real-06.png' },
      { type: 'tutorial', kind: 'result', step: 9, count: 9,
        resultEyebrow: 'Done',
        resultTitleLines: ['Your post goes live', 'with photo and music.'],
        resultAccentWord: 'with photo',
        resultDesc: 'It appears in the feed exactly as you cropped it, in For you and Following.' },
    ],
  },
];

const DICT_EN: TutDict = {
  nav: { active: 'Info / Help', download: 'Download', back: 'Back to the site' },
  hero: { eyebrow: 'Evo · Guides', title: 'What do you need help with?', titleAccent: 'help',
    sub: 'Every guide, step by step. Search your question or swipe through the tutorials.' },
  search: { placeholder: 'Search: clan, widget, delete, photo, competition…', clear: 'Clear search', ariaSearch: 'Search tutorials' },
  chips: ['clan', 'widgets', 'delete', 'photo', 'competition', 'reflections'],
  meta: { one: 'tutorial', many: 'tutorials', forWord: 'for' },
  empty: {
    title: (q) => `No results for “${q}”.`,
    sub: 'Try another word: clan, widget, delete, photo or competition.',
    reset: 'See all tutorials',
  },
  footer: { left: '© MMXXVI Evo · Help center', right: 'evo.app · @evo' },
  chrome: CHROME_EN,
  langToggle: { label: 'EN', other: 'ES' },
  tutorials: TUTORIALS_EN,
  metaTitle: 'Evo · Tutorials center',
  metaDesc: 'Every EVO guide, step by step: clans, widgets, posts, photos and competition.',
};

export function getTutDict(lang: Lang): TutDict {
  return lang === 'es' ? DICT_ES : DICT_EN;
}
