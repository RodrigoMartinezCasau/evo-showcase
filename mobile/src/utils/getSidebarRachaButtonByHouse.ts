import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

import Svg190 from '../assets/sidebar/iconoFueguitoSvg/190.svg';
import Svg191 from '../assets/sidebar/iconoFueguitoSvg/191.svg';
import Svg192 from '../assets/sidebar/iconoFueguitoSvg/192.svg';
import Svg193 from '../assets/sidebar/iconoFueguitoSvg/193.svg';
import Svg194 from '../assets/sidebar/iconoFueguitoSvg/194.svg';
import Svg195 from '../assets/sidebar/iconoFueguitoSvg/195.svg';
import Svg196 from '../assets/sidebar/iconoFueguitoSvg/196.svg';
import Svg197 from '../assets/sidebar/iconoFueguitoSvg/197.svg';
import Svg198 from '../assets/sidebar/iconoFueguitoSvg/198.svg';

export type SidebarRachaSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Botón RACHA (SVG 190–198, carpeta `iconoFueguitoSvg` / icono fueguito). Mismo orden de clanes que 129–137.
 */
const RACHA_BUTTON_BY_CLAN: Record<ClanId, FC<SidebarRachaSvgProps>> = {
  racionalista: Svg191,
  realista: Svg192,
  humanista: Svg193,
  existencialista: Svg194,
  trascendentalista: Svg195,
  cientista: Svg196,
  nihilista: Svg197,
  estoico: Svg198,
};

/** Sin clan / Evocon → 190.svg */
export const SIDEBAR_DEFAULT_RACHA_BUTTON: FC<SidebarRachaSvgProps> = Svg190;

export function getRachaButtonByHouse(house?: string | null): FC<SidebarRachaSvgProps> {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_RACHA_BUTTON;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (RACHA_BUTTON_BY_CLAN as Record<string, FC<SidebarRachaSvgProps> | undefined>)[key] ?? SIDEBAR_DEFAULT_RACHA_BUTTON;
}
