import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

import Svg102 from '../assets/topbar/usosSvg/102.svg';
import Svg103 from '../assets/topbar/usosSvg/103.svg';
import Svg104 from '../assets/topbar/usosSvg/104.svg';
import Svg105 from '../assets/topbar/usosSvg/105.svg';
import Svg106 from '../assets/topbar/usosSvg/106.svg';
import Svg107 from '../assets/topbar/usosSvg/107.svg';
import Svg108 from '../assets/topbar/usosSvg/108.svg';
import Svg109 from '../assets/topbar/usosSvg/109.svg';
import Svg110 from '../assets/topbar/usosSvg/110.svg';

export type TopBarUsosSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Carpeta USOS; mismo criterio 102–110 que sidebar frases. */
const USOS_BY_CLAN: Record<ClanId, FC<TopBarUsosSvgProps>> = {
  racionalista: Svg103,
  realista: Svg104,
  humanista: Svg105,
  existencialista: Svg106,
  trascendentalista: Svg107,
  cientista: Svg108,
  nihilista: Svg109,
  estoico: Svg110,
};

export const TOP_BAR_DEFAULT_USOS: FC<TopBarUsosSvgProps> = Svg102;

export function getTopBarUsosByHouse(house?: string | null): FC<TopBarUsosSvgProps> {
  if (house == null || house === '') {
    return TOP_BAR_DEFAULT_USOS;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (USOS_BY_CLAN as Record<string, FC<TopBarUsosSvgProps> | undefined>)[key] ?? TOP_BAR_DEFAULT_USOS;
}
