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
 * Versión PNG de la insignia de clan para la TOP BAR.
 *
 * Los SVG originales (`insignias2Svg/38-46.svg`) pesan 350 KB–1 MB porque
 * incrustan un PNG raster de 1024×1536 en base64 + ~240 paths + 168 clipPaths.
 * Renderizarlos con `react-native-svg` en cada montaje del top bar (≈20
 * pantallas) era el mayor coste de la barra. Estos PNG (256 px, ~40 KB) son el
 * MISMO arte ya compuesto (escudo + estrellas + animal), ×16 más ligeros y
 * decodificados una sola vez por el sistema de imágenes de RN.
 *
 * Las pantallas que muestran el escudo grande (ClanDisplay, 250 px) siguen
 * usando el SVG vía `getTopBarInsigniaByHouse` para no perder nitidez.
 */
export type TopBarInsigniaSvgProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const PNG_BY_CLAN: Record<ClanId, ImageSourcePropType> = {
  racionalista: require('../assets/topbar/insignias2Png/39.png'),
  realista: require('../assets/topbar/insignias2Png/40.png'),
  humanista: require('../assets/topbar/insignias2Png/41.png'),
  existencialista: require('../assets/topbar/insignias2Png/42.png'),
  trascendentalista: require('../assets/topbar/insignias2Png/43.png'),
  cientista: require('../assets/topbar/insignias2Png/44.png'),
  nihilista: require('../assets/topbar/insignias2Png/45.png'),
  estoico: require('../assets/topbar/insignias2Png/46.png'),
};

const DEFAULT_PNG: ImageSourcePropType = require('../assets/topbar/insignias2Png/38.png');

function makeInsignia(source: ImageSourcePropType): FC<TopBarInsigniaSvgProps> {
  return function TopBarInsigniaPng({ width, height, style }: TopBarInsigniaSvgProps) {
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

const INSIGNIA_BY_CLAN: Record<ClanId, FC<TopBarInsigniaSvgProps>> = {
  racionalista: makeInsignia(PNG_BY_CLAN.racionalista),
  realista: makeInsignia(PNG_BY_CLAN.realista),
  humanista: makeInsignia(PNG_BY_CLAN.humanista),
  existencialista: makeInsignia(PNG_BY_CLAN.existencialista),
  trascendentalista: makeInsignia(PNG_BY_CLAN.trascendentalista),
  cientista: makeInsignia(PNG_BY_CLAN.cientista),
  nihilista: makeInsignia(PNG_BY_CLAN.nihilista),
  estoico: makeInsignia(PNG_BY_CLAN.estoico),
};

export const TOP_BAR_DEFAULT_INSIGNIA_PNG: FC<TopBarInsigniaSvgProps> =
  makeInsignia(DEFAULT_PNG);

export function getTopBarInsigniaPngByHouse(
  house?: string | null,
): FC<TopBarInsigniaSvgProps> {
  if (house == null || house === '') {
    return TOP_BAR_DEFAULT_INSIGNIA_PNG;
  }
  const key = house.trim().toLowerCase() as ClanId;
  return (
    (INSIGNIA_BY_CLAN as Record<string, FC<TopBarInsigniaSvgProps> | undefined>)[key] ??
    TOP_BAR_DEFAULT_INSIGNIA_PNG
  );
}
