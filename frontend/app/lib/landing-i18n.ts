// Evo landing — UI dictionary (EN / ES).
// Per-clan copy lives in `./clans.ts`. Section / nav / footer copy lives here.

import type { Lang } from './clans';

export interface LandingDict {
  nav: {
    info: string;
    contact: string;
    downloadIos: string;
    downloadAndroid: string;
  };
  hero: {
    desc: string;
    learn: string;
  };
  join: {
    eyebrow: string;
    title: string;
    lede: string;
    iosStore: string;
    androidStore: string;
    iosSteps: [string, string, string];
    androidSteps: [string, string, string];
    getOn: (platform: string) => string;
  };
  clansIntro: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    lede: string;
    learnMore: string;
  };
  clanDetail: {
    clanLabel: string;
    specs: { animal: string; origin: string; color: string };
    blockThinks: string;
    blockSymbol: string;
    mapHint: string;
    revealMap: (country: string) => string;
  };
  appPreview: {
    eyebrow: string;
    title: string;
    lede: string;
    tiles: Array<{ name: string; desc: string; src: string }>;
  };
  finalCta: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    iosCta: string;
    androidCta: string;
  };
  footer: {
    tag: string;
    connect: string;
    appCol: string;
    legal: string;
    clansLink: string;
    features: string;
    iosLink: string;
    androidLink: string;
    privacy: string;
    terms: string;
    cookies: string;
    contact: string;
    bottomLeft: string;
    bottomRight: string;
  };
  langToggle: {
    label: string;
    other: string;
  };
}

const DICT_EN: LandingDict = {
  nav: {
    info: 'Info',
    contact: 'Contact',
    downloadIos: 'Download iOS',
    downloadAndroid: 'Download Android',
  },
  hero: {
    desc: 'Discover your philosophical clan through reflection, debate, and identity.',
    learn: 'Or learn more',
  },
  join: {
    eyebrow: '01 — Initiation',
    title: 'How to join Evo.',
    lede: 'Three quiet steps. The rest unfolds in time.',
    iosStore: 'App Store',
    androidStore: 'Google Play',
    iosSteps: [
      'Download Evo from the App Store.',
      'Create your profile and choose a name.',
      'Discover your philosophical clan.',
    ],
    androidSteps: [
      'Download Evo from Google Play.',
      'Create your profile and choose a name.',
      'Discover your philosophical clan.',
    ],
    getOn: (p) => `Get on ${p}`,
  },
  clansIntro: {
    eyebrow: '02 — The Clans',
    titleA: 'Eight clans.',
    titleB: 'Eight ways of seeing the world.',
    lede: 'Evo classifies users into philosophical identities based on how they think, reflect, and interact.',
    learnMore: 'Learn more →',
  },
  clanDetail: {
    clanLabel: 'Clan',
    specs: { animal: 'Animal', origin: 'Origin', color: 'Color' },
    blockThinks: 'How this clan thinks',
    blockSymbol: 'Why this symbol',
    mapHint: 'map',
    revealMap: (c) => `Reveal map of ${c}`,
  },
  appPreview: {
    eyebrow: '03 — The App',
    title: 'Built for daily reflection.',
    lede: 'A small surface for a large interior life.',
    tiles: [
      { name: 'Feed', desc: 'A quiet stream of ideas.', src: '/landing/app-feed.png' },
      { name: 'AI reflections', desc: 'Conversations with yourself.', src: '/landing/app-ai-reflections.png' },
      { name: 'Philosophical quotes', desc: 'One thought, daily.', src: '/landing/app-quotes.png' },
      { name: 'Clan identity', desc: 'Who you become.', src: '/landing/app-clan-identity.png' },
      { name: 'Profile', desc: 'Your map of thought.', src: '/landing/app-profile.png' },
      { name: 'Daily streaks', desc: 'The discipline of return.', src: '/landing/app-streaks.png' },
    ],
  },
  finalCta: {
    eyebrow: '04 — Begin',
    titleA: 'Find the philosophy',
    titleB: 'you already live by.',
    iosCta: 'Download on iOS',
    androidCta: 'Download on Android',
  },
  footer: {
    tag: 'Philosophy & Identity',
    connect: 'Connect',
    appCol: 'App',
    legal: 'Legal',
    clansLink: 'Clans',
    features: 'Features',
    iosLink: 'iOS',
    androidLink: 'Android',
    privacy: 'Privacy',
    terms: 'Terms',
    cookies: 'Cookies',
    contact: 'Contact',
    bottomLeft: '© MMXXVI Evo.',
    bottomRight: 'Designed and developed by @evoconn',
  },
  langToggle: { label: 'EN', other: 'ES' },
};

const DICT_ES: LandingDict = {
  nav: {
    info: 'Info',
    contact: 'Contacto',
    downloadIos: 'Descargar iOS',
    downloadAndroid: 'Descargar Android',
  },
  hero: {
    desc: 'Descubre tu clan filosófico a través de la reflexión, el debate y la identidad.',
    learn: 'O descubre más',
  },
  join: {
    eyebrow: '01 — Iniciación',
    title: 'Cómo unirte a Evo.',
    lede: 'Tres pasos tranquilos. El resto se desvela con el tiempo.',
    iosStore: 'App Store',
    androidStore: 'Google Play',
    iosSteps: [
      'Descarga Evo desde la App Store.',
      'Crea tu perfil y elige un nombre.',
      'Descubre tu clan filosófico.',
    ],
    androidSteps: [
      'Descarga Evo desde Google Play.',
      'Crea tu perfil y elige un nombre.',
      'Descubre tu clan filosófico.',
    ],
    getOn: (p) => `Consíguelo en ${p}`,
  },
  clansIntro: {
    eyebrow: '02 — Los Clanes',
    titleA: 'Ocho clanes.',
    titleB: 'Ocho formas de ver el mundo.',
    lede: 'Evo clasifica a los usuarios en identidades filosóficas según cómo piensan, reflexionan e interactúan.',
    learnMore: 'Saber más →',
  },
  clanDetail: {
    clanLabel: 'Clan',
    specs: { animal: 'Animal', origin: 'Origen', color: 'Color' },
    blockThinks: 'Cómo piensa este clan',
    blockSymbol: 'Por qué este símbolo',
    mapHint: 'mapa',
    revealMap: (c) => `Mostrar mapa de ${c}`,
  },
  appPreview: {
    eyebrow: '03 — La App',
    title: 'Hecha para la reflexión diaria.',
    lede: 'Una superficie pequeña para una vida interior amplia.',
    tiles: [
      { name: 'Para ti', desc: 'Un flujo tranquilo de ideas.', src: '/landing/app-feed.png' },
      { name: 'Reflexiones con IA', desc: 'Conversaciones contigo mismo.', src: '/landing/app-ai-reflections.png' },
      { name: 'Frases filosóficas', desc: 'Un pensamiento al día.', src: '/landing/app-quotes.png' },
      { name: 'Identidad de clan', desc: 'En quién te conviertes.', src: '/landing/app-clan-identity.png' },
      { name: 'Perfil', desc: 'Tu mapa de pensamiento.', src: '/landing/app-profile.png' },
      { name: 'Rachas diarias', desc: 'La disciplina de volver.', src: '/landing/app-streaks.png' },
    ],
  },
  finalCta: {
    eyebrow: '04 — Comienza',
    titleA: 'Descubre la filosofía',
    titleB: 'que ya vives.',
    iosCta: 'Descargar en iOS',
    androidCta: 'Descargar en Android',
  },
  footer: {
    tag: 'Filosofía e identidad',
    connect: 'Conecta',
    appCol: 'App',
    legal: 'Legal',
    clansLink: 'Clanes',
    features: 'Funciones',
    iosLink: 'iOS',
    androidLink: 'Android',
    privacy: 'Privacidad',
    terms: 'Términos',
    cookies: 'Cookies',
    contact: 'Contacto',
    bottomLeft: '© MMXXVI Evo.',
    bottomRight: 'Diseñado y desarrollado por @evoconn',
  },
  langToggle: { label: 'ES', other: 'EN' },
};

export function getDict(lang: Lang): LandingDict {
  return lang === 'es' ? DICT_ES : DICT_EN;
}

export const PAGE_METADATA: Record<Lang, { title: string; description: string }> = {
  en: {
    title: 'Evo — Philosophy. Identity. Reflection.',
    description:
      'Discover your philosophical clan through reflection, debate, and identity.',
  },
  es: {
    title: 'Evo — Filosofía. Identidad. Reflexión.',
    description:
      'Descubre tu clan filosófico a través de la reflexión, el debate y la identidad.',
  },
};
