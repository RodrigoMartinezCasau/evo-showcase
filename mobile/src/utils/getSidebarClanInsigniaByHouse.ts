import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

export type SidebarClanInsigniaSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

import Svg59 from '../assets/sidebar/clanInsigniaSvg/59.svg';
import Svg60 from '../assets/sidebar/clanInsigniaSvg/60.svg';
import Svg61 from '../assets/sidebar/clanInsigniaSvg/61.svg';
import Svg62 from '../assets/sidebar/clanInsigniaSvg/62.svg';
import Svg63 from '../assets/sidebar/clanInsigniaSvg/63.svg';
import Svg64 from '../assets/sidebar/clanInsigniaSvg/64.svg';
import Svg65 from '../assets/sidebar/clanInsigniaSvg/65.svg';
import Svg66 from '../assets/sidebar/clanInsigniaSvg/66.svg';
import Svg67 from '../assets/sidebar/clanInsigniaSvg/67.svg';

/**
 * Insignia inferior (59–67), "ICONO USUARIO" assets:
 * 59 = Evocon / sin clan; 60–67 = racionalista…estoico en el mismo orden que `getClanButtonByHouse`.
 */
const CLAN_INSIGNIA_BY_CLAN: Record<ClanId, FC<SidebarClanInsigniaSvgProps>> = {
  racionalista: Svg60,
  realista: Svg61,
  humanista: Svg62,
  existencialista: Svg63,
  trascendentalista: Svg64,
  cientista: Svg65,
  nihilista: Svg66,
  estoico: Svg67,
};

export const SIDEBAR_DEFAULT_CLAN_INSIGNIA: FC<SidebarClanInsigniaSvgProps> = Svg59;

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
