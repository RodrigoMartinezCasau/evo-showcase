import React, { type FC } from 'react';
import {
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

export type TopBarLapizSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * PNG (320 px) del lápiz de frases por clan. Antes eran SVG de ~55 KB con
 * ~190 clipPaths cada uno; rasterizados pesan menos y se decodifican una vez.
 */
function makeIcon(source: ImageSourcePropType): FC<TopBarLapizSvgProps> {
  const LapizIcon: FC<TopBarLapizSvgProps> = ({ width, height, style }) =>
    React.createElement(Image, {
      source,
      resizeMode: 'contain',
      fadeDuration: 0,
      style: [{ width, height }, style as StyleProp<ImageStyle>],
    });
  return LapizIcon;
}

const LAPIZ_BY_CLAN: Record<ClanId, FC<TopBarLapizSvgProps>> = {
  racionalista: makeIcon(require('../assets/topbar/lapizPng/112.png')),
  realista: makeIcon(require('../assets/topbar/lapizPng/113.png')),
  humanista: makeIcon(require('../assets/topbar/lapizPng/114.png')),
  existencialista: makeIcon(require('../assets/topbar/lapizPng/115.png')),
  trascendentalista: makeIcon(require('../assets/topbar/lapizPng/116.png')),
  cientista: makeIcon(require('../assets/topbar/lapizPng/117.png')),
  nihilista: makeIcon(require('../assets/topbar/lapizPng/118.png')),
  estoico: makeIcon(require('../assets/topbar/lapizPng/119.png')),
};

export const TOP_BAR_DEFAULT_LAPIZ: FC<TopBarLapizSvgProps> = makeIcon(
  require('../assets/topbar/lapizPng/111.png'),
);

export function getTopBarLapizByHouse(house?: string | null): FC<TopBarLapizSvgProps> {
  if (house == null || house === '') {
    return TOP_BAR_DEFAULT_LAPIZ;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (LAPIZ_BY_CLAN as Record<string, FC<TopBarLapizSvgProps> | undefined>)[key] ?? TOP_BAR_DEFAULT_LAPIZ;
}
