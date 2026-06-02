import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { FC } from 'react';

type SvgFrameProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

type Props = {
  FrameSvg: FC<SvgFrameProps>;
  clanId: string | null | undefined;
  size: number;
  /** Conservado por compatibilidad con los call sites; ya no se usa. */
  showAnimal?: boolean;
};

/**
 * Medalla de clan: los SVG (philosophyBadges, insignias del topbar) ya incluyen
 * el animal mitológico embebido y react-native-svg lo pinta correctamente, así
 * que renderizamos el SVG tal cual fue diseñado en Canva. No se superpone ningún
 * PNG extra (eso duplicaba el animal: uno embebido + uno superpuesto).
 */
export const ClanBadgeWithAnimal = React.memo(function ClanBadgeWithAnimal({
  FrameSvg,
  size,
}: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <FrameSvg width={size} height={size} />
    </View>
  );
});
