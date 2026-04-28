/**
 * ClanEntryAnimation
 *
 * Variante A — Sin clan (clanId === null | 'none'):
 *   Estrella base fade-in → círculo de 8 estrellas → giro acelerado → zoom fill
 *
 * Variante B — Con clan:
 *   Estrella base → estrella del clan (blur dissolve) → animal → flash fill
 *
 * Uso típico en la sesión de tabs:
 *   const [done, setDone] = useState(false);
 *   if (!done) return <ClanEntryAnimation clanId={userClan} onComplete={() => setDone(true)} />;
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

import {
  ANIM_CLANS,
  ANIM_CLAN_IDS,
  CIRCLE_POSITIONS,
  type AnimClanId,
} from '../../constants/evoAnimationClans';

const { width: W, height: H } = Dimensions.get('window');

// ─── Star field ───────────────────────────────────────────────────────────────
function StarField({ seed = 0 }: { seed?: number }) {
  const stars = React.useMemo(() => {
    const rng = (i: number) => {
      const x = Math.sin((i + seed) * 9999) * 10000;
      return x - Math.floor(x);
    };
    return Array.from({ length: 24 }).map((_, i) => ({
      x: rng(i * 2) * 100,
      y: rng(i * 2 + 1) * 100,
      size: rng(i * 3) * 2 + 1,
      opacity: 0.15 + rng(i * 4) * 0.4,
    }));
  }, [seed]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${s.x}%` as `${number}%`,
            top: `${s.y}%` as `${number}%`,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: '#fff',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ─── Variante A — Sin clan ────────────────────────────────────────────────────
function NoClanEntry({
  onComplete,
  runKey = 0,
}: {
  onComplete?: () => void;
  runKey?: number;
}) {
  const baseOp = useSharedValue(0);
  const baseScale = useSharedValue(1);
  const starsOp = useSharedValue(0);
  const starsScale = useSharedValue(0.15);

  const circleRotation = useRef(0);
  const circleViewRef = useRef<View>(null);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    baseOp.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.ease),
    });

    const t1 = setTimeout(() => {
      baseOp.value = withTiming(0, { duration: 800 });
      baseScale.value = withTiming(1.6, { duration: 800 });
      starsOp.value = withTiming(1, { duration: 557 });
      starsScale.value = withTiming(1, { duration: 435 });
    }, 1113);

    const t2 = setTimeout(() => {
      const start = Date.now();
      const spin = () => {
        const elapsed = (Date.now() - start) / 1000;
        circleRotation.current +=
          (0.3 + (5 - 0.3) * Math.min(elapsed / 2.7, 1)) * 0.36;
        if (circleViewRef.current) {
          (circleViewRef.current as unknown as { setNativeProps: (s: object) => void }).setNativeProps({
            style: { transform: [{ rotate: `${circleRotation.current}deg` }] },
          });
        }
        if (elapsed < 2.7) {
          rafRef.current = requestAnimationFrame(spin);
        } else {
          setTimeout(() => {
            starsScale.value = withTiming(5, {
              duration: 1739,
              easing: Easing.in(Easing.ease),
            });
            starsOp.value = withTiming(0, { duration: 1200 });
            setTimeout(() => onComplete?.(), 1800);
          }, 521);
        }
      };
      rafRef.current = requestAnimationFrame(spin);
    }, 1809);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [runKey]);

  const baseStyle = useAnimatedStyle(() => ({
    opacity: baseOp.value,
    transform: [{ scale: baseScale.value }],
  }));
  const starsStyle = useAnimatedStyle(() => ({
    opacity: starsOp.value,
    transform: [{ scale: starsScale.value }],
  }));

  return (
    <View style={styles.root}>
      <StarField seed={1} />

      {/* Base star (sin clan) */}
      <Animated.View style={[styles.center, baseStyle]}>
        {React.createElement(ANIM_CLANS.none.StarComponent, { width: 180, height: 180 })}
      </Animated.View>

      {/* 8 clan stars in circle */}
      <Animated.View style={[styles.center, starsStyle]}>
        <View ref={circleViewRef} style={{ transform: [{ rotate: '0deg' }] }}>
          {ANIM_CLAN_IDS.map((id, i) => {
            const { StarComponent } = ANIM_CLANS[id];
            const pos = CIRCLE_POSITIONS[i];
            return (
              <View
                key={id}
                style={[styles.circleItem, { left: pos.x - 33, top: pos.y - 33 }]}
              >
                <StarComponent width={66} height={66} />
              </View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Variante B — Con clan ────────────────────────────────────────────────────
function WithClanEntry({
  clanId,
  onComplete,
  runKey = 0,
}: {
  clanId: Exclude<AnimClanId, 'none'>;
  onComplete?: () => void;
  runKey?: number;
}) {
  const c = ANIM_CLANS[clanId] ?? ANIM_CLANS.estoico;

  const baseOp = useSharedValue(0);
  const clanOp = useSharedValue(0);
  const clanScale = useSharedValue(0.9);
  const bgOp = useSharedValue(0);
  const flashOp = useSharedValue(0);

  useEffect(() => {
    baseOp.value = 0;
    clanOp.value = 0;
    clanScale.value = 0.9;
    bgOp.value = 0;
    flashOp.value = 0;

    baseOp.value = withTiming(1, { duration: 800 });

    const t1 = setTimeout(() => {
      baseOp.value = withTiming(0, { duration: 800 });
      clanOp.value = withTiming(1, { duration: 720 });
      clanScale.value = withTiming(1, {
        duration: 880,
        easing: Easing.out(Easing.ease),
      });
      bgOp.value = withTiming(0.3, { duration: 800 });
    }, 1280);

    const t2 = setTimeout(() => {
      clanOp.value = withTiming(0, { duration: 720 });
      clanScale.value = withTiming(0, {
        duration: 880,
        easing: Easing.in(Easing.ease),
      });
      bgOp.value = withTiming(0.42, { duration: 600 });
    }, 2560);

    // No animal assets yet — skip to flash phase early
    const t3 = setTimeout(() => {
      bgOp.value = withTiming(1, { duration: 400 });
      flashOp.value = withTiming(0.65, { duration: 400 });
    }, 5600);

    const t4 = setTimeout(() => onComplete?.(), 6160);

    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
    };
  }, [runKey, clanId]);

  const baseStyle = useAnimatedStyle(() => ({ opacity: baseOp.value }));
  const clanStyle = useAnimatedStyle(() => ({
    opacity: clanOp.value,
    transform: [{ scale: clanScale.value }],
  }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOp.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOp.value }));

  return (
    <View style={styles.root}>
      <StarField seed={clanId.length} />

      {/* Clan background fill */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: c.primary },
          bgStyle,
        ]}
        pointerEvents="none"
      />

      {/* Base star */}
      <Animated.View style={[styles.center, baseStyle]}>
        {React.createElement(ANIM_CLANS.none.StarComponent, { width: 180, height: 180 })}
      </Animated.View>

      {/* Clan star */}
      <Animated.View style={[styles.center, clanStyle]}>
        {React.createElement(c.StarComponent, { width: 180, height: 180 })}
      </Animated.View>

      {/* Flash */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: c.primary },
          flashStyle,
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface ClanEntryAnimationProps {
  clanId: AnimClanId | null;
  onComplete?: () => void;
  /** Increment to re-run the animation from the start */
  runKey?: number;
}

export default function ClanEntryAnimation({
  clanId,
  onComplete,
  runKey = 0,
}: ClanEntryAnimationProps) {
  if (!clanId || clanId === 'none') {
    return <NoClanEntry onComplete={onComplete} runKey={runKey} />;
  }
  return (
    <WithClanEntry
      clanId={clanId as Exclude<AnimClanId, 'none'>}
      onComplete={onComplete}
      runKey={runKey}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f0f12',
    overflow: 'hidden',
  },
  center: {
    position: 'absolute',
    left: W / 2 - 90,
    top: H / 2 - 90,
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleItem: {
    position: 'absolute',
    width: 66,
    height: 66,
  },
  starLg: { width: 180, height: 180 },
  starSm: { width: 66, height: 66 },
});
