import type { ImageSourcePropType } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';
import { SIDEBAR_NEW_PHRASE_LAYOUT as SP } from '@evoconn/constants/sidebarNewPhraseLayout';

export type NewPhrasePlusBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const PLUS_BY_CLAN: Record<ClanId, ImageSourcePropType> = {
  nihilista: require('../assets/sidebar/newPhrasePlus/plus_nihilista.png'),
  cientista: require('../assets/sidebar/newPhrasePlus/plus_cientista.png'),
  estoico: require('../assets/sidebar/newPhrasePlus/plus_estoico.png'),
  existencialista: require('../assets/sidebar/newPhrasePlus/plus_existencialista.png'),
  trascendentalista: require('../assets/sidebar/newPhrasePlus/plus_trascendentalista.png'),
  humanista: require('../assets/sidebar/newPhrasePlus/plus_humanista.png'),
  realista: require('../assets/sidebar/newPhrasePlus/plus_realista.png'),
  racionalista: require('../assets/sidebar/newPhrasePlus/plus_racionalista.png'),
};

export const SIDEBAR_DEFAULT_NEW_PHRASE_PLUS: ImageSourcePropType = require('../assets/sidebar/newPhrasePlus/plus_default.png');

export function getNewPhrasePlusIconByHouse(house?: string | null): ImageSourcePropType {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_NEW_PHRASE_PLUS;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (PLUS_BY_CLAN as Record<string, ImageSourcePropType | undefined>)[key] ?? SIDEBAR_DEFAULT_NEW_PHRASE_PLUS;
}

/** Rect del "+" (único; el asset cambia por clan). */
export function getNewPhrasePlusLayoutByHouse(_house?: string | null): NewPhrasePlusBox {
  return {
    x: SP.SIDEBAR_NEW_PHRASE_PLUS_OFFSET_X,
    y: SP.SIDEBAR_NEW_PHRASE_PLUS_OFFSET_Y,
    width: SP.SIDEBAR_NEW_PHRASE_PLUS_WIDTH,
    height: SP.SIDEBAR_NEW_PHRASE_PLUS_HEIGHT,
  };
}
