import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  ClipPath,
  Text as SvgText,
} from 'react-native-svg';
import type { Rank } from '@evoconn/types';
import {
  RANK_BLOCK_OFFSET_X,
  RANK_BLOCK_OFFSET_Y,
  RANK_BLOCK_MARGIN_TOP,
  RANK_BLOCK_MARGIN_BOTTOM,
  RANK_BLOCK_SCALE,
  RANK_BLOCK_SCALE_Y,
  RANK_CONTAINER_WIDTH,
  RANK_CONTAINER_HEIGHT,
  RANK_CONTAINER_BORDER_RADIUS,
  RANK_CONTAINER_COLOR,
  RANK_CONTAINER_MARGIN_HORIZONTAL,
  RANK_CONTAINER_PADDING_VERTICAL,
  RANK_CONTAINER_PADDING_HORIZONTAL,
  RANK_CONTAINER_SCALE_Y,
  RANK_BAR_HEIGHT,
  RANK_BAR_OFFSET_Y,
  RANK_BAR_BACKGROUND_COLOR,
  RANK_BAR_GRADIENT_START,
  RANK_BAR_GRADIENT_END,
  RANK_BAR_RADIUS,
  RANK_BAR_THICKNESS,
  RANK_BAR_SCALE_Y,
  RANK_CURRENT_INSIDE_OFFSET_X,
  RANK_CURRENT_INSIDE_OFFSET_Y,
  RANK_CURRENT_INSIDE_SCALE,
  RANK_CURRENT_FONT_SIZE,
  RANK_NEXT_INSIDE_OFFSET_X,
  RANK_NEXT_INSIDE_OFFSET_Y,
  RANK_NEXT_INSIDE_SCALE,
  RANK_NEXT_FONT_SIZE,
  RANK_NEXT_GRADIENT_START,
  RANK_NEXT_GRADIENT_END,
  RANK_TEXT_BLACK_COLOR,
  RANK_PROGRESS_VALUE,
} from '@evoconn/constants/personalProfileLayout';

const RANK_ORDER: Rank[] = ['aprendiz', 'maestro', 'filosofo'];
const RANK_LABELS: Record<Rank, string> = {
  aprendiz: 'Aprendiz',
  maestro: 'Maestro',
  filosofo: 'Filósofo',
};

type Props = {
  rank: Rank;
  progress?: number;
};

export const PersonalRankProgression = React.memo(function PersonalRankProgression({
  rank,
  progress = RANK_PROGRESS_VALUE,
}: Props) {
  const currentIndex = RANK_ORDER.indexOf(rank);
  const nextRank = currentIndex < RANK_ORDER.length - 1
    ? RANK_ORDER[currentIndex + 1]
    : RANK_ORDER[currentIndex];
  const isMaxRank = currentIndex === RANK_ORDER.length - 1;
  const clampedProgress = isMaxRank ? 1 : Math.max(0, Math.min(1, progress));

  const [barWidth, setBarWidth] = useState(0);
  const onBarLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  const fillWidth = barWidth * clampedProgress;

  const containerStyle = useMemo(() => [
    styles.container,
    {
      backgroundColor: RANK_CONTAINER_COLOR,
      borderRadius: RANK_CONTAINER_BORDER_RADIUS,
      marginHorizontal: RANK_CONTAINER_MARGIN_HORIZONTAL,
      paddingVertical: RANK_CONTAINER_PADDING_VERTICAL,
      paddingHorizontal: RANK_CONTAINER_PADDING_HORIZONTAL,
    },
    RANK_CONTAINER_WIDTH !== undefined && { width: RANK_CONTAINER_WIDTH, alignSelf: 'center' as const, marginHorizontal: 0 },
    RANK_CONTAINER_HEIGHT !== undefined && { height: RANK_CONTAINER_HEIGHT },
  ], []);

  const currentLabel = RANK_LABELS[rank].toUpperCase();
  const nextLabel = RANK_LABELS[nextRank].toUpperCase();
  const textY = RANK_BAR_HEIGHT / 2;

  return (
    <View
      style={[
        styles.blockWrap,
        {
          marginTop: RANK_BLOCK_MARGIN_TOP,
          marginBottom: RANK_BLOCK_MARGIN_BOTTOM,
          transform: [
            { translateX: RANK_BLOCK_OFFSET_X },
            { translateY: RANK_BLOCK_OFFSET_Y },
            { scale: RANK_BLOCK_SCALE },
            { scaleY: RANK_BLOCK_SCALE_Y },
          ],
        },
      ]}
    >
      {/* Container with its own scaleY — compresses the black outline independently */}
      <View style={[containerStyle, { transform: [{ scaleY: RANK_CONTAINER_SCALE_Y }] }]}>
        {/* Counter-scale the content so text stays unaffected by container compression */}
        <View style={{ transform: [{ scaleY: RANK_CONTAINER_SCALE_Y !== 0 ? 1 / RANK_CONTAINER_SCALE_Y : 1 }] }}>
          <View
            onLayout={onBarLayout}
            style={[
              styles.barArea,
              {
                height: RANK_BAR_HEIGHT,
                borderRadius: RANK_BAR_RADIUS,
                transform: [{ translateY: RANK_BAR_OFFSET_Y }],
              },
            ]}
          >
            {/* Track + fill wrapped with bar scaleY — compresses the line independently */}
            <View style={[styles.barVisualLayer, { transform: [{ scaleY: RANK_BAR_SCALE_Y }] }]}>
              {/* Track background */}
              <View
                style={[
                  styles.track,
                  {
                    height: RANK_BAR_THICKNESS,
                    backgroundColor: RANK_BAR_BACKGROUND_COLOR,
                    borderRadius: RANK_BAR_RADIUS,
                  },
                ]}
              />

              {/* Gradient fill */}
              {barWidth > 0 && clampedProgress > 0 && (
                <View style={[styles.fillWrap, { borderRadius: RANK_BAR_RADIUS }]}>
                  <Svg width={barWidth} height={RANK_BAR_THICKNESS}>
                    <Defs>
                      <SvgLinearGradient id="rpBarFill" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor={RANK_BAR_GRADIENT_START} />
                        <Stop offset="1" stopColor={RANK_BAR_GRADIENT_END} />
                      </SvgLinearGradient>
                    </Defs>
                    <Rect
                      x={0}
                      y={0}
                      width={fillWidth}
                      height={RANK_BAR_THICKNESS}
                      rx={RANK_BAR_RADIUS}
                      ry={RANK_BAR_RADIUS}
                      fill="url(#rpBarFill)"
                    />
                  </Svg>
                </View>
              )}
            </View>

            {/* Layer 1: Gradient text — visible where bar is NOT filled */}
            {barWidth > 0 && (
              <View style={styles.textOverlay} pointerEvents="none">
                <Svg width={barWidth} height={RANK_BAR_HEIGHT}>
                  <Defs>
                    <SvgLinearGradient id="rpTxtGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor={RANK_NEXT_GRADIENT_START} />
                      <Stop offset="1" stopColor={RANK_NEXT_GRADIENT_END} />
                    </SvgLinearGradient>
                    <ClipPath id="rpClipEmpty">
                      <Rect x={fillWidth} y={0} width={barWidth - fillWidth} height={RANK_BAR_HEIGHT} />
                    </ClipPath>
                  </Defs>
                  <SvgText
                    x={RANK_CURRENT_INSIDE_OFFSET_X}
                    y={textY + RANK_CURRENT_INSIDE_OFFSET_Y}
                    fontSize={RANK_CURRENT_FONT_SIZE * RANK_CURRENT_INSIDE_SCALE}
                    fontWeight="700"
                    fill="url(#rpTxtGrad)"
                    clipPath="url(#rpClipEmpty)"
                    textAnchor="start"
                    alignmentBaseline="central"
                  >
                    {currentLabel}
                  </SvgText>
                  <SvgText
                    x={barWidth + RANK_NEXT_INSIDE_OFFSET_X}
                    y={textY + RANK_NEXT_INSIDE_OFFSET_Y}
                    fontSize={RANK_NEXT_FONT_SIZE * RANK_NEXT_INSIDE_SCALE}
                    fontWeight="700"
                    fill="url(#rpTxtGrad)"
                    clipPath="url(#rpClipEmpty)"
                    textAnchor="end"
                    alignmentBaseline="central"
                  >
                    {nextLabel}
                  </SvgText>
                </Svg>
              </View>
            )}

            {/* Layer 2: Black text — visible where bar IS filled */}
            {barWidth > 0 && fillWidth > 0 && (
              <View style={styles.textOverlay} pointerEvents="none">
                <Svg width={barWidth} height={RANK_BAR_HEIGHT}>
                  <Defs>
                    <ClipPath id="rpClipFill">
                      <Rect x={0} y={0} width={fillWidth} height={RANK_BAR_HEIGHT} />
                    </ClipPath>
                  </Defs>
                  <SvgText
                    x={RANK_CURRENT_INSIDE_OFFSET_X}
                    y={textY + RANK_CURRENT_INSIDE_OFFSET_Y}
                    fontSize={RANK_CURRENT_FONT_SIZE * RANK_CURRENT_INSIDE_SCALE}
                    fontWeight="700"
                    fill={RANK_TEXT_BLACK_COLOR}
                    clipPath="url(#rpClipFill)"
                    textAnchor="start"
                    alignmentBaseline="central"
                  >
                    {currentLabel}
                  </SvgText>
                  <SvgText
                    x={barWidth + RANK_NEXT_INSIDE_OFFSET_X}
                    y={textY + RANK_NEXT_INSIDE_OFFSET_Y}
                    fontSize={RANK_NEXT_FONT_SIZE * RANK_NEXT_INSIDE_SCALE}
                    fontWeight="700"
                    fill={RANK_TEXT_BLACK_COLOR}
                    clipPath="url(#rpClipFill)"
                    textAnchor="end"
                    alignmentBaseline="central"
                  >
                    {nextLabel}
                  </SvgText>
                </Svg>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  blockWrap: {
    alignSelf: 'stretch',
  },
  container: {},
  barArea: {
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  barVisualLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  fillWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
