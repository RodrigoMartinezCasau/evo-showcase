import type { ImageSourcePropType } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';
import { SIDEBAR_NEW_REFLECTION_LAYOUT as SR } from '@evoconn/constants/sidebarNewReflectionLayout';

export type NewReflectionPlusBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const PLUS_BY_CLAN: Record<ClanId, ImageSourcePropType> = {
  nihilista: require('../assets/sidebar/newReflectionPlus/plus_nihilista.png'),
  cientista: require('../assets/sidebar/newReflectionPlus/plus_cientista.png'),
  estoico: require('../assets/sidebar/newReflectionPlus/plus_estoico.png'),
  existencialista: require('../assets/sidebar/newReflectionPlus/plus_existencialista.png'),
  trascendentalista: require('../assets/sidebar/newReflectionPlus/plus_trascendentalista.png'),
  humanista: require('../assets/sidebar/newReflectionPlus/plus_humanista.png'),
  realista: require('../assets/sidebar/newReflectionPlus/plus_realista.png'),
  racionalista: require('../assets/sidebar/newReflectionPlus/plus_racionalista.png'),
};

export const SIDEBAR_DEFAULT_NEW_REFLECTION_PLUS: ImageSourcePropType = require('../assets/sidebar/newReflectionPlus/plus_default.png');

export function getNewReflectionPlusIconByHouse(house?: string | null): ImageSourcePropType {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_NEW_REFLECTION_PLUS;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (PLUS_BY_CLAN as Record<string, ImageSourcePropType | undefined>)[key] ?? SIDEBAR_DEFAULT_NEW_REFLECTION_PLUS;
}

/** Rect del "+" (único; el asset cambia por clan). */
export function getNewReflectionPlusLayoutByHouse(_house?: string | null): NewReflectionPlusBox {
  return {
    x: SR.SIDEBAR_NEW_REFLECTION_PLUS_OFFSET_X,
    y: SR.SIDEBAR_NEW_REFLECTION_PLUS_OFFSET_Y,
    width: SR.SIDEBAR_NEW_REFLECTION_PLUS_WIDTH,
    height: SR.SIDEBAR_NEW_REFLECTION_PLUS_HEIGHT,
  };
}
