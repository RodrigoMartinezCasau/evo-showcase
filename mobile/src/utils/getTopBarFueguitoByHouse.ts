import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

import Svg111 from '../assets/topbar/fueguitoSvg/111.svg';
import Svg112 from '../assets/topbar/fueguitoSvg/112.svg';
import Svg113 from '../assets/topbar/fueguitoSvg/113.svg';
import Svg114 from '../assets/topbar/fueguitoSvg/114.svg';
import Svg115 from '../assets/topbar/fueguitoSvg/115.svg';
import Svg116 from '../assets/topbar/fueguitoSvg/116.svg';
import Svg117 from '../assets/topbar/fueguitoSvg/117.svg';
import Svg118 from '../assets/topbar/fueguitoSvg/118.svg';
import Svg119 from '../assets/topbar/fueguitoSvg/119.svg';

export type TopBarFueguitoSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Carpeta "icono fueguito" (fuego apagado): 111 sin clan, 112–119 clanes en orden estándar. */
const FUEGUITO_BY_CLAN: Record<ClanId, FC<TopBarFueguitoSvgProps>> = {
  racionalista:     Svg112,
  realista:         Svg113,
  humanista:        Svg114,
  existencialista:  Svg115,
  trascendentalista: Svg116,
  cientista:        Svg117,
  nihilista:        Svg118,
  estoico:          Svg119,
};

export const TOP_BAR_DEFAULT_FUEGUITO: FC<TopBarFueguitoSvgProps> = Svg111;

export function getTopBarFueguitoByHouse(house?: string | null): FC<TopBarFueguitoSvgProps> {
  if (house == null || house === '') return TOP_BAR_DEFAULT_FUEGUITO;
  const key = house.trim().toLowerCase() as ClanId;
  return (FUEGUITO_BY_CLAN as Record<string, FC<TopBarFueguitoSvgProps> | undefined>)[key]
    ?? TOP_BAR_DEFAULT_FUEGUITO;
}
