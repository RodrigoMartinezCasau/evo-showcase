import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

import Svg120 from '../assets/topbar/rachaSvg/120.svg';
import Svg121 from '../assets/topbar/rachaSvg/121.svg';
import Svg122 from '../assets/topbar/rachaSvg/122.svg';
import Svg123 from '../assets/topbar/rachaSvg/123.svg';
import Svg124 from '../assets/topbar/rachaSvg/124.svg';
import Svg125 from '../assets/topbar/rachaSvg/125.svg';
import Svg126 from '../assets/topbar/rachaSvg/126.svg';
import Svg127 from '../assets/topbar/rachaSvg/127.svg';
import Svg128 from '../assets/topbar/rachaSvg/128.svg';

export type TopBarRachaSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Carpeta RACHA (barra superior): 120 sin clan, 121–128 clanes en orden estándar. */
const RACHA_TOP_BY_CLAN: Record<ClanId, FC<TopBarRachaSvgProps>> = {
  racionalista: Svg121,
  realista: Svg122,
  humanista: Svg123,
  existencialista: Svg124,
  trascendentalista: Svg125,
  cientista: Svg126,
  nihilista: Svg127,
  estoico: Svg128,
};

export const TOP_BAR_DEFAULT_RACHA: FC<TopBarRachaSvgProps> = Svg120;

export function getTopBarRachaTopByHouse(house?: string | null): FC<TopBarRachaSvgProps> {
  if (house == null || house === '') {
    return TOP_BAR_DEFAULT_RACHA;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (RACHA_TOP_BY_CLAN as Record<string, FC<TopBarRachaSvgProps> | undefined>)[key] ?? TOP_BAR_DEFAULT_RACHA;
}
