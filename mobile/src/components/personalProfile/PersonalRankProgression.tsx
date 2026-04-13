import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
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

/**
 * All dimensions are computed from constants — no useState, no onLayout,
 * no nested scaleY transforms. The layout footprint is 100 % deterministic.
 */
export const PersonalRankProgression = React.memo(function PersonalRankProgression({
  rank,
  progress = RANK_PROGRESS_VALUE,
}: Props) {
  const { width: screenW } = useWindowDimensions();

  const currentIndex = RANK_ORDER.indexOf(rank);
  const nextRank =
    currentIndex < RANK_ORDER.length - 1
      ? RANK_ORDER[currentIndex + 1]
      : RANK_ORDER[currentIndex];
  const isMaxRank = currentIndex === RANK_ORDER.length - 1;
  const clampedProgress = isMaxRank ? 1 : Math.max(0, Math.min(1, progress));

  const currentLabel = RANK_LABELS[rank].toUpperCase();
  const nextLabel = RANK_LABELS[nextRank].toUpperCase();

  // ── All pixel values computed once, no async measurement ──────────
  const dims = useMemo(() => {
    const containerInnerW =
      RANK_CONTAINER_WIDTH !== undefined
        ? RANK_CONTAINER_WIDTH - RANK_CONTAINER_PADDING_HORIZONTAL * 2
        : screenW - RANK_CONTAINER_MARGIN_HORIZONTAL * 2 - RANK_CONTAINER_PADDING_HORIZONTAL * 2;

    // scaleY editors applied as direct pixel adjustments — no CSS transform
    const paddingV = RANK_CONTAINER_PADDING_VERTICAL * RANK_CONTAINER_SCALE_Y;
    const visualBarThickness = RANK_BAR_THICKNESS * RANK_BAR_SCALE_Y;

    // The SVG area keeps full RANK_BAR_HEIGHT so text is not compressed
    const svgH = RANK_BAR_HEIGHT;
    const blockH = paddingV * 2 + svgH;
    const fillW = containerInnerW * clampedProgress;
    const barY = (svgH - visualBarThickness) / 2;
    const textY = svgH / 2;

    return {
      containerInnerW,
      paddingV,
      visualBarThickness,
      svgH,
      blockH,
      fillW,
      barY,
      textY,
    };
  }, [screenW, clampedProgress]);

  return (
    <View
      style={[
        styles.blockWrap,
        {
          height: dims.blockH,
          marginTop: RANK_BLOCK_MARGIN_TOP,
          marginBottom: RANK_BLOCK_MARGIN_BOTTOM,
          marginHorizontal: RANK_CONTAINER_MARGIN_HORIZONTAL,
          transform: [
            { translateX: RANK_BLOCK_OFFSET_X },
            { translateY: RANK_BLOCK_OFFSET_Y },
            { scale: RANK_BLOCK_SCALE },
            { scaleY: RANK_BLOCK_SCALE_Y },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            height: dims.blockH,
            backgroundColor: RANK_CONTAINER_COLOR,
            borderRadius: RANK_CONTAINER_BORDER_RADIUS,
            paddingVertical: dims.paddingV,
            paddingHorizontal: RANK_CONTAINER_PADDING_HORIZONTAL,
          },
          RANK_CONTAINER_WIDTH !== undefined && {
            width: RANK_CONTAINER_WIDTH,
            alignSelf: 'center' as const,
          },
        ]}
      >
        <View
          style={{
            height: dims.svgH,
            transform: [{ translateY: RANK_BAR_OFFSET_Y }],
          }}
        >
          <Svg width={dims.containerInnerW} height={dims.svgH}>
            <Defs>
              <SvgLinearGradient id="rpBarFill" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={RANK_BAR_GRADIENT_START} />
                <Stop offset="1" stopColor={RANK_BAR_GRADIENT_END} />
              </SvgLinearGradient>
              <SvgLinearGradient id="rpTxtGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={RANK_NEXT_GRADIENT_START} />
                <Stop offset="1" stopColor={RANK_NEXT_GRADIENT_END} />
              </SvgLinearGradient>
              <ClipPath id="rpClipEmpty">
                <Rect
                  x={dims.fillW}
                  y={0}
                  width={dims.containerInnerW - dims.fillW}
                  height={dims.svgH}
                />
              </ClipPath>
              {dims.fillW > 0 && (
                <ClipPath id="rpClipFill">
                  <Rect x={0} y={0} width={dims.fillW} height={dims.svgH} />
                </ClipPath>
              )}
            </Defs>

            {/* Track background */}
            <Rect
              x={0}
              y={dims.barY}
              width={dims.containerInnerW}
              height={dims.visualBarThickness}
              rx={RANK_BAR_RADIUS}
              ry={RANK_BAR_RADIUS}
              fill={RANK_BAR_BACKGROUND_COLOR}
            />

            {/* Gradient fill */}
            {dims.fillW > 0 && (
              <Rect
                x={0}
                y={dims.barY}
                width={dims.fillW}
                height={dims.visualBarThickness}
                rx={RANK_BAR_RADIUS}
                ry={RANK_BAR_RADIUS}
                fill="url(#rpBarFill)"
              />
            )}

            {/* Gradient text — visible where bar is NOT filled */}
            <SvgText
              x={RANK_CURRENT_INSIDE_OFFSET_X}
              y={dims.textY + RANK_CURRENT_INSIDE_OFFSET_Y}
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
              x={dims.containerInnerW + RANK_NEXT_INSIDE_OFFSET_X}
              y={dims.textY + RANK_NEXT_INSIDE_OFFSET_Y}
              fontSize={RANK_NEXT_FONT_SIZE * RANK_NEXT_INSIDE_SCALE}
              fontWeight="700"
              fill="url(#rpTxtGrad)"
              clipPath="url(#rpClipEmpty)"
              textAnchor="end"
              alignmentBaseline="central"
            >
              {nextLabel}
            </SvgText>

            {/* Black text — visible where bar IS filled */}
            {dims.fillW > 0 && (
              <>
                <SvgText
                  x={RANK_CURRENT_INSIDE_OFFSET_X}
                  y={dims.textY + RANK_CURRENT_INSIDE_OFFSET_Y}
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
                  x={dims.containerInnerW + RANK_NEXT_INSIDE_OFFSET_X}
                  y={dims.textY + RANK_NEXT_INSIDE_OFFSET_Y}
                  fontSize={RANK_NEXT_FONT_SIZE * RANK_NEXT_INSIDE_SCALE}
                  fontWeight="700"
                  fill={RANK_TEXT_BLACK_COLOR}
                  clipPath="url(#rpClipFill)"
                  textAnchor="end"
                  alignmentBaseline="central"
                >
                  {nextLabel}
                </SvgText>
              </>
            )}
          </Svg>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  blockWrap: {
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  container: {
    overflow: 'hidden',
  },
});
