import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { REFLECTION_BACKGROUND_LAYOUT as L } from '@evoconn/constants/reflectionBackgroundLayout';
import { getReflectionBackgroundByHouse } from '@evoconn/utils/getReflectionBackgroundByHouse';

// ── Sin-clan rim constants ────────────────────────────────────────────────────
const RIM_COLOR     = '#c7ff02';
const RIM_HIGHLIGHT = '#e8ff99';
const RIM_WIDTH     = 1.8;
/** Longitud del tramo recto desde cada esquina (pt). */
const RIM_ARM       = 52;

/** Dos arcos brillantes en esquinas opuestas, al estilo del widget iOS. */
function NoClanRimOverlay({ width, height }: { width: number; height: number }) {
  const r = L.borderRadius;
  const a = RIM_ARM;
  const w = width;
  const h = height;

  // Superior izquierda: brazo vertical → arco → brazo horizontal
  const tlD = `M 0 ${r + a} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 L ${r + a} 0`;
  // Inferior derecha: brazo vertical → arco → brazo horizontal
  const brD = `M ${w} ${h - r - a} L ${w} ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} L ${w - r - a} ${h}`;

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={w}
      height={h}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient
          id="noClanRimTL"
          x1={0} y1={r + a}
          x2={r + a} y2={0}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0"   stopColor={RIM_COLOR}     stopOpacity={0}    />
          <Stop offset="0.3" stopColor={RIM_COLOR}     stopOpacity={0.85} />
          <Stop offset="0.5" stopColor={RIM_HIGHLIGHT} stopOpacity={1}    />
          <Stop offset="0.7" stopColor={RIM_COLOR}     stopOpacity={0.85} />
          <Stop offset="1"   stopColor={RIM_COLOR}     stopOpacity={0}    />
        </LinearGradient>
        <LinearGradient
          id="noClanRimBR"
          x1={w}     y1={h - r - a}
          x2={w - r - a} y2={h}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0"   stopColor={RIM_COLOR}     stopOpacity={0}    />
          <Stop offset="0.3" stopColor={RIM_COLOR}     stopOpacity={0.85} />
          <Stop offset="0.5" stopColor={RIM_HIGHLIGHT} stopOpacity={1}    />
          <Stop offset="0.7" stopColor={RIM_COLOR}     stopOpacity={0.85} />
          <Stop offset="1"   stopColor={RIM_COLOR}     stopOpacity={0}    />
        </LinearGradient>
      </Defs>
      <Path
        d={tlD}
        fill="none"
        stroke="url(#noClanRimTL)"
        strokeWidth={RIM_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={brD}
        fill="none"
        stroke="url(#noClanRimBR)"
        strokeWidth={RIM_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type ReflectionBackgroundProps = {
  clan: string | null | undefined;
  children: React.ReactNode;
};

/**
 * Wrapper that renders the clan-specific SVG background behind its children.
 * Use as:  <ReflectionBackground clan={clanId}>{content}</ReflectionBackground>
 */
export const ReflectionBackground = React.memo(function ReflectionBackground({ clan, children }: ReflectionBackgroundProps) {
  const BgIcon    = useMemo(() => getReflectionBackgroundByHouse(clan), [clan]);
  const isNoClan  = !clan || String(clan).trim() === '';

  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDims(prev =>
      prev?.width === width && prev?.height === height ? prev : { width, height },
    );
  }, []);

  return (
    <View style={styles.root} onLayout={isNoClan ? handleLayout : undefined}>
      <View
        pointerEvents="none"
        style={[styles.bgClip, { borderRadius: L.borderRadius }]}
      >
        <View
          style={[
            styles.bgInner,
            {
              transform: [
                { translateX: L.offsetX },
                { translateY: L.offsetY },
                { scale: L.scale },
              ],
            },
          ]}
        >
          <BgIcon width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
        </View>
      </View>
      {children}
      {isNoClan && dims ? (
        <NoClanRimOverlay width={dims.width} height={dims.height} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  bgClip: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  bgInner: {
    flex: 1,
  },
});
