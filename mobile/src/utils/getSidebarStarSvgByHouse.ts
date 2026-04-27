import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

import Svg17 from '../assets/sidebar/estrellasPrincipales/17.svg';
import Svg18 from '../assets/sidebar/estrellasPrincipales/18.svg';
import Svg19 from '../assets/sidebar/estrellasPrincipales/19.svg';
import Svg20 from '../assets/sidebar/estrellasPrincipales/20.svg';
import Svg21 from '../assets/sidebar/estrellasPrincipales/21.svg';
import Svg22 from '../assets/sidebar/estrellasPrincipales/22.svg';
import Svg23 from '../assets/sidebar/estrellasPrincipales/23.svg';
import Svg24 from '../assets/sidebar/estrellasPrincipales/24.svg';
import Svg25 from '../assets/sidebar/estrellasPrincipales/25.svg';

export type SidebarStarSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Mapeo de estrellas principales (17–25) por clan.
 * 17 = default / sin clan.
 */
const STAR_SVG_BY_CLAN: Record<ClanId, FC<SidebarStarSvgProps>> = {
  nihilista: Svg19,
  cientista: Svg20,
  estoico: Svg18,
  existencialista: Svg22,
  trascendentalista: Svg21,
  humanista: Svg23,
  realista: Svg24,
  racionalista: Svg25,
};

export const SIDEBAR_DEFAULT_STAR_SVG: FC<SidebarStarSvgProps> = Svg17;

export function getSidebarStarSvgByHouse(house?: string | null): FC<SidebarStarSvgProps> {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_STAR_SVG;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (STAR_SVG_BY_CLAN as Record<string, FC<SidebarStarSvgProps> | undefined>)[key] ?? SIDEBAR_DEFAULT_STAR_SVG;
}
