import React, { type FC } from 'react';
import {
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

export type TopBarRachaSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * PNG (320 px) del fuego encendido por clan (antes SVG de ~48 KB / ~170 clipPaths).
 */
function makeIcon(source: ImageSourcePropType): FC<TopBarRachaSvgProps> {
  const RachaIcon: FC<TopBarRachaSvgProps> = ({ width, height, style }) =>
    React.createElement(Image, {
      source,
      resizeMode: 'contain',
      fadeDuration: 0,
      style: [{ width, height }, style as StyleProp<ImageStyle>],
    });
  return RachaIcon;
}

const RACHA_TOP_BY_CLAN: Record<ClanId, FC<TopBarRachaSvgProps>> = {
  racionalista: makeIcon(require('../assets/topbar/rachaPng/121.png')),
  realista: makeIcon(require('../assets/topbar/rachaPng/122.png')),
  humanista: makeIcon(require('../assets/topbar/rachaPng/123.png')),
  existencialista: makeIcon(require('../assets/topbar/rachaPng/124.png')),
  trascendentalista: makeIcon(require('../assets/topbar/rachaPng/125.png')),
  cientista: makeIcon(require('../assets/topbar/rachaPng/126.png')),
  nihilista: makeIcon(require('../assets/topbar/rachaPng/127.png')),
  estoico: makeIcon(require('../assets/topbar/rachaPng/128.png')),
};

export const TOP_BAR_DEFAULT_RACHA: FC<TopBarRachaSvgProps> = makeIcon(
  require('../assets/topbar/rachaPng/120.png'),
);

export function getTopBarRachaTopByHouse(house?: string | null): FC<TopBarRachaSvgProps> {
  if (house == null || house === '') {
    return TOP_BAR_DEFAULT_RACHA;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (RACHA_TOP_BY_CLAN as Record<string, FC<TopBarRachaSvgProps> | undefined>)[key] ?? TOP_BAR_DEFAULT_RACHA;
}
