import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

import Svg111 from '../assets/topbar/lapizSvg/111.svg';
import Svg112 from '../assets/topbar/lapizSvg/112.svg';
import Svg113 from '../assets/topbar/lapizSvg/113.svg';
import Svg114 from '../assets/topbar/lapizSvg/114.svg';
import Svg115 from '../assets/topbar/lapizSvg/115.svg';
import Svg116 from '../assets/topbar/lapizSvg/116.svg';
import Svg117 from '../assets/topbar/lapizSvg/117.svg';
import Svg118 from '../assets/topbar/lapizSvg/118.svg';
import Svg119 from '../assets/topbar/lapizSvg/119.svg';

export type TopBarLapizSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Carpeta LAPIZ; mismo criterio 111–119 que sidebar racha / lápiz frases numérico. */
const LAPIZ_BY_CLAN: Record<ClanId, FC<TopBarLapizSvgProps>> = {
  racionalista: Svg112,
  realista: Svg113,
  humanista: Svg114,
  existencialista: Svg115,
  trascendentalista: Svg116,
  cientista: Svg117,
  nihilista: Svg118,
  estoico: Svg119,
};

export const TOP_BAR_DEFAULT_LAPIZ: FC<TopBarLapizSvgProps> = Svg111;

export function getTopBarLapizByHouse(house?: string | null): FC<TopBarLapizSvgProps> {
  if (house == null || house === '') {
    return TOP_BAR_DEFAULT_LAPIZ;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (LAPIZ_BY_CLAN as Record<string, FC<TopBarLapizSvgProps> | undefined>)[key] ?? TOP_BAR_DEFAULT_LAPIZ;
}
