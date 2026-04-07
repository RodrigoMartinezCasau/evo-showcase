import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { ClanId } from '@evoconn/constants/clanColors';

// ── Posture stars ("estrellas principales") ──
import PS1 from '../assets/debate/postureStar/1.svg';
import PS2 from '../assets/debate/postureStar/2.svg';
import PS3 from '../assets/debate/postureStar/3.svg';
import PS4 from '../assets/debate/postureStar/4.svg';
import PS5 from '../assets/debate/postureStar/5.svg';
import PS6 from '../assets/debate/postureStar/6.svg';
import PS7 from '../assets/debate/postureStar/7.svg';
import PS8 from '../assets/debate/postureStar/8.svg';
import PS9 from '../assets/debate/postureStar/9.svg';

// ── Counterpoint stars ("estrellas secundarias") ──
import CS1 from '../assets/debate/counterpointStar/1.svg';
import CS2 from '../assets/debate/counterpointStar/2.svg';
import CS3 from '../assets/debate/counterpointStar/3.svg';
import CS4 from '../assets/debate/counterpointStar/4.svg';
import CS5 from '../assets/debate/counterpointStar/5.svg';
import CS6 from '../assets/debate/counterpointStar/6.svg';
import CS7 from '../assets/debate/counterpointStar/7.svg';
import CS8 from '../assets/debate/counterpointStar/8.svg';
import CS9 from '../assets/debate/counterpointStar/9.svg';

/**
 * 1 = noClan, 2 = estoico, 3 = nihilista, 4 = cientista,
 * 5 = trascendentalista, 6 = existencialista, 7 = humanista,
 * 8 = realista, 9 = racionalista.
 */
const POSTURE_STAR_BY_CLAN: Record<ClanId, FC<SvgProps>> = {
  estoico: PS2,
  nihilista: PS3,
  cientista: PS4,
  trascendentalista: PS5,
  existencialista: PS6,
  humanista: PS7,
  realista: PS8,
  racionalista: PS9,
};

const COUNTERPOINT_STAR_BY_CLAN: Record<ClanId, FC<SvgProps>> = {
  estoico: CS2,
  nihilista: CS3,
  cientista: CS4,
  trascendentalista: CS5,
  existencialista: CS6,
  humanista: CS7,
  realista: CS8,
  racionalista: CS9,
};

const POSTURE_STAR_DEFAULT: FC<SvgProps> = PS1;
const COUNTERPOINT_STAR_DEFAULT: FC<SvgProps> = CS1;

function resolve(
  map: Record<string, FC<SvgProps> | undefined>,
  fallback: FC<SvgProps>,
  clan?: string | null,
): FC<SvgProps> {
  if (clan == null || String(clan).trim() === '') return fallback;
  return map[clan.trim().toLowerCase()] ?? fallback;
}

export function getPostureStarByClan(clan?: string | null): FC<SvgProps> {
  return resolve(POSTURE_STAR_BY_CLAN, POSTURE_STAR_DEFAULT, clan);
}

export function getCounterpointStarByClan(clan?: string | null): FC<SvgProps> {
  return resolve(COUNTERPOINT_STAR_BY_CLAN, COUNTERPOINT_STAR_DEFAULT, clan);
}
