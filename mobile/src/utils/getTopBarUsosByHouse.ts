import React, { type FC } from 'react';
import {
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

export type TopBarUsosSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * PNG (320 px) del icono de usos por clan (antes SVG de ~47 KB / ~160 clipPaths).
 */
function makeIcon(source: ImageSourcePropType): FC<TopBarUsosSvgProps> {
  const UsosIcon: FC<TopBarUsosSvgProps> = ({ width, height, style }) =>
    React.createElement(Image, {
      source,
      resizeMode: 'contain',
      fadeDuration: 0,
      style: [{ width, height }, style as StyleProp<ImageStyle>],
    });
  return UsosIcon;
}

const USOS_BY_CLAN: Record<ClanId, FC<TopBarUsosSvgProps>> = {
  racionalista: makeIcon(require('../assets/topbar/usosPng/103.png')),
  realista: makeIcon(require('../assets/topbar/usosPng/104.png')),
  humanista: makeIcon(require('../assets/topbar/usosPng/105.png')),
  existencialista: makeIcon(require('../assets/topbar/usosPng/106.png')),
  trascendentalista: makeIcon(require('../assets/topbar/usosPng/107.png')),
  cientista: makeIcon(require('../assets/topbar/usosPng/108.png')),
  nihilista: makeIcon(require('../assets/topbar/usosPng/109.png')),
  estoico: makeIcon(require('../assets/topbar/usosPng/110.png')),
};

export const TOP_BAR_DEFAULT_USOS: FC<TopBarUsosSvgProps> = makeIcon(
  require('../assets/topbar/usosPng/102.png'),
);

export function getTopBarUsosByHouse(house?: string | null): FC<TopBarUsosSvgProps> {
  if (house == null || house === '') {
    return TOP_BAR_DEFAULT_USOS;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (USOS_BY_CLAN as Record<string, FC<TopBarUsosSvgProps> | undefined>)[key] ?? TOP_BAR_DEFAULT_USOS;
}
