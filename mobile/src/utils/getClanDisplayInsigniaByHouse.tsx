import React, { type FC } from 'react';
import {
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { ClanId } from '@evoconn/constants/clanColors';

/**
 * Versión PNG del escudo de clan GRANDE para la pantalla ClanDisplay (250 px).
 *
 * Los SVG originales (`insignias2Svg/38-46.svg`) incrustan un PNG raster de
 * 1024×1536 en base64 + ~240 paths + 168 clipPaths, así que `react-native-svg`
 * los recomponía path por path en cada apertura del clan → la pantalla tardaba
 * en pintar. Estos PNG (768 px, ~250 KB) son el MISMO arte ya rasterizado a una
 * resolución que sigue siendo nítida a 250 px en pantallas ×3, y los decodifica
 * el sistema de imágenes de RN una sola vez.
 */
export type ClanDisplayInsigniaProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const PNG_BY_CLAN: Record<ClanId, ImageSourcePropType> = {
  racionalista: require('../assets/topbar/insignias2PngLg/39.png'),
  realista: require('../assets/topbar/insignias2PngLg/40.png'),
  humanista: require('../assets/topbar/insignias2PngLg/41.png'),
  existencialista: require('../assets/topbar/insignias2PngLg/42.png'),
  trascendentalista: require('../assets/topbar/insignias2PngLg/43.png'),
  cientista: require('../assets/topbar/insignias2PngLg/44.png'),
  nihilista: require('../assets/topbar/insignias2PngLg/45.png'),
  estoico: require('../assets/topbar/insignias2PngLg/46.png'),
};

const DEFAULT_PNG: ImageSourcePropType = require('../assets/topbar/insignias2PngLg/38.png');

function makeInsignia(source: ImageSourcePropType): FC<ClanDisplayInsigniaProps> {
  return function ClanDisplayInsigniaPng({ width, height, style }: ClanDisplayInsigniaProps) {
    return (
      <Image
        source={source}
        resizeMode="contain"
        fadeDuration={0}
        style={[{ width, height }, style as StyleProp<ImageStyle>]}
      />
    );
  };
}

const INSIGNIA_BY_CLAN: Record<ClanId, FC<ClanDisplayInsigniaProps>> = {
  racionalista: makeInsignia(PNG_BY_CLAN.racionalista),
  realista: makeInsignia(PNG_BY_CLAN.realista),
  humanista: makeInsignia(PNG_BY_CLAN.humanista),
  existencialista: makeInsignia(PNG_BY_CLAN.existencialista),
  trascendentalista: makeInsignia(PNG_BY_CLAN.trascendentalista),
  cientista: makeInsignia(PNG_BY_CLAN.cientista),
  nihilista: makeInsignia(PNG_BY_CLAN.nihilista),
  estoico: makeInsignia(PNG_BY_CLAN.estoico),
};

export const CLAN_DISPLAY_DEFAULT_INSIGNIA_PNG: FC<ClanDisplayInsigniaProps> =
  makeInsignia(DEFAULT_PNG);

export function getClanDisplayInsigniaByHouse(
  house?: string | null,
): FC<ClanDisplayInsigniaProps> {
  if (house == null || house === '') {
    return CLAN_DISPLAY_DEFAULT_INSIGNIA_PNG;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (INSIGNIA_BY_CLAN as Record<string, FC<ClanDisplayInsigniaProps> | undefined>)[key] ??
    CLAN_DISPLAY_DEFAULT_INSIGNIA_PNG
  );
}
