import type { ImageSourcePropType } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

const REFLECTION_BY_CLAN: Record<ClanId, ImageSourcePropType> = {
  nihilista: require('../assets/sidebar/newReflection/reflection_nihilista.png'),
  cientista: require('../assets/sidebar/newReflection/reflection_cientista.png'),
  estoico: require('../assets/sidebar/newReflection/reflection_estoico.png'),
  existencialista: require('../assets/sidebar/newReflection/reflection_existencialista.png'),
  trascendentalista: require('../assets/sidebar/newReflection/reflection_trascendentalista.png'),
  humanista: require('../assets/sidebar/newReflection/reflection_humanista.png'),
  realista: require('../assets/sidebar/newReflection/reflection_realista.png'),
  racionalista: require('../assets/sidebar/newReflection/reflection_racionalista.png'),
};

export const SIDEBAR_DEFAULT_NEW_REFLECTION_BUTTON: ImageSourcePropType = require('../assets/sidebar/newReflection/reflection_default.png');

export function getNewReflectionButtonByHouse(house?: string | null): ImageSourcePropType {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_NEW_REFLECTION_BUTTON;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (REFLECTION_BY_CLAN as Record<string, ImageSourcePropType | undefined>)[key] ?? SIDEBAR_DEFAULT_NEW_REFLECTION_BUTTON;
}
