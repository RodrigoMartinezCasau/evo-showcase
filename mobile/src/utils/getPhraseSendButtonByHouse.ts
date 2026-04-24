import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { ClanId } from '@evoconn/constants/clanColors';

import Svg287 from '../assets/chat/sendButtonPhrase/287.svg';
import Svg288 from '../assets/chat/sendButtonPhrase/288.svg';
import Svg289 from '../assets/chat/sendButtonPhrase/289.svg';
import Svg290 from '../assets/chat/sendButtonPhrase/290.svg';
import Svg291 from '../assets/chat/sendButtonPhrase/291.svg';
import Svg292 from '../assets/chat/sendButtonPhrase/292.svg';
import Svg293 from '../assets/chat/sendButtonPhrase/293.svg';
import Svg294 from '../assets/chat/sendButtonPhrase/294.svg';
import Svg295 from '../assets/chat/sendButtonPhrase/295.svg';

/**
 * Botón enviar de FRASES — color secundario del clan.
 * Mismo orden que getChatSendButtonByHouse:
 * 287 = noClan, 288 = estoico, 289 = nihilista, 290 = cientista,
 * 291 = trascendentalista, 292 = existencialista, 293 = humanista,
 * 294 = realista, 295 = racionalista.
 */
const PHRASE_SEND_BUTTON_BY_CLAN: Record<ClanId, FC<SvgProps>> = {
  estoico:           Svg288,
  nihilista:         Svg289,
  cientista:         Svg290,
  trascendentalista: Svg291,
  existencialista:   Svg292,
  humanista:         Svg293,
  realista:          Svg294,
  racionalista:      Svg295,
};

/** Default (sin clan) → 287.svg */
export const PHRASE_SEND_BUTTON_DEFAULT: FC<SvgProps> = Svg287;

export function getPhraseSendButtonByHouse(house?: string | null): FC<SvgProps> {
  if (house == null || String(house).trim() === '') {
    return PHRASE_SEND_BUTTON_DEFAULT;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (PHRASE_SEND_BUTTON_BY_CLAN as Record<string, FC<SvgProps> | undefined>)[key] ??
    PHRASE_SEND_BUTTON_DEFAULT
  );
}
