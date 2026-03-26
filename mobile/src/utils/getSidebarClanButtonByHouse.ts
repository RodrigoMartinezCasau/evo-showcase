import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

/** Props mínimas que exponen los `.svg` vía `react-native-svg-transformer` (sin depender de tipos desde `../src`). */
export type SidebarClanSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

import Svg129 from '../assets/sidebar/clanButtonSvg/129.svg';
import Svg130 from '../assets/sidebar/clanButtonSvg/130.svg';
import Svg131 from '../assets/sidebar/clanButtonSvg/131.svg';
import Svg132 from '../assets/sidebar/clanButtonSvg/132.svg';
import Svg133 from '../assets/sidebar/clanButtonSvg/133.svg';
import Svg134 from '../assets/sidebar/clanButtonSvg/134.svg';
import Svg135 from '../assets/sidebar/clanButtonSvg/135.svg';
import Svg136 from '../assets/sidebar/clanButtonSvg/136.svg';
import Svg137 from '../assets/sidebar/clanButtonSvg/137.svg';

/**
 * Botón CLAN (SVG por clan, nombres 129–137).
 *
 * - Sin clan / Evocon → 129.svg
 * - Mismo criterio de ids que el marco de conversaciones.
 */
const CLAN_BUTTON_BY_CLAN: Record<ClanId, FC<SidebarClanSvgProps>> = {
  racionalista: Svg130,
  realista: Svg131,
  humanista: Svg132,
  existencialista: Svg133,
  trascendentalista: Svg134,
  cientista: Svg135,
  nihilista: Svg136,
  estoico: Svg137,
};

/** Sin clan — 129.svg (Evocon / default). */
export const SIDEBAR_DEFAULT_CLAN_BUTTON: FC<SidebarClanSvgProps> = Svg129;

export function getClanButtonByHouse(house?: string | null): FC<SidebarClanSvgProps> {
  if (house == null || house === '') {
    return SIDEBAR_DEFAULT_CLAN_BUTTON;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (CLAN_BUTTON_BY_CLAN as Record<string, FC<SidebarClanSvgProps> | undefined>)[key] ?? SIDEBAR_DEFAULT_CLAN_BUTTON;
}
