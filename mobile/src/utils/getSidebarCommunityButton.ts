import type { ImageSourcePropType } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

const COMMUNITY_BY_CLAN: Record<ClanId, ImageSourcePropType> = {
  nihilista: require('../assets/sidebar/community/community_nihilista.png'),
  cientista: require('../assets/sidebar/community/community_cientista.png'),
  estoico: require('../assets/sidebar/community/community_estoico.png'),
  existencialista: require('../assets/sidebar/community/community_existencialista.png'),
  trascendentalista: require('../assets/sidebar/community/community_trascendentalista.png'),
  humanista: require('../assets/sidebar/community/community_humanista.png'),
  realista: require('../assets/sidebar/community/community_realista.png'),
  racionalista: require('../assets/sidebar/community/community_racionalista.png'),
};

export const SIDEBAR_DEFAULT_COMMUNITY_BUTTON: ImageSourcePropType = require('../assets/sidebar/community/community_default.png');

/** Misma lógica que la estrella del header: `clanId` del usuario o default si no hay casa. */
export function getCommunityButtonByHouse(house?: string | null): ImageSourcePropType {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_COMMUNITY_BUTTON;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (COMMUNITY_BY_CLAN as Record<string, ImageSourcePropType | undefined>)[key] ?? SIDEBAR_DEFAULT_COMMUNITY_BUTTON;
}
