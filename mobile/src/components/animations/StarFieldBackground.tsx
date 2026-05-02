/**
 * StarFieldBackground
 *
 * Static dark background with subtle twinkling stars — visually matches the
 * background of the WebView welcome animation (`clan-entry.html`). Use it as
 * a placeholder while the animation assets / WebView are loading, or as the
 * gating screen for tabs while auth state is settling, so the user never
 * sees a transition from black ↔ stars ↔ animation.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_COLOR },
  star: { position: 'absolute', backgroundColor: '#ffffff' },
});
