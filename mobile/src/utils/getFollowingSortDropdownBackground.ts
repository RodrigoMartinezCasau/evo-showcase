import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import type { ClanId } from '@evoconn/constants/clanColors';
import type { FollowingSortOption } from '@evoconn/constants/followingFeedSort';

import P297 from '../assets/followingSortDropdown/principal/297.svg';
import P298 from '../assets/followingSortDropdown/principal/298.svg';
import P299 from '../assets/followingSortDropdown/principal/299.svg';
import P300 from '../assets/followingSortDropdown/principal/300.svg';
import P301 from '../assets/followingSortDropdown/principal/301.svg';
import P302 from '../assets/followingSortDropdown/principal/302.svg';
import P303 from '../assets/followingSortDropdown/principal/303.svg';
import P304 from '../assets/followingSortDropdown/principal/304.svg';
import P305 from '../assets/followingSortDropdown/principal/305.svg';

import S307 from '../assets/followingSortDropdown/secundario/307.svg';
import S308 from '../assets/followingSortDropdown/secundario/308.svg';
import S309 from '../assets/followingSortDropdown/secundario/309.svg';
import S310 from '../assets/followingSortDropdown/secundario/310.svg';
import S311 from '../assets/followingSortDropdown/secundario/311.svg';
import S312 from '../assets/followingSortDropdown/secundario/312.svg';
import S313 from '../assets/followingSortDropdown/secundario/313.svg';
import S314 from '../assets/followingSortDropdown/secundario/314.svg';
import S315 from '../assets/followingSortDropdown/secundario/315.svg';

import T317 from '../assets/followingSortDropdown/terciario/317.svg';
import T318 from '../assets/followingSortDropdown/terciario/318.svg';
import T319 from '../assets/followingSortDropdown/terciario/319.svg';
import T320 from '../assets/followingSortDropdown/terciario/320.svg';
import T321 from '../assets/followingSortDropdown/terciario/321.svg';
import T322 from '../assets/followingSortDropdown/terciario/322.svg';
import T323 from '../assets/followingSortDropdown/terciario/323.svg';
import T324 from '../assets/followingSortDropdown/terciario/324.svg';
import T325 from '../assets/followingSortDropdown/terciario/325.svg';

export type FollowingSortDropdownSvgProps = SvgProps;

type ClanKey = 'none' | ClanId;

const PRINCIPAL: Record<ClanKey, FC<FollowingSortDropdownSvgProps>> = {
  none: P297,
  cientista: P298,
  trascendentalista: P299,
  estoico: P300,
  nihilista: P301,
  existencialista: P302,
  racionalista: P303,
  humanista: P304,
  realista: P305,
};

const SECUNDARIO: Record<ClanKey, FC<FollowingSortDropdownSvgProps>> = {
  none: S307,
  cientista: S308,
  trascendentalista: S309,
  estoico: S310,
  nihilista: S311,
  existencialista: S312,
  humanista: S313,
  realista: S314,
  racionalista: S315,
};

const TERCIARIO: Record<ClanKey, FC<FollowingSortDropdownSvgProps>> = {
  none: T317,
  cientista: T318,
  trascendentalista: T319,
  estoico: T320,
  nihilista: T321,
  existencialista: T322,
  humanista: T323,
  realista: T324,
  racionalista: T325,
};

/** Alias inglés → id interno (p. ej. clasificador). */
const CLAN_ALIASES: Record<string, ClanKey> = {
  stoic: 'estoico',
  nihilist: 'nihilista',
  scientist: 'cientista',
  transcendentalist: 'trascendentalista',
  existentialist: 'existencialista',
  humanist: 'humanista',
  realist: 'realista',
  rationalist: 'racionalista',
};

function normalizeClanKey(clanId: string | null | undefined): ClanKey {
  if (clanId == null || String(clanId).trim() === '') return 'none';
  let k = String(clanId).trim().toLowerCase();
  if (CLAN_ALIASES[k]) k = CLAN_ALIASES[k];
  if (Object.prototype.hasOwnProperty.call(PRINCIPAL, k)) return k as ClanKey;
  return 'none';
}

/**
 * SVG de fila del menú Siguiendo (fondo #0b0b0f + borde color clan).
 * - `recientes` → principal (abajo en el menú)
 * - `votadas_24h` → secundario (centro)
 * - `votadas_mes` → terciario (arriba)
 */
export function getFollowingSortDropdownBackgroundSvg(
  clanId: string | null | undefined,
  sort: FollowingSortOption,
): FC<FollowingSortDropdownSvgProps> {
  const key = normalizeClanKey(clanId);
  if (sort === 'recientes') return PRINCIPAL[key];
  if (sort === 'votadas_24h') return SECUNDARIO[key];
  return TERCIARIO[key];
}

/** Fila del menú + de la barra inferior (mismos assets que principal / secundario del sort Siguiendo). */
export type BottomBarCreateMenuRow = 'reflection' | 'phrase';

export function getBottomBarCreateMenuBackgroundSvg(
  clanId: string | null | undefined,
  row: BottomBarCreateMenuRow,
): FC<FollowingSortDropdownSvgProps> {
  const key = normalizeClanKey(clanId);
  return row === 'reflection' ? PRINCIPAL[key] : SECUNDARIO[key];
}
