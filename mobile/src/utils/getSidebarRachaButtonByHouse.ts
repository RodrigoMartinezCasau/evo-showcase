import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

import Svg111 from '../assets/sidebar/iconoFueguitoSvg/111.svg';
import Svg112 from '../assets/sidebar/iconoFueguitoSvg/112.svg';
import Svg113 from '../assets/sidebar/iconoFueguitoSvg/113.svg';
import Svg114 from '../assets/sidebar/iconoFueguitoSvg/114.svg';
import Svg115 from '../assets/sidebar/iconoFueguitoSvg/115.svg';
import Svg116 from '../assets/sidebar/iconoFueguitoSvg/116.svg';
import Svg117 from '../assets/sidebar/iconoFueguitoSvg/117.svg';
import Svg118 from '../assets/sidebar/iconoFueguitoSvg/118.svg';
import Svg119 from '../assets/sidebar/iconoFueguitoSvg/119.svg';

export type SidebarRachaSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Botón RACHA (SVG 111–119, carpeta `iconoFueguitoSvg` / icono fueguito). Mismo orden de clanes que 129–137.
 */
const RACHA_BUTTON_BY_CLAN: Record<ClanId, FC<SidebarRachaSvgProps>> = {
  racionalista: Svg112,
  realista: Svg113,
  humanista: Svg114,
  existencialista: Svg115,
  trascendentalista: Svg116,
  cientista: Svg117,
  nihilista: Svg118,
  estoico: Svg119,
};

/** Sin clan / Evocon → 111.svg */
export const SIDEBAR_DEFAULT_RACHA_BUTTON: FC<SidebarRachaSvgProps> = Svg111;

export function getRachaButtonByHouse(house?: string | null): FC<SidebarRachaSvgProps> {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_RACHA_BUTTON;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (RACHA_BUTTON_BY_CLAN as Record<string, FC<SidebarRachaSvgProps> | undefined>)[key] ?? SIDEBAR_DEFAULT_RACHA_BUTTON;
}
