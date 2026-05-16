/**
 * StarFieldBackground
 *
 * Static dark background with subtle twinkling stars — visually matches the
 * background of the WebView welcome animation (`clan-entry.html`). Use it as
 * a placeholder while the animation assets / WebView are loading, or as the
 * gating screen for tabs while auth state is settling, so the user never
 * sees a transition from black ↔ stars ↔ animation.
 *
 * `PanelStarField` is the lightweight variant: configurable panel fill, pointerEvents none,
 * absoluteFill — overlay it inside any dark panel (feed: Siguiendo vs Para ti use different fills).
 */
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Animated, Easing, useWindowDimensions, LayoutChangeEvent } from 'react-native';

const STAR_COUNT = 28;
const BG_COLOR = '#0f0f12';

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function Star({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const opacity = React.useRef(new Animated.Value(0.2)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1200,
          delay,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, delay]);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
        },
      ]}
    />
  );
}

export default function StarFieldBackground({ children }: { children?: React.ReactNode }) {
  const { width, height } = useWindowDimensions();

  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, i) => ({
        x: pseudoRandom(i * 2 + 1) * width,
        y: pseudoRandom(i * 2 + 2) * height,
        size: 1.5 + pseudoRandom(i * 3 + 7) * 1.5,
        delay: Math.floor(pseudoRandom(i * 4 + 11) * 1800),
      })),
    [width, height],
  );

  return (
    <View style={styles.root}>
      {stars.map((s, i) => (
        <Star key={i} x={s.x} y={s.y} size={s.size} delay={s.delay} />
      ))}
      {children}
    </View>
  );
}

/**
 * Lightweight overlay variant: solid panel fill (configurable), absoluteFill, pointerEvents none.
 * Drop it inside any dark panel to get the same twinkling-stars effect.
 * Star count and seed offset are separate from StarFieldBackground so both
 * can coexist on screen without duplicating positions.
 */
const PANEL_STAR_COUNT = 18;
const PANEL_SEED_OFFSET = 500;
/** Default: clan card inner panel (`#0d0d11`) — e.g. Siguiendo / detail. */
export const PANEL_STAR_SURFACE_DEFAULT = '#0d0d11';

type PanelStarFieldProps = {
  /** Panel fill behind stars. Para ti feed uses app background; Siguiendo uses inner gray. */
  surfaceColor?: string;
};

export function PanelStarField({ surfaceColor = PANEL_STAR_SURFACE_DEFAULT }: PanelStarFieldProps) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDims(prev =>
      prev?.w === width && prev?.h === height ? prev : { w: width, h: height },
    );
  };

  const stars = useMemo(() => {
    if (!dims) return [];
    return Array.from({ length: PANEL_STAR_COUNT }, (_, i) => ({
      x: pseudoRandom((i + PANEL_SEED_OFFSET) * 2 + 1) * dims.w,
      y: pseudoRandom((i + PANEL_SEED_OFFSET) * 2 + 2) * dims.h,
      size: 1.2 + pseudoRandom((i + PANEL_SEED_OFFSET) * 3 + 7) * 1.4,
      delay: Math.floor(pseudoRandom((i + PANEL_SEED_OFFSET) * 4 + 11) * 2200),
    }));
  }, [dims]);

  return (
    <View
      style={[styles.panelOverlay, { backgroundColor: surfaceColor }]}
      pointerEvents="none"
      onLayout={handleLayout}
    >
      {stars.map((s, i) => (
        <Star key={i} x={s.x} y={s.y} size={s.size} delay={s.delay} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_COLOR },
  star: { position: 'absolute', backgroundColor: '#ffffff' },
  panelOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
