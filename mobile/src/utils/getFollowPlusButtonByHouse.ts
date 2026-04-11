import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { ClanId } from '@evoconn/constants/clanColors';

import Svg1 from '../assets/followPlus/1.svg';
import Svg2 from '../assets/followPlus/2.svg';
import Svg3 from '../assets/followPlus/3.svg';
import Svg4 from '../assets/followPlus/4.svg';
import Svg5 from '../assets/followPlus/5.svg';
import Svg6 from '../assets/followPlus/6.svg';
import Svg7 from '../assets/followPlus/7.svg';
import Svg8 from '../assets/followPlus/8.svg';
import Svg9 from '../assets/followPlus/9.svg';

/**
 * Mismo orden que `getChatSendButtonByHouse` / botones de chat:
 * 1 = sin clan (Evoconn), 2 = estoico, 3 = nihilista, 4 = cientista,
 * 5 = trascendentalista, 6 = existencialista, 7 = humanista,
 * 8 = realista, 9 = racionalista.
 *
 * SVGs copiados desde la carpeta del proyecto «Boton de seguir» (87.svg → 1 … 95.svg → 9).
 */
const FOLLOW_PLUS_BY_CLAN: Record<ClanId, FC<SvgProps>> = {
  estoico: Svg2,
  nihilista: Svg3,
  cientista: Svg4,
  trascendentalista: Svg5,
  existencialista: Svg6,
  humanista: Svg7,
  realista: Svg8,
  racionalista: Svg9,
};

export const FOLLOW_PLUS_BUTTON_DEFAULT: FC<SvgProps> = Svg1;

export function getFollowPlusButtonByHouse(house?: string | null): FC<SvgProps> {
  if (house == null || String(house).trim() === '') {
    return FOLLOW_PLUS_BUTTON_DEFAULT;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (FOLLOW_PLUS_BY_CLAN as Record<string, FC<SvgProps> | undefined>)[key] ??
    FOLLOW_PLUS_BUTTON_DEFAULT
  );
}
