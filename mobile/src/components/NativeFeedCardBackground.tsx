import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { CardSizeTier } from '@evoconn/constants/cardSizing';
import {
  CARD_FRAME_BACKGROUND,
  CARD_INNER_BACKGROUND,
  computeNativeFeedCardBackgroundLayout,
  computeSvgCardLayout,
  SVG_CARD_VISUAL,
  type SvgCardLayout,
} from '@evoconn/constants/svgCardLayout';

type Props = {
  tier: CardSizeTier;
  cardWidth: number;
  layout: SvgCardLayout;
  /** Extensión inferior por foto (Siguiendo). Mantiene el dock a inset fijo del fondo. */
  bottomExtendPx?: number;
};

/**
 * Native replacement for the black-only clan card background SVGs.
 * Geometry is derived from the same viewBox constants as `computeSvgCardLayout`.
 */
export const NativeFeedCardBackground = React.memo(function NativeFeedCardBackground({
  tier,
  cardWidth,
  layout,
  bottomExtendPx = 0,
}: Props) {
  const bg = useMemo(
    () => computeNativeFeedCardBackgroundLayout(tier, cardWidth, layout, bottomExtendPx),
    [tier, cardWidth, layout, bottomExtendPx],
  );

  const innerHeight = bg.blackBottomPx - bg.blackTopPx;

  return (
    <View
      style={[
        styles.root,
        {
          width: bg.cardWidth,
          height: bg.cardHeight,
          borderRadius: SVG_CARD_VISUAL.CARD_BORDER_RADIUS,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[StyleSheet.absoluteFill, styles.frameFill]} />

      <View
        style={{
          position: 'absolute',
          top: bg.blackTopPx,
          left: bg.blackLeftPx,
          right: bg.blackRightPx,
          height: innerHeight,
          backgroundColor: CARD_INNER_BACKGROUND,
          borderRadius: bg.innerPanelBorderRadius,
        }}
      />

      {bg.bannerPieces.map((piece, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: piece.top,
            left: piece.left,
            width: piece.width,
            height: piece.height,
            backgroundColor: CARD_FRAME_BACKGROUND,
            borderRadius: piece.borderRadius,
          }}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  frameFill: {
    backgroundColor: CARD_FRAME_BACKGROUND,
  },
});
