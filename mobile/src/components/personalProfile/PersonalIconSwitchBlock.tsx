import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getStarByHouse, SIDEBAR_DEFAULT_STAR } from '@evoconn/utils/getSidebarStar';
import { getClanColor } from '@evoconn/constants/clanColors';
import CientistaStarSvg from '../../assets/topbar/estrellasNuevasSvg/11.svg';
import TrascendentalistaStarSvg from '../../assets/topbar/estrellasNuevasSvg/12.svg';
import {
  BOTTOM_BLOCK_SIZE,
  BOTTOM_BLOCK_BORDER_RADIUS,
  ICON_SWITCH_OFFSET_X,
  ICON_SWITCH_OFFSET_Y,
  ICON_SWITCH_SCALE,
  APP_ICON_STAR_OFFSET_X,
  APP_ICON_STAR_OFFSET_Y,
  APP_ICON_STAR_SCALE,
  APP_ICON_STAR_SVG_EDITOR,
  PERSONAL_BOTTOM_BLOCKS_OPACITY,
} from '@evoconn/constants/personalProfileLayout';

type Props = {
  clanId: string | null;
};

/** Base lógica; tamaño en pantalla = base × APP_ICON_STAR_SCALE (sin `scale` en transform — evita pixelado). */
const STAR_BASE = 52;
const PNG_STAR_VISIBLE_WIDTH_RATIO = 346 / 800;
const PNG_STAR_VISIBLE_HEIGHT_RATIO = 353 / 800;
const PNG_STAR_VISIBLE_OFFSET_X_RATIO = 17 / 800;
const PNG_STAR_VISIBLE_OFFSET_Y_RATIO = -12.5 / 800;

export const PersonalIconSwitchBlock = React.memo(function PersonalIconSwitchBlock({ clanId }: Props) {
  const normalizedClanId = clanId?.trim().toLowerCase() ?? null;
  const starSource = clanId ? getStarByHouse(clanId) : SIDEBAR_DEFAULT_STAR;
  const SvgStar =
    normalizedClanId === 'cientista'
      ? CientistaStarSvg
      : normalizedClanId === 'trascendentalista'
        ? TrascendentalistaStarSvg
        : null;
  const svgEditor =
    normalizedClanId === 'cientista'
      ? APP_ICON_STAR_SVG_EDITOR.cientista
      : normalizedClanId === 'trascendentalista'
        ? APP_ICON_STAR_SVG_EDITOR.trascendentalista
        : null;
  const titleColor = getClanColor(clanId);
  const starW = STAR_BASE * APP_ICON_STAR_SCALE;
  const starH = STAR_BASE * APP_ICON_STAR_SCALE;
  const svgStarW = starW * PNG_STAR_VISIBLE_WIDTH_RATIO * (svgEditor?.scale ?? 1);
  const svgStarH = starH * PNG_STAR_VISIBLE_HEIGHT_RATIO * (svgEditor?.scale ?? 1);

  const handlePress = useCallback(() => {
    Alert.alert(
      'Cambiar icono de app',
      clanId
        ? `Se aplicará el icono del clan ${clanId}.`
        : 'Icono predeterminado. Únete a un clan para desbloquearlo.',
      [{ text: 'OK' }],
    );
  }, [clanId]);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[
        styles.block,
        {
          width: BOTTOM_BLOCK_SIZE,
          height: BOTTOM_BLOCK_SIZE,
          borderRadius: BOTTOM_BLOCK_BORDER_RADIUS,
          transform: [
            { translateX: ICON_SWITCH_OFFSET_X },
            { translateY: ICON_SWITCH_OFFSET_Y },
            { scale: ICON_SWITCH_SCALE },
          ],
        },
      ]}
    >
      <Text style={[styles.label, { color: titleColor }]}>Icono de app</Text>
      {SvgStar ? (
        <View
          style={[
            styles.star,
            styles.svgStarFrame,
            {
              width: starW,
              height: starH,
              transform: [
                { translateX: APP_ICON_STAR_OFFSET_X + (svgEditor?.offsetX ?? 0) },
                { translateY: APP_ICON_STAR_OFFSET_Y + (svgEditor?.offsetY ?? 0) },
              ],
            },
          ]}
        >
          <SvgStar
            width={svgStarW}
            height={svgStarH}
            style={{
              transform: [
                { translateX: starW * PNG_STAR_VISIBLE_OFFSET_X_RATIO },
                { translateY: starH * PNG_STAR_VISIBLE_OFFSET_Y_RATIO },
              ],
            }}
          />
        </View>
      ) : (
        <Image
          source={starSource}
          resizeMode="contain"
          style={[
            styles.star,
            {
              width: starW,
              height: starH,
              transform: [{ translateX: APP_ICON_STAR_OFFSET_X }, { translateY: APP_ICON_STAR_OFFSET_Y }],
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  block: {
    backgroundColor: `rgba(0,0,0,${PERSONAL_BOTTOM_BLOCKS_OPACITY})`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    zIndex: 1,
    position: 'absolute',
    top: 8,
  },
  star: {
    position: 'absolute',
  },
  svgStarFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
