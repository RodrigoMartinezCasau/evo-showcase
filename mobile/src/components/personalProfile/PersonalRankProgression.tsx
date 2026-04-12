import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { Rank } from '@evoconn/types';
import {
  RANK_BLOCK_OFFSET_X,
  RANK_BLOCK_OFFSET_Y,
  RANK_BLOCK_SCALE,
  RANK_CONTAINER_WIDTH,
  RANK_CONTAINER_HEIGHT,
  RANK_CONTAINER_RADIUS,
  RANK_CONTAINER_COLOR,
  RANK_CONTAINER_MARGIN_HORIZONTAL,
  RANK_CONTAINER_PADDING_VERTICAL,
  RANK_CONTAINER_PADDING_HORIZONTAL,
  RANK_BAR_HEIGHT,
  RANK_BAR_OFFSET_Y,
  RANK_BAR_BACKGROUND_COLOR,
  RANK_BAR_GRADIENT_START,
  RANK_BAR_GRADIENT_END,
  RANK_BAR_RADIUS,
  RANK_CURRENT_OFFSET_X,
  RANK_CURRENT_OFFSET_Y,
  RANK_CURRENT_FONT_SIZE,
  RANK_CURRENT_COLOR,
  RANK_NEXT_OFFSET_X,
  RANK_NEXT_OFFSET_Y,
  RANK_NEXT_FONT_SIZE,
  RANK_NEXT_GRADIENT_START,
  RANK_NEXT_GRADIENT_END,
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

  const containerStyle = useMemo(() => [
    styles.container,
    {
      backgroundColor: RANK_CONTAINER_COLOR,
      borderRadius: RANK_CONTAINER_RADIUS,
      marginHorizontal: RANK_CONTAINER_MARGIN_HORIZONTAL,
      paddingVertical: RANK_CONTAINER_PADDING_VERTICAL,
      paddingHorizontal: RANK_CONTAINER_PADDING_HORIZONTAL,
    },
    RANK_CONTAINER_WIDTH !== undefined && { width: RANK_CONTAINER_WIDTH, alignSelf: 'center' as const, marginHorizontal: 0 },
    RANK_CONTAINER_HEIGHT !== undefined && { height: RANK_CONTAINER_HEIGHT },
  ], []);

  return (
    <View
      style={[
        styles.blockWrap,
        {
          transform: [
            { translateX: RANK_BLOCK_OFFSET_X },
            { translateY: RANK_BLOCK_OFFSET_Y },
            { scale: RANK_BLOCK_SCALE },
          ],
        },
      ]}
    >
      <View style={containerStyle}>
        <View style={styles.labelsRow}>
          <Text
            style={[
              styles.currentRank,
              {
                fontSize: RANK_CURRENT_FONT_SIZE,
                color: RANK_CURRENT_COLOR,
                transform: [
                  { translateX: RANK_CURRENT_OFFSET_X },
                  { translateY: RANK_CURRENT_OFFSET_Y },
                ],
              },
            ]}
          >
            {RANK_LABELS[rank]}
          </Text>

          <GradientText
            text={RANK_LABELS[nextRank]}
            fontSize={RANK_NEXT_FONT_SIZE}
            startColor={RANK_NEXT_GRADIENT_START}
            endColor={RANK_NEXT_GRADIENT_END}
            offsetX={RANK_NEXT_OFFSET_X}
            offsetY={RANK_NEXT_OFFSET_Y}
          />
        </View>

        <View
          style={[
            styles.barWrap,
            { transform: [{ translateY: RANK_BAR_OFFSET_Y }] },
          ]}
        >
          <View
            style={[
              styles.barTrack,
              {
                height: RANK_BAR_HEIGHT,
                backgroundColor: RANK_BAR_BACKGROUND_COLOR,
                borderRadius: RANK_BAR_RADIUS,
              },
            ]}
          >
            <GradientBar
              progress={clampedProgress}
              height={RANK_BAR_HEIGHT}
              radius={RANK_BAR_RADIUS}
              startColor={RANK_BAR_GRADIENT_START}
              endColor={RANK_BAR_GRADIENT_END}
            />
          </View>
        </View>
      </View>
    </View>
  );
});

function GradientBar({
  progress,
  height,
  radius,
  startColor,
  endColor,
}: {
  progress: number;
  height: number;
  radius: number;
  startColor: string;
  endColor: string;
}) {
  if (progress <= 0) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: radius }]}>
      <Svg width="100%" height={height}>
        <Defs>
          <SvgLinearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={startColor} />
            <Stop offset="1" stopColor={endColor} />
          </SvgLinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={`${progress * 100}%`}
          height={height}
          fill="url(#barGrad)"
        />
      </Svg>
    </View>
  );
}

function GradientText({
  text,
  fontSize,
  startColor,
  endColor,
  offsetX,
  offsetY,
}: {
  text: string;
  fontSize: number;
  startColor: string;
  endColor: string;
  offsetX: number;
  offsetY: number;
}) {
  const svgH = fontSize + 6;
  const textLen = text.length * fontSize * 0.65;
  const svgW = Math.max(textLen, 80);

  return (
    <View
      style={{
        transform: [{ translateX: offsetX }, { translateY: offsetY }],
      }}
    >
      <Svg width={svgW} height={svgH}>
        <Defs>
          <SvgLinearGradient id="nextRankGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={startColor} />
            <Stop offset="1" stopColor={endColor} />
          </SvgLinearGradient>
        </Defs>
        <SvgText
          fill="url(#nextRankGrad)"
          fontSize={fontSize}
          fontWeight="700"
          x={svgW}
          y={fontSize}
          textAnchor="end"
        >
          {text}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  blockWrap: {
    alignSelf: 'stretch',
  },
  container: {},
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  currentRank: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  barWrap: {},
  barTrack: {
    width: '100%',
    overflow: 'hidden',
  },
});
