import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

export type SidebarClanInsigniaSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

import Svg38 from '../assets/sidebar/clanInsigniaSvg/38.svg';
import Svg39 from '../assets/sidebar/clanInsigniaSvg/39.svg';
import Svg40 from '../assets/sidebar/clanInsigniaSvg/40.svg';
import Svg41 from '../assets/sidebar/clanInsigniaSvg/41.svg';
import Svg42 from '../assets/sidebar/clanInsigniaSvg/42.svg';
import Svg43 from '../assets/sidebar/clanInsigniaSvg/43.svg';
import Svg44 from '../assets/sidebar/clanInsigniaSvg/44.svg';
import Svg45 from '../assets/sidebar/clanInsigniaSvg/45.svg';
import Svg46 from '../assets/sidebar/clanInsigniaSvg/46.svg';

/**
 * Insignia inferior (38–46), mismo criterio que botón clan 129–137:
 * 38 = Evocon / sin clan; 39–46 = racionalista…estoico en el mismo orden que `getClanButtonByHouse`.
 */
const CLAN_INSIGNIA_BY_CLAN: Record<ClanId, FC<SidebarClanInsigniaSvgProps>> = {
  racionalista: Svg39,
  realista: Svg40,
  humanista: Svg41,
  existencialista: Svg42,
  trascendentalista: Svg43,
  cientista: Svg44,
  nihilista: Svg45,
  estoico: Svg46,
};

export const SIDEBAR_DEFAULT_CLAN_INSIGNIA: FC<SidebarClanInsigniaSvgProps> = Svg38;

export function getClanInsigniaByHouse(house?: string | null): FC<SidebarClanInsigniaSvgProps> {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_CLAN_INSIGNIA;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (CLAN_INSIGNIA_BY_CLAN as Record<string, FC<SidebarClanInsigniaSvgProps> | undefined>)[key] ??
    SIDEBAR_DEFAULT_CLAN_INSIGNIA
  );
}
