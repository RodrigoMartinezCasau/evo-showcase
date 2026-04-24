import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
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

  RANK_TEXT_BLACK_COLOR,
  RANK_PROGRESS_VALUE,
} from '@evoconn/constants/personalProfileLayout';
import { CLAN_REVEAL_MIN_REFLECTIONS } from '@evoconn/utils/getRankFromPct';

/**
 * All gradient stop-colors are STATIC strings defined once at module load.
 * Never computed dynamically — avoids react-native-svg color-reprocessing crash
 * ("Property 'r' doesn't exist") when stopColor changes between renders.
 *
 * Direction key: clans listed here go primary→secondary; all others are reversed.
 */
const NORMAL_DIR = new Set(['humanista', 'estoico']);

type GradPair = readonly [string, string]; // [start, end]

const CLAN_GRAD: Record<string, GradPair> = {
  'sin_clan':          ['#c7ff02', '#a8d600'],
  'nihilista':         ['#535147', '#bdb29c'],
  'cientista':         ['#54d5cf', '#fdfef0'],
  'estoico':           ['#818a41', '#444827'],   // normal dir
  'existencialista':   ['#f9bc4b', '#c93a39'],
  'trascendentalista': ['#e4de5b', '#cb6ce6'],
  'humanista':         ['#efb318', '#d08733'],   // normal dir
  'realista':          ['#f9a666', '#a2a3a8'],
  'racionalista':      ['#46b8f9', '#395df2'],
};

const RANK_ORDER: Rank[] = ['aprendiz', 'maestro', 'filosofo'];
const RANK_LABELS: Record<Rank, string> = {
  aprendiz: 'Aprendiz',
  maestro: 'Maestro',
  filosofo: 'Filósofo',
};

type Props = {
  rank: Rank;
  progress?: number;
  onPress?: () => void;
  /** Pass the user's clanId. When null the bar shows sin-clan progression. */
  clanId?: string | null;
  /** Total reflections — used to compute sin-clan bar fill. */
  totalReflections?: number;
};

/**
 * All dimensions are computed from constants — no useState, no onLayout,
 * no nested scaleY transforms. The layout footprint is 100 % deterministic.
 *
 * When `clanId === null` the bar switches to "Sin Clan → Nuevo Clan" mode:
 * progress is calculated from totalReflections / CLAN_REVEAL_MIN_REFLECTIONS.
 */
export const PersonalRankProgression = React.memo(function PersonalRankProgression({
  rank,
  progress = RANK_PROGRESS_VALUE,
  onPress,
  clanId = undefined,
  totalReflections = 0,
}: Props) {
  const { width: screenW } = useWindowDimensions();

  const isSinClan = clanId === null;

  // Sin-clan mode: progress toward clan assignment (0 → 30 reflections)
  const sinClanProgress = isSinClan
    ? Math.min(1, totalReflections / CLAN_REVEAL_MIN_REFLECTIONS)
    : null;

  const currentIndex = RANK_ORDER.indexOf(rank);
  const nextRank =
    currentIndex < RANK_ORDER.length - 1
      ? RANK_ORDER[currentIndex + 1]
      : RANK_ORDER[currentIndex];
  const isMaxRank = currentIndex === RANK_ORDER.length - 1;
  const clampedProgress = isSinClan
    ? sinClanProgress!
    : isMaxRank ? 1 : Math.max(0, Math.min(1, progress));

  const currentLabel = isSinClan ? 'SIN CLAN' : RANK_LABELS[rank].toUpperCase();
  // At max rank (Filósofo) show the clan name on the right instead of repeating "FILÓSOFO"
  const clanDisplayName = clanId ? clanId.charAt(0).toUpperCase() + clanId.slice(1).toLowerCase() : '';
  const nextLabel = isSinClan
    ? 'NUEVO CLAN'
    : (isMaxRank && clanDisplayName)
      ? clanDisplayName.toUpperCase()
      : RANK_LABELS[nextRank].toUpperCase();

  // Resolve the gradient key → look up static stop-color pair
  const gradKey = isSinClan
    ? 'sin_clan'
    : (clanId && CLAN_GRAD[clanId] ? clanId : 'sin_clan');
  const [gradStart, gradEnd] = CLAN_GRAD[gradKey] ?? CLAN_GRAD['sin_clan'];
  const barFillId = `rpBarFill_${gradKey}`;
  const txtGradId = `rpTxtGrad_${gradKey}`;

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
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={onPress ? 0.8 : 1}
        disabled={!onPress}
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
              {/* All clan gradients defined statically — stopColor never changes */}
              <SvgLinearGradient id="rpBarFill_sin_clan"          x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#c7ff02" /><Stop offset="1" stopColor="#a8d600" /></SvgLinearGradient>
              <SvgLinearGradient id="rpBarFill_nihilista"         x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#535147" /><Stop offset="1" stopColor="#bdb29c" /></SvgLinearGradient>
              <SvgLinearGradient id="rpBarFill_cientista"         x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#54d5cf" /><Stop offset="1" stopColor="#fdfef0" /></SvgLinearGradient>
              <SvgLinearGradient id="rpBarFill_estoico"           x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#818a41" /><Stop offset="1" stopColor="#444827" /></SvgLinearGradient>
              <SvgLinearGradient id="rpBarFill_existencialista"   x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#f9bc4b" /><Stop offset="1" stopColor="#c93a39" /></SvgLinearGradient>
              <SvgLinearGradient id="rpBarFill_trascendentalista" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#e4de5b" /><Stop offset="1" stopColor="#cb6ce6" /></SvgLinearGradient>
              <SvgLinearGradient id="rpBarFill_humanista"         x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#efb318" /><Stop offset="1" stopColor="#d08733" /></SvgLinearGradient>
              <SvgLinearGradient id="rpBarFill_realista"          x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#f9a666" /><Stop offset="1" stopColor="#a2a3a8" /></SvgLinearGradient>
              <SvgLinearGradient id="rpBarFill_racionalista"      x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#46b8f9" /><Stop offset="1" stopColor="#395df2" /></SvgLinearGradient>
              {/* Text gradients — same palette as bar fill */}
              <SvgLinearGradient id="rpTxtGrad_sin_clan"          x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#c7ff02" /><Stop offset="1" stopColor="#a8d600" /></SvgLinearGradient>
              <SvgLinearGradient id="rpTxtGrad_nihilista"         x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#535147" /><Stop offset="1" stopColor="#bdb29c" /></SvgLinearGradient>
              <SvgLinearGradient id="rpTxtGrad_cientista"         x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#54d5cf" /><Stop offset="1" stopColor="#fdfef0" /></SvgLinearGradient>
              <SvgLinearGradient id="rpTxtGrad_estoico"           x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#818a41" /><Stop offset="1" stopColor="#444827" /></SvgLinearGradient>
              <SvgLinearGradient id="rpTxtGrad_existencialista"   x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#f9bc4b" /><Stop offset="1" stopColor="#c93a39" /></SvgLinearGradient>
              <SvgLinearGradient id="rpTxtGrad_trascendentalista" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#e4de5b" /><Stop offset="1" stopColor="#cb6ce6" /></SvgLinearGradient>
              <SvgLinearGradient id="rpTxtGrad_humanista"         x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#efb318" /><Stop offset="1" stopColor="#d08733" /></SvgLinearGradient>
              <SvgLinearGradient id="rpTxtGrad_realista"          x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#f9a666" /><Stop offset="1" stopColor="#a2a3a8" /></SvgLinearGradient>
              <SvgLinearGradient id="rpTxtGrad_racionalista"      x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#46b8f9" /><Stop offset="1" stopColor="#395df2" /></SvgLinearGradient>
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
                fill={`url(#${barFillId})`}
              />
            )}

            {/* Gradient text — visible where bar is NOT filled */}
            <SvgText
              x={RANK_CURRENT_INSIDE_OFFSET_X}
              y={dims.textY + RANK_CURRENT_INSIDE_OFFSET_Y}
              fontSize={RANK_CURRENT_FONT_SIZE * RANK_CURRENT_INSIDE_SCALE}
              fontWeight="700"
              fill={`url(#${txtGradId})`}
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
              fill={`url(#${txtGradId})`}
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
      </TouchableOpacity>
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
