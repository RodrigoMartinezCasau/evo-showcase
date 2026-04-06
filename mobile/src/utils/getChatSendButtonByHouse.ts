import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { ClanId } from '@evoconn/constants/clanColors';

import Svg1 from '../assets/chat/sendButton/1.svg';
import Svg2 from '../assets/chat/sendButton/2.svg';
import Svg3 from '../assets/chat/sendButton/3.svg';
import Svg4 from '../assets/chat/sendButton/4.svg';
import Svg5 from '../assets/chat/sendButton/5.svg';
import Svg6 from '../assets/chat/sendButton/6.svg';
import Svg7 from '../assets/chat/sendButton/7.svg';
import Svg8 from '../assets/chat/sendButton/8.svg';
import Svg9 from '../assets/chat/sendButton/9.svg';

/**
 * Mapping: clan → send-button SVG.
 *
 * 1 = noClan (Evoconn green), 2 = estoico, 3 = nihilista, 4 = cientista,
 * 5 = trascendentalista, 6 = existencialista, 7 = humanista,
 * 8 = realista, 9 = racionalista.
 */
const SEND_BUTTON_BY_CLAN: Record<ClanId, FC<SvgProps>> = {
  estoico: Svg2,
  nihilista: Svg3,
  cientista: Svg4,
  trascendentalista: Svg5,
  existencialista: Svg6,
  humanista: Svg7,
  realista: Svg8,
  racionalista: Svg9,
};

/** Default (no clan) send button. */
export const CHAT_SEND_BUTTON_DEFAULT: FC<SvgProps> = Svg1;

export function getChatSendButtonByHouse(house?: string | null): FC<SvgProps> {
  if (house == null || String(house).trim() === '') {
    return CHAT_SEND_BUTTON_DEFAULT;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (SEND_BUTTON_BY_CLAN as Record<string, FC<SvgProps> | undefined>)[key] ??
    CHAT_SEND_BUTTON_DEFAULT
  );
}
