import type { ImageSourcePropType } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

const PHRASE_BY_CLAN: Record<ClanId, ImageSourcePropType> = {
  nihilista: require('../assets/sidebar/newPhrase/phrase_nihilista.png'),
  cientista: require('../assets/sidebar/newPhrase/phrase_cientista.png'),
  estoico: require('../assets/sidebar/newPhrase/phrase_estoico.png'),
  existencialista: require('../assets/sidebar/newPhrase/phrase_existencialista.png'),
  trascendentalista: require('../assets/sidebar/newPhrase/phrase_trascendentalista.png'),
  humanista: require('../assets/sidebar/newPhrase/phrase_humanista.png'),
  realista: require('../assets/sidebar/newPhrase/phrase_realista.png'),
  racionalista: require('../assets/sidebar/newPhrase/phrase_racionalista.png'),
};

export const SIDEBAR_DEFAULT_NEW_PHRASE_BUTTON: ImageSourcePropType = require('../assets/sidebar/newPhrase/phrase_default.png');

export function getNewPhraseButtonByHouse(house?: string | null): ImageSourcePropType {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_NEW_PHRASE_BUTTON;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (PHRASE_BY_CLAN as Record<string, ImageSourcePropType | undefined>)[key] ?? SIDEBAR_DEFAULT_NEW_PHRASE_BUTTON;
}
