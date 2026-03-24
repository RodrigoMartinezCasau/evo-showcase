import type { ImageSourcePropType } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

const STAR_BY_CLAN: Record<ClanId, ImageSourcePropType> = {
  nihilista: require('../assets/sidebar/stars/star_nihilista.png'),
  cientista: require('../assets/sidebar/stars/star_cientista.png'),
  estoico: require('../assets/sidebar/stars/star_estoico.png'),
  existencialista: require('../assets/sidebar/stars/star_existencialista.png'),
  trascendentalista: require('../assets/sidebar/stars/star_trascendentalista.png'),
  humanista: require('../assets/sidebar/stars/star_humanista.png'),
  realista: require('../assets/sidebar/stars/star_realista.png'),
  racionalista: require('../assets/sidebar/stars/star_racionalista.png'),
};

export const SIDEBAR_DEFAULT_STAR: ImageSourcePropType = require('../assets/sidebar/stars/star_default.png');

/** Maps clan / house id (same as `User.clanId`) to the sidebar star asset. */
export function getStarByHouse(house: string): ImageSourcePropType {
  const key = house.trim().toLowerCase() as ClanId;
  return (STAR_BY_CLAN as Record<string, ImageSourcePropType | undefined>)[key] ?? SIDEBAR_DEFAULT_STAR;
}
