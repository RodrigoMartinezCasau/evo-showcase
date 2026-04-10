import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { ClanId } from '@evoconn/constants/clanColors';

import Svg243 from '../assets/reflectionTripleStars/243.svg';
import Svg244 from '../assets/reflectionTripleStars/244.svg';
import Svg245 from '../assets/reflectionTripleStars/245.svg';
import Svg246 from '../assets/reflectionTripleStars/246.svg';
import Svg247 from '../assets/reflectionTripleStars/247.svg';
import Svg248 from '../assets/reflectionTripleStars/248.svg';
import Svg249 from '../assets/reflectionTripleStars/249.svg';
import Svg250 from '../assets/reflectionTripleStars/250.svg';
import Svg251 from '../assets/reflectionTripleStars/251.svg';

/**
 * Mismo orden que `BG_BY_CLAN` en `getReflectionBackgroundByHouse.ts`.
 * 243.svg = morado + lima (Evocon / sin clan); 244–251 por clan según colores del asset.
 */
const TRIPLE_BY_CLAN: Record<ClanId, FC<SvgProps>> = {
  racionalista: Svg244,
  realista: Svg245,
  humanista: Svg246,
  existencialista: Svg247,
  trascendentalista: Svg248,
  cientista: Svg249,
  nihilista: Svg250,
  estoico: Svg251,
};

export const REFLECTION_TRIPLE_STARS_DEFAULT: FC<SvgProps> = Svg243;

export function getReflectionTripleStarsByHouse(
  house?: string | null,
): FC<SvgProps> {
  if (house == null || String(house).trim() === '') {
    return REFLECTION_TRIPLE_STARS_DEFAULT;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (TRIPLE_BY_CLAN as Record<string, FC<SvgProps> | undefined>)[key] ??
    REFLECTION_TRIPLE_STARS_DEFAULT
  );
}
