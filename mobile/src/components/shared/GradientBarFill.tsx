/**
 * Renders a horizontal white-to-clan-color gradient inside a bar fill View.
 * Drop-in replacement for a solid white barFill.
 */
import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

type Props = {
  /** Width of this fill element — same value you'd pass to the outer View's `width` style. */
  widthStyle: string | number;
  /** Full height of the bar track (e.g. 7). */
  height: number;
  /** Border radius matching the bar (e.g. 4). */
  radius: number;
  /** Clan color for the right end of the gradient. */
  clanColor: string;
  /** Unique id suffix to avoid SVG gradient id collisions (e.g. clanId). */
  gradId: string;
};

export const GradientBarFill = React.memo(function GradientBarFill({
  widthStyle,
  height,
  radius,
  clanColor,
  gradId,
}: Props) {
  const [measuredW, setMeasuredW] = useState(0);

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      setMeasuredW(e.nativeEvent.layout.width);
    },
    [],
  );

  return (
    <View
      onLayout={onLayout}
      style={{
        width: widthStyle,
        height,
        borderRadius: radius,
        overflow: 'hidden',
      }}
    >
      {measuredW > 0 && (
        <Svg width={measuredW} height={height}>
          <Defs>
            <LinearGradient id={`gbf_${gradId}`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="1" stopColor={clanColor} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={measuredW}
            height={height}
            rx={radius}
            ry={radius}
            fill={`url(#gbf_${gradId})`}
          />
        </Svg>
      )}
    </View>
  );
});
