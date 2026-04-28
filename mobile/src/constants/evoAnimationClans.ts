import type { FC } from 'react';

import { getClanColor, getClanSecondaryColor } from './clanColors';
import {
  getSidebarEstrellaByHouse,
  type SidebarEstrellaSvgProps,
} from '../utils/getSidebarEstrellaByHouse';
import {
  getTopBarFueguitoByHouse,
  type TopBarFueguitoSvgProps,
} from '../utils/getTopBarFueguitoByHouse';

export type AnimClanId =
  | 'none'
  | 'nihilista'
  | 'cientista'
  | 'estoico'
  | 'existencialista'
  | 'trascendentalista'
  | 'humanista'
  | 'realista'
  | 'racionalista';

export interface AnimClanData {
  id: AnimClanId;
  label: string;
  primary: string;
  secondary: string;
  idleDurationMs: number;
  streakMsg: string;
  /** SVG component de estrellasPrincipales (17–25) — renderizar como <StarComponent /> */
  StarComponent: FC<SidebarEstrellaSvgProps>;
  /** SVG component del fueguito topbar */
  FireComponent: FC<TopBarFueguitoSvgProps>;
  animalAsset: null;
}

const NO_CLAN_PRIMARY = '#c7ff02';
const NO_CLAN_SECONDARY = '#7000ff';

export const ANIM_CLANS: Record<AnimClanId, AnimClanData> = {
  none: {
    id: 'none',
    label: 'Sin clan',
    primary: NO_CLAN_PRIMARY,
    secondary: NO_CLAN_SECONDARY,
    idleDurationMs: 3000,
    streakMsg: 'Sigue reflexionando cada día.',
    StarComponent: getSidebarEstrellaByHouse(null),
    FireComponent: getTopBarFueguitoByHouse(null),
    animalAsset: null,
  },
  nihilista: {
    id: 'nihilista',
    label: 'Nihilista',
    primary: getClanColor('nihilista'),
    secondary: getClanSecondaryColor('nihilista'),
    idleDurationMs: 2800,
    streakMsg: 'El vacío no te ha detenido.',
    StarComponent: getSidebarEstrellaByHouse('nihilista'),
    FireComponent: getTopBarFueguitoByHouse('nihilista'),
    animalAsset: null,
  },
  cientista: {
    id: 'cientista',
    label: 'Cientista',
    primary: getClanColor('cientista'),
    secondary: getClanSecondaryColor('cientista'),
    idleDurationMs: 3200,
    streakMsg: 'Un día más de evidencia acumulada.',
    StarComponent: getSidebarEstrellaByHouse('cientista'),
    FireComponent: getTopBarFueguitoByHouse('cientista'),
    animalAsset: null,
  },
  estoico: {
    id: 'estoico',
    label: 'Estoico',
    primary: getClanColor('estoico'),
    secondary: getClanSecondaryColor('estoico'),
    idleDurationMs: 3600,
    streakMsg: 'La constancia es la única virtud real.',
    StarComponent: getSidebarEstrellaByHouse('estoico'),
    FireComponent: getTopBarFueguitoByHouse('estoico'),
    animalAsset: null,
  },
  existencialista: {
    id: 'existencialista',
    label: 'Existencialista',
    primary: getClanColor('existencialista'),
    secondary: getClanSecondaryColor('existencialista'),
    idleDurationMs: 1600,
    streakMsg: 'Otro día eligiéndote a ti mismo.',
    StarComponent: getSidebarEstrellaByHouse('existencialista'),
    FireComponent: getTopBarFueguitoByHouse('existencialista'),
    animalAsset: null,
  },
  trascendentalista: {
    id: 'trascendentalista',
    label: 'Trascendentalista',
    primary: getClanColor('trascendentalista'),
    secondary: getClanSecondaryColor('trascendentalista'),
    idleDurationMs: 4000,
    streakMsg: 'Tu camino interior continúa.',
    StarComponent: getSidebarEstrellaByHouse('trascendentalista'),
    FireComponent: getTopBarFueguitoByHouse('trascendentalista'),
    animalAsset: null,
  },
  humanista: {
    id: 'humanista',
    label: 'Humanista',
    primary: getClanColor('humanista'),
    secondary: getClanSecondaryColor('humanista'),
    idleDurationMs: 2400,
    streakMsg: 'Cada día más conectado.',
    StarComponent: getSidebarEstrellaByHouse('humanista'),
    FireComponent: getTopBarFueguitoByHouse('humanista'),
    animalAsset: null,
  },
  realista: {
    id: 'realista',
    label: 'Realista',
    primary: getClanColor('realista'),
    secondary: getClanSecondaryColor('realista'),
    idleDurationMs: 2200,
    streakMsg: 'Un día más con los pies en la tierra.',
    StarComponent: getSidebarEstrellaByHouse('realista'),
    FireComponent: getTopBarFueguitoByHouse('realista'),
    animalAsset: null,
  },
  racionalista: {
    id: 'racionalista',
    label: 'Racionalista',
    primary: getClanColor('racionalista'),
    secondary: getClanSecondaryColor('racionalista'),
    idleDurationMs: 3400,
    streakMsg: 'La razón no toma días libres.',
    StarComponent: getSidebarEstrellaByHouse('racionalista'),
    FireComponent: getTopBarFueguitoByHouse('racionalista'),
    animalAsset: null,
  },
};

export const ANIM_CLAN_IDS = (
  Object.keys(ANIM_CLANS) as AnimClanId[]
).filter((k) => k !== 'none') as Exclude<AnimClanId, 'none'>[];

/** 8-point circle positions, radius 110, starting at 12 o'clock */
export const CIRCLE_POSITIONS = ANIM_CLAN_IDS.map((_, i) => {
  const angle = (i / 8) * 2 * Math.PI - Math.PI / 2;
  return { x: Math.cos(angle) * 110, y: Math.sin(angle) * 110 };
});

/** Shared UI color tokens for animation screens */
export const ANIM_COLORS = {
  bg: '#0f0f12' as const,
  surface: '#1a1a1f' as const,
  border: '#2a2a2f' as const,
  borderActive: '#c7ff02' as const,
  lime: '#c7ff02' as const,
  purple: '#7000ff' as const,
  text: '#ffffff' as const,
  muted: '#949ba6' as const,
};
