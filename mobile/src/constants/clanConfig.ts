/**
 * clanConfig.ts
 * =============
 * Referentes filosóficos del ClanDisplay + ensamblado final.
 *
 * Frases y descripciones → edítalas en `clanDisplayCopy.ts`.
 */

import { CLAN_DISPLAY_COPY, getClanDisplayCopy } from './clanDisplayCopy';

export type { ClanDisplayCopy } from './clanDisplayCopy';
export { CLAN_DISPLAY_COPY, getClanDisplayCopy } from './clanDisplayCopy';

export type Philosopher = {
  /** Nombre visible bajo el icono */
  name: string;
  /** Iniciales para el placeholder circular (se usa solo si no hay svgKey) */
  initials: string;
  /** Clave para getPhilosopherSvg(). Si está presente se renderiza el SVG en vez del placeholder. */
  svgKey?: string;
  /** URI de imagen opcional. Si null se muestra el placeholder de iniciales */
  imageUri?: string | null;
};

export type ClanConfigEntry = {
  phrase: string;
  phraseAuthor: string;
  descriptionPoints: string[];
  mythology?: import('./clanDisplayCopy').ClanMythologyCopy;
  philosophers: [Philosopher, Philosopher, Philosopher, Philosopher];
};

const CLAN_PHILOSOPHERS: Record<string, [Philosopher, Philosopher, Philosopher, Philosopher]> = {
  nihilista: [
    { name: 'Friedrich Nietzsche', initials: 'N', svgKey: 'nietzsche' },
    { name: 'Martin Heidegger', initials: 'H', svgKey: 'heidegger' },
    { name: 'Arthur Schopenhauer', initials: 'S', svgKey: 'schopenhauer' },
    { name: 'Philipp Mainländer', initials: 'M', svgKey: 'mainlander' },
  ],
  cientista: [
    { name: 'Richard Dawkins', initials: 'D', svgKey: 'dawkins' },
    { name: 'Carl Sagan', initials: 'S', svgKey: 'sagan' },
    { name: 'Stephen Hawking', initials: 'H', svgKey: 'hawking' },
    { name: 'Charles Darwin', initials: 'D', svgKey: 'darwin' },
  ],
  estoico: [
    { name: 'Marco Aurelio', initials: 'MA', svgKey: 'marcoaurelio' },
    { name: 'Lucio Séneca', initials: 'S', svgKey: 'seneca' },
    { name: 'Miyamoto Musashi', initials: 'M', svgKey: 'musashi' },
    { name: 'Epicteto', initials: 'E', svgKey: 'epicteto' },
  ],
  existencialista: [
    { name: 'Jean-Paul Sartre', initials: 'S', svgKey: 'sartre' },
    { name: 'Albert Camus', initials: 'C', svgKey: 'camus' },
    { name: 'Simone de Beauvoir', initials: 'SB', svgKey: 'simone' },
    { name: 'Søren Kierkegaard', initials: 'K', svgKey: 'kierkegaard' },
  ],
  racionalista: [
    { name: 'René Descartes', initials: 'D', svgKey: 'descartes' },
    { name: 'Baruch Spinoza', initials: 'S', svgKey: 'spinoza' },
    { name: 'Gottfried Leibniz', initials: 'L', svgKey: 'nleibniz' },
    { name: 'Immanuel Kant', initials: 'K', svgKey: 'nkant' },
  ],
  humanista: [
    { name: 'Jean-Jacques Rousseau', initials: 'R', svgKey: 'rousseau' },
    { name: 'Erasmo de Rotterdam', initials: 'E', svgKey: 'erasmo' },
    { name: 'Erich Fromm', initials: 'F', svgKey: 'fromm' },
    { name: 'Abraham Maslow', initials: 'M', svgKey: 'maslow' },
  ],
  realista: [
    { name: 'Nicolás Maquiavelo', initials: 'M', svgKey: 'maquiavelo' },
    { name: 'Thomas Hobbes', initials: 'H', svgKey: 'hobbes' },
    { name: 'Alexis de Tocqueville', initials: 'T', svgKey: 'tocqueville' },
    { name: 'Max Weber', initials: 'W', svgKey: 'weber' },
  ],
  trascendentalista: [
    { name: 'Ralph W. Emerson', initials: 'E', svgKey: 'emerson' },
    { name: 'Henry D. Thoreau', initials: 'T', svgKey: 'thoreau' },
    { name: 'Carl Jung', initials: 'J', svgKey: 'jung' },
    { name: 'Plotino', initials: 'P', svgKey: 'fuller' },
  ],
  indefinido: [
    { name: 'Prólogo pendiente', initials: '?' },
    { name: 'Modo multisabor', initials: '…' },
    { name: 'Comité “lo veo y te digo”', initials: 'C' },
    { name: 'Equipo por asignar', initials: 'E' },
  ],
};

function buildClanConfig(): Record<string, ClanConfigEntry> {
  const out: Record<string, ClanConfigEntry> = {};
  for (const [clanId, copy] of Object.entries(CLAN_DISPLAY_COPY)) {
    out[clanId] = {
      ...copy,
      philosophers: CLAN_PHILOSOPHERS[clanId] ?? CLAN_PHILOSOPHERS.indefinido,
    };
  }
  return out;
}

export const CLAN_CONFIG: Record<string, ClanConfigEntry> = buildClanConfig();

const FALLBACK_CONFIG: ClanConfigEntry = CLAN_CONFIG.indefinido;

export function getClanConfig(clanId: string): ClanConfigEntry {
  return CLAN_CONFIG[clanId.toLowerCase().trim()] ?? FALLBACK_CONFIG;
}
