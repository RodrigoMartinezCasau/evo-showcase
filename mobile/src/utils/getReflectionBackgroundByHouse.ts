import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { ClanId } from '@evoconn/constants/clanColors';

import Svg32 from '../assets/reflectionBackground/32.svg';
import Svg33 from '../assets/reflectionBackground/33.svg';
import Svg34 from '../assets/reflectionBackground/34.svg';
import Svg35 from '../assets/reflectionBackground/35.svg';
import Svg36 from '../assets/reflectionBackground/36.svg';
import Svg37 from '../assets/reflectionBackground/37.svg';
import Svg38 from '../assets/reflectionBackground/38.svg';
import Svg39 from '../assets/reflectionBackground/39.svg';

const BG_BY_CLAN: Record<ClanId, FC<SvgProps>> = {
  racionalista: Svg32,
  realista: Svg33,
  humanista: Svg34,
  existencialista: Svg35,
  trascendentalista: Svg36,
  cientista: Svg37,
  nihilista: Svg38,
  estoico: Svg39,
};

/**
 * Default background when no clan is set (nihilista / neutral beige).
 */
export const REFLECTION_BG_DEFAULT: FC<SvgProps> = Svg38;

export function getReflectionBackgroundByHouse(
  house?: string | null,
): FC<SvgProps> {
  if (house == null || String(house).trim() === '') return REFLECTION_BG_DEFAULT;
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (BG_BY_CLAN as Record<string, FC<SvgProps> | undefined>)[key] ??
    REFLECTION_BG_DEFAULT
  );
}
