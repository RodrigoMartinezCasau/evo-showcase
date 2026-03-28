import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

import Svg8 from '../assets/topbar/estrellasNuevasSvg/8.svg';
import Svg9 from '../assets/topbar/estrellasNuevasSvg/9.svg';
import Svg10 from '../assets/topbar/estrellasNuevasSvg/10.svg';
import Svg11 from '../assets/topbar/estrellasNuevasSvg/11.svg';
import Svg12 from '../assets/topbar/estrellasNuevasSvg/12.svg';
import Svg13 from '../assets/topbar/estrellasNuevasSvg/13.svg';
import Svg14 from '../assets/topbar/estrellasNuevasSvg/14.svg';
import Svg15 from '../assets/topbar/estrellasNuevasSvg/15.svg';
import Svg16 from '../assets/topbar/estrellasNuevasSvg/16.svg';

export type TopBarEstrellaSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Asignación de SVG 9–16 (ESTRELLAS NUEVAS) por clan.
 * Incluye intercambios manuales (exist./trasc.; nihilista ↔ estoico, etc.).
 * 8 = Evocon / sin clan.
 */
const STAR_BY_CLAN: Record<ClanId, FC<TopBarEstrellaSvgProps>> = {
  nihilista: Svg10,
  cientista: Svg11,
  estoico: Svg9,
  existencialista: Svg13,
  trascendentalista: Svg12,
  humanista: Svg14,
  realista: Svg15,
  racionalista: Svg16,
};

export const TOP_BAR_DEFAULT_ESTRELLA: FC<TopBarEstrellaSvgProps> = Svg8;

export function getTopBarEstrellaByHouse(house?: string | null): FC<TopBarEstrellaSvgProps> {
  if (house == null || house === '') {
    return TOP_BAR_DEFAULT_ESTRELLA;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (STAR_BY_CLAN as Record<string, FC<TopBarEstrellaSvgProps> | undefined>)[key] ?? TOP_BAR_DEFAULT_ESTRELLA;
}
