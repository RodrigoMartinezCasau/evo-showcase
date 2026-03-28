import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

import Svg102 from '../assets/sidebar/iconoLapizSvg/102.svg';
import Svg103 from '../assets/sidebar/iconoLapizSvg/103.svg';
import Svg104 from '../assets/sidebar/iconoLapizSvg/104.svg';
import Svg105 from '../assets/sidebar/iconoLapizSvg/105.svg';
import Svg106 from '../assets/sidebar/iconoLapizSvg/106.svg';
import Svg107 from '../assets/sidebar/iconoLapizSvg/107.svg';
import Svg108 from '../assets/sidebar/iconoLapizSvg/108.svg';
import Svg109 from '../assets/sidebar/iconoLapizSvg/109.svg';
import Svg110 from '../assets/sidebar/iconoLapizSvg/110.svg';

export type SidebarFrasesSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Botón FRASES (SVG por clan, archivos 102–110 en `iconoLapizSvg` / ICONO LAPIZ).
 * Mismo criterio de ids que el botón CLAN (129–137).
 */
const FRASES_BUTTON_BY_CLAN: Record<ClanId, FC<SidebarFrasesSvgProps>> = {
  racionalista: Svg103,
  realista: Svg104,
  humanista: Svg105,
  existencialista: Svg106,
  trascendentalista: Svg107,
  cientista: Svg108,
  nihilista: Svg109,
  estoico: Svg110,
};

/** Sin clan / Evocon → 102.svg (verde lima). */
export const SIDEBAR_DEFAULT_FRASES_BUTTON: FC<SidebarFrasesSvgProps> = Svg102;

export function getFrasesButtonByHouse(house?: string | null): FC<SidebarFrasesSvgProps> {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_FRASES_BUTTON;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (FRASES_BUTTON_BY_CLAN as Record<string, FC<SidebarFrasesSvgProps> | undefined>)[key] ?? SIDEBAR_DEFAULT_FRASES_BUTTON;
}
