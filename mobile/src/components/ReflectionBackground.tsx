import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { REFLECTION_BACKGROUND_LAYOUT as L } from '@evoconn/constants/reflectionBackgroundLayout';
import { getReflectionBackgroundByHouse } from '@evoconn/utils/getReflectionBackgroundByHouse';
import { getClanColor } from '@evoconn/constants/clanColors';

// ── Clan rim constants ────────────────────────────────────────────────────────
const RIM_WIDTH = 1.8;
/** Length of the straight arm from each corner (pt). */
const RIM_ARM   = 52;

/** Blend a #RRGGBB color 55 % toward white to produce a brighter highlight. */
function lightenHex(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#ffffff';
  const blend = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.55));
  const x = (c: number) => blend(parseInt(h.slice(c, c + 2), 16)).toString(16).padStart(2, '0');
  return `#${x(0)}${x(2)}${x(4)}`;
}

/** Two glowing arcs at opposite corners — color adapts to the post's clan. */
function ClanRimOverlay({ width, height, clanColor }: { width: number; height: number; clanColor: string }) {
  const r   = L.borderRadius;
  const a   = RIM_ARM;
  const w   = width;
  const h   = height;
  const hl  = lightenHex(clanColor);
  // Gradient IDs are scoped per <Svg> in react-native-svg, but include the color
  // slug for clarity when debugging.
  const slug = clanColor.replace('#', '');
  const idTL = `rimTL_${slug}`;
  const idBR = `rimBR_${slug}`;

  // Top-left:     vertical arm → arc → horizontal arm
  const tlD = `M 0 ${r + a} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 L ${r + a} 0`;
  // Bottom-right: vertical arm → arc → horizontal arm
  const brD = `M ${w} ${h - r - a} L ${w} ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} L ${w - r - a} ${h}`;

  // IMPORTANT: pointerEvents must be set on the View wrapper, NOT on <Svg>.
  // react-native-svg does not forward pointerEvents to the native touch system.
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={idTL} x1={0} y1={r + a} x2={r + a} y2={0} gradientUnits="userSpaceOnUse">
            <Stop offset="0"   stopColor={clanColor} stopOpacity={0}    />
            <Stop offset="0.3" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="0.5" stopColor={hl}        stopOpacity={1}    />
            <Stop offset="0.7" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="1"   stopColor={clanColor} stopOpacity={0}    />
          </LinearGradient>
          <LinearGradient id={idBR} x1={w} y1={h - r - a} x2={w - r - a} y2={h} gradientUnits="userSpaceOnUse">
            <Stop offset="0"   stopColor={clanColor} stopOpacity={0}    />
            <Stop offset="0.3" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="0.5" stopColor={hl}        stopOpacity={1}    />
            <Stop offset="0.7" stopColor={clanColor} stopOpacity={0.85} />
            <Stop offset="1"   stopColor={clanColor} stopOpacity={0}    />
          </LinearGradient>
        </Defs>
        <Path d={tlD} fill="none" stroke={`url(#${idTL})`} strokeWidth={RIM_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={brD} fill="none" stroke={`url(#${idBR})`} strokeWidth={RIM_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
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
  const clanColor = useMemo(() => getClanColor(clan), [clan]);

  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDims(prev =>
      prev?.width === width && prev?.height === height ? prev : { width, height },
    );
  }, []);

  return (
    <View style={styles.root} onLayout={handleLayout}>
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
      {dims ? (
        <ClanRimOverlay width={dims.width} height={dims.height} clanColor={clanColor} />
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
