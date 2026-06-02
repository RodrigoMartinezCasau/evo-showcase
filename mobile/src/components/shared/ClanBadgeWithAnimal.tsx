import React from 'react';
import { View, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { FC } from 'react';
import { ANIM_CLANS, type AnimClanId } from '@evoconn/constants/evoAnimationClans';

type SvgFrameProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Los SVG de medalla (philosophyBadges, insignias topbar) incluyen el animal
 * como `<image xlink:href="data:image/png;base64,...">`. react-native-svg no
 * pinta esas imágenes embebidas en build nativo → solo se ve el escudo/fondo.
 * Solución: marco SVG + PNG del animal (`assets/animals/*.png`) superpuesto.
 *
 * Coordenadas derivadas del viewBox 600×600 y clipPath interior del escudo.
 */
const ANIMAL_BOX = {
  left: '30.5%',
  top: '26%',
  width: '39.5%',
  height: '47%',
} as const;

type Props = {
  FrameSvg: FC<SvgFrameProps>;
  clanId: string | null | undefined;
  size: number;
  /** false para medallas ocultas / sin clan */
  showAnimal?: boolean;
};

export const ClanBadgeWithAnimal = React.memo(function ClanBadgeWithAnimal({
  FrameSvg,
  clanId,
  size,
  showAnimal = true,
}: Props) {
  const key = (clanId ?? 'none') as AnimClanId;
  const animalAsset =
    showAnimal && clanId && key !== 'none' ? ANIM_CLANS[key]?.animalAsset ?? null : null;

  return (
    <View style={{ width: size, height: size }}>
      <FrameSvg width={size} height={size} />
      {animalAsset ? (
        <Image source={animalAsset} style={styles.animal} resizeMode="contain" />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  animal: {
    position: 'absolute',
    left: ANIMAL_BOX.left,
    top: ANIMAL_BOX.top,
    width: ANIMAL_BOX.width,
    height: ANIMAL_BOX.height,
  },
});
