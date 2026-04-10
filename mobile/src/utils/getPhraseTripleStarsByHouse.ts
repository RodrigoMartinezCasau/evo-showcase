import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { ClanId } from '@evoconn/constants/clanColors';

import Svg251 from '../assets/phraseTripleStars/251.svg';
import Svg252 from '../assets/phraseTripleStars/252.svg';
import Svg253 from '../assets/phraseTripleStars/253.svg';
import Svg254 from '../assets/phraseTripleStars/254.svg';
import Svg255 from '../assets/phraseTripleStars/255.svg';
import Svg256 from '../assets/phraseTripleStars/256.svg';
import Svg257 from '../assets/phraseTripleStars/257.svg';
import Svg258 from '../assets/phraseTripleStars/258.svg';
import Svg259 from '../assets/phraseTripleStars/259.svg';

/**
 * Assets `triple estrellas2/` — misma asignación de clan que `getReflectionTripleStarsByHouse`
 * (orden `BG_BY_CLAN` en `getReflectionBackgroundByHouse.ts`).
 * 251.svg = morado + lavanda (Evocon / sin clan).
 */
const PHRASE_TRIPLE_BY_CLAN: Record<ClanId, FC<SvgProps>> = {
  racionalista: Svg252,
  realista: Svg253,
  humanista: Svg254,
  existencialista: Svg255,
  trascendentalista: Svg256,
  cientista: Svg257,
  nihilista: Svg258,
  estoico: Svg259,
};

export const PHRASE_TRIPLE_STARS_DEFAULT: FC<SvgProps> = Svg251;

export function getPhraseTripleStarsByHouse(house?: string | null): FC<SvgProps> {
  if (house == null || String(house).trim() === '') {
    return PHRASE_TRIPLE_STARS_DEFAULT;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (PHRASE_TRIPLE_BY_CLAN as Record<string, FC<SvgProps> | undefined>)[key] ??
    PHRASE_TRIPLE_STARS_DEFAULT
  );
}
