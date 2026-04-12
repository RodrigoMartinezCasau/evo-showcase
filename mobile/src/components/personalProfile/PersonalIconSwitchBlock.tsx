import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getStarByHouse, SIDEBAR_DEFAULT_STAR } from '@evoconn/utils/getSidebarStar';
import {
  BOTTOM_BLOCK_SIZE,
  BOTTOM_BLOCK_BORDER_RADIUS,
  ICON_SWITCH_OFFSET_X,
  ICON_SWITCH_OFFSET_Y,
  ICON_SWITCH_SCALE,
  APP_ICON_STAR_OFFSET_X,
  APP_ICON_STAR_OFFSET_Y,
  APP_ICON_STAR_SCALE,
} from '@evoconn/constants/personalProfileLayout';

type Props = {
  clanId: string | null;
};

/** Base lógica; tamaño en pantalla = base × APP_ICON_STAR_SCALE (sin `scale` en transform — evita pixelado). */
const STAR_BASE = 52;

export const PersonalIconSwitchBlock = React.memo(function PersonalIconSwitchBlock({ clanId }: Props) {
  const starSource = clanId ? getStarByHouse(clanId) : SIDEBAR_DEFAULT_STAR;
  const starW = STAR_BASE * APP_ICON_STAR_SCALE;
  const starH = STAR_BASE * APP_ICON_STAR_SCALE;

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
      <Text style={styles.label}>Añadir Icono app</Text>
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
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.65,
    zIndex: 1,
    position: 'absolute',
    top: 8,
  },
  star: {
    position: 'absolute',
  },
});
