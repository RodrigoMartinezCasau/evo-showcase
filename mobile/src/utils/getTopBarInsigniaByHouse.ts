import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

import Svg38 from '../assets/topbar/insignias2Svg/38.svg';
import Svg39 from '../assets/topbar/insignias2Svg/39.svg';
import Svg40 from '../assets/topbar/insignias2Svg/40.svg';
import Svg41 from '../assets/topbar/insignias2Svg/41.svg';
import Svg42 from '../assets/topbar/insignias2Svg/42.svg';
import Svg43 from '../assets/topbar/insignias2Svg/43.svg';
import Svg44 from '../assets/topbar/insignias2Svg/44.svg';
import Svg45 from '../assets/topbar/insignias2Svg/45.svg';
import Svg46 from '../assets/topbar/insignias2Svg/46.svg';

export type TopBarInsigniaSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Misma lógica que `getClanInsigniaByHouse` (insignia inferior), assets desde `INSIGNIAS 2`.
 */
const INSIGNIA_BY_CLAN: Record<ClanId, FC<TopBarInsigniaSvgProps>> = {
  racionalista: Svg39,
  realista: Svg40,
  humanista: Svg41,
  existencialista: Svg42,
  trascendentalista: Svg43,
  cientista: Svg44,
  nihilista: Svg45,
  estoico: Svg46,
};

export const TOP_BAR_DEFAULT_INSIGNIA: FC<TopBarInsigniaSvgProps> = Svg38;

export function getTopBarInsigniaByHouse(house?: string | null): FC<TopBarInsigniaSvgProps> {
  if (house == null || house === '') {
    return TOP_BAR_DEFAULT_INSIGNIA;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (INSIGNIA_BY_CLAN as Record<string, FC<TopBarInsigniaSvgProps> | undefined>)[key] ?? TOP_BAR_DEFAULT_INSIGNIA;
}
