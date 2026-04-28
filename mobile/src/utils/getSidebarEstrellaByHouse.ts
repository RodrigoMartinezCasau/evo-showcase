import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

// estrellasPrincipales: 17 = sin clan, 18–25 = clanes
import Svg17 from '../assets/sidebar/estrellasPrincipales/17.svg';
import Svg18 from '../assets/sidebar/estrellasPrincipales/18.svg';
import Svg19 from '../assets/sidebar/estrellasPrincipales/19.svg';
import Svg20 from '../assets/sidebar/estrellasPrincipales/20.svg';
import Svg21 from '../assets/sidebar/estrellasPrincipales/21.svg';
import Svg22 from '../assets/sidebar/estrellasPrincipales/22.svg';
import Svg23 from '../assets/sidebar/estrellasPrincipales/23.svg';
import Svg24 from '../assets/sidebar/estrellasPrincipales/24.svg';
import Svg25 from '../assets/sidebar/estrellasPrincipales/25.svg';

export type SidebarEstrellaSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** 17 = Evocon / sin clan */
export const SIDEBAR_DEFAULT_ESTRELLA: FC<SidebarEstrellaSvgProps> = Svg17;

const STAR_BY_CLAN: Record<ClanId, FC<SidebarEstrellaSvgProps>> = {
  estoico:           Svg18,
  nihilista:         Svg19,
  cientista:         Svg20,
  trascendentalista: Svg21,
  existencialista:   Svg22,
  humanista:         Svg23,
  realista:          Svg24,
  racionalista:      Svg25,
};

export function getSidebarEstrellaByHouse(
  house?: string | null,
): FC<SidebarEstrellaSvgProps> {
  if (house == null || house === '') return SIDEBAR_DEFAULT_ESTRELLA;
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (STAR_BY_CLAN as Record<string, FC<SidebarEstrellaSvgProps> | undefined>)[
      key
    ] ?? SIDEBAR_DEFAULT_ESTRELLA
  );
}
