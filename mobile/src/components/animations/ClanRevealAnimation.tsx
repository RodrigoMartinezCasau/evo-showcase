/**
 * ClanRevealAnimation
 *
 * Secuencia interactiva de revelación de clan:
 *   FADEIN → TAPPING (3 toques) → SPINNING (círculo + flash)
 *   → REVEAL (estrella del clan) → ENTRY (variante B) → FINAL (nombre + botón)
 *
 * Uso:
 *   <ClanRevealAnimation clanId="estoico" onComplete={() => router.replace('/(tabs)')} />
 *   <ClanRevealAnimation clanId="estoico" previousClanId="nihilista" isChange onComplete={...} />
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import {
  ANIM_CLANS,
  ANIM_CLAN_IDS,
  CIRCLE_POSITIONS,
  ANIM_COLORS,
  type AnimClanId,
} from '../../constants/evoAnimationClans';

const { width: W, height: H } = Dimensions.get('window');
const C = ANIM_COLORS;

type Phase = 'fadein' | 'tapping' | 'spinning' | 'reveal' | 'entry' | 'final';

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

// ─── Tap progress dots ────────────────────────────────────────────────────────
function TapDots({ count, color }: { count: number; color: string }) {
  return (
    <View style={styles.tapDots}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.tapDot,
            {
              backgroundColor:
                i < count ? color : 'rgba(255,255,255,0.18)',
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export interface ClanRevealAnimationProps {
  clanId: Exclude<AnimClanId, 'none'>;
  previousClanId?: Exclude<AnimClanId, 'none'>;
  isChange?: boolean;
  onComplete?: () => void;
}

export default function ClanRevealAnimation({
  clanId,
  previousClanId,
  isChange = false,
  onComplete,
}: ClanRevealAnimationProps) {
  const c = ANIM_CLANS[clanId] ?? ANIM_CLANS.estoico;
  const prevC = previousClanId ? ANIM_CLANS[previousClanId] : null;
  const PrevStarComponent = prevC?.StarComponent ?? ANIM_CLANS.none.StarComponent;

  const [phase, setPhase] = useState<Phase>('fadein');
  const [taps, setTaps] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);

  // ── Animated values ──────────────────────────────────────────────────────
  const screenOp = useSharedValue(0);
  const baseStarOp = useSharedValue(1);
  const baseStarSc = useSharedValue(1);
  const shakeSc = useSharedValue(1);

  const circleOp = useSharedValue(0);
  const circleSc = useSharedValue(0.1);
  const flashOp = useSharedValue(0);

  const clanStarOp = useSharedValue(0);
  const clanStarSc = useSharedValue(0.9);
  const bgOp = useSharedValue(0);
  const finalOp = useSharedValue(0);

  const circleViewRef = useRef<View>(null);
  const circleRotation = useRef(0);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  // ── Phase 1: fade in ────────────────────────────────────────────────────
  useEffect(() => {
    screenOp.value = withTiming(1, {
      duration: 3400,
      easing: Easing.out(Easing.ease),
    });
    const t = setTimeout(() => setPhase('tapping'), 3500);
    return () => clearTimeout(t);
  }, []);

  // ── Shake on tap ────────────────────────────────────────────────────────
  useEffect(() => {
    if (shakeKey === 0) return;
    shakeSc.value = withSequence(
      withTiming(1.12, { duration: 60 }),
      withTiming(0.94, { duration: 60 }),
      withTiming(1.06, { duration: 60 }),
      withTiming(1.0, { duration: 60 }),
    );
  }, [shakeKey]);

  // ── Tap handler ─────────────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    if (phase !== 'tapping') return;
    const next = taps + 1;
    setTaps(next);
    setShakeKey((k) => k + 1);
    if (next >= 3) setTimeout(startSpinning, 350);
  }, [phase, taps]);

  // ── Phase 3: spinning ────────────────────────────────────────────────────
  function startSpinning() {
    setPhase('spinning');
    baseStarOp.value = withTiming(0, { duration: 800 });
    baseStarSc.value = withTiming(1.6, { duration: 800 });

    setTimeout(() => {
      circleOp.value = withTiming(1, { duration: 640 });
      circleSc.value = withTiming(1, {
        duration: 880,
        easing: Easing.out(Easing.back(1.2)),
      });
    }, 30);

    const t0 = Date.now();
    let last = t0;

    const tick = () => {
      const now = Date.now();
      const elapsed = (now - t0) / 1000;
      const dt = (now - last) / 1000;
      last = now;

      const progress = Math.min(elapsed / 3, 1);
      const rps = 0.3 + (5 - 0.3) * progress * progress;
      circleRotation.current += rps * 360 * dt;

      if (circleViewRef.current) {
        (circleViewRef.current as unknown as { setNativeProps: (s: object) => void }).setNativeProps({
          style: {
            transform: [{ rotate: `${circleRotation.current}deg` }],
          },
        });
      }

      // Quadratic flash
      flashOp.value = progress * progress * 0.96;

      if (elapsed < 3) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        beginReveal();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // ── Phase 4: reveal ──────────────────────────────────────────────────────
  function beginReveal() {
    setPhase('reveal');
    flashOp.value = withTiming(0, { duration: 700 });
    circleOp.value = withTiming(0, { duration: 400 });
    circleSc.value = withTiming(0, { duration: 400 });
    setTimeout(() => setPhase('entry'), 750);
  }

  // ── Phase 5: entry (mirrors ClanEntryAnimation variant B) ───────────────
  useEffect(() => {
    if (phase !== 'entry') return;

    clanStarOp.value = withTiming(1, { duration: 720 });
    clanStarSc.value = withTiming(1, {
      duration: 880,
      easing: Easing.out(Easing.ease),
    });
    bgOp.value = withTiming(0.3, { duration: 800 });

    const t1 = setTimeout(() => {
      clanStarOp.value = withTiming(0, { duration: 720 });
      clanStarSc.value = withTiming(0, {
        duration: 880,
        easing: Easing.in(Easing.ease),
      });
      bgOp.value = withTiming(0.42, { duration: 600 });
    }, 1280);

    // No animal yet — jump to flash
    const t2 = setTimeout(() => {
      bgOp.value = withTiming(1, { duration: 400 });
      flashOp.value = withTiming(0.65, { duration: 400 });
    }, 5600);

    const t3 = setTimeout(() => {
      setPhase('final');
      flashOp.value = withTiming(0, { duration: 300 });
      finalOp.value = withTiming(1, { duration: 600 });
    }, 6160);

    return () => {
      [t1, t2, t3].forEach(clearTimeout);
    };
  }, [phase]);

  // ── Animated styles ──────────────────────────────────────────────────────
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOp.value }));
  const baseStarStyle = useAnimatedStyle(() => ({
    opacity: baseStarOp.value,
    transform: [{ scale: baseStarSc.value * shakeSc.value }],
  }));
  const circleStyle = useAnimatedStyle(() => ({
    opacity: circleOp.value,
    transform: [{ scale: circleSc.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOp.value }));
  const clanStarStyle = useAnimatedStyle(() => ({
    opacity: clanStarOp.value,
    transform: [{ scale: clanStarSc.value }],
  }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOp.value }));
  const finalStyle = useAnimatedStyle(() => ({ opacity: finalOp.value }));

  const showBase =
    phase === 'fadein' || phase === 'tapping' || phase === 'spinning';
  const isFinal = phase === 'final';

  const tapLabel =
    taps === 0
      ? isChange
        ? 'Pulsa para conocer tu nuevo clan'
        : 'Pulsa para conocer tu clan filosófico'
      : taps === 1
        ? 'Dos veces más...'
        : 'Una vez más...';

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, screenStyle]}>
          <StarField seed={42} />

          {/* Clan bg fill */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: c.primary },
              bgStyle,
            ]}
            pointerEvents="none"
          />

          {/* Base / previous star */}
          {showBase && (
            <Animated.View style={[styles.center, baseStarStyle]}>
              <PrevStarComponent width={180} height={180} />
            </Animated.View>
          )}

          {/* Circle of 8 clan stars */}
          <Animated.View style={[styles.center, circleStyle]}>
            <View
              ref={circleViewRef}
              style={{ transform: [{ rotate: '0deg' }] }}
            >
              {ANIM_CLAN_IDS.map((id, i) => {
                const { StarComponent } = ANIM_CLANS[id];
                const pos = CIRCLE_POSITIONS[i];
                return (
                  <View
                    key={id}
                    style={{ position: 'absolute', left: pos.x - 33, top: pos.y - 33 }}
                  >
                    <StarComponent width={66} height={66} />
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* Flash overlay */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: '#ffffff' },
              flashStyle,
            ]}
            pointerEvents="none"
          />

          {/* Clan star (entry + reveal phase) */}
          {(phase === 'entry' || phase === 'reveal') && (
            <Animated.View style={[styles.center, clanStarStyle]}>
              {React.createElement(c.StarComponent, { width: 180, height: 180 })}
            </Animated.View>
          )}

          {/* Tap hint */}
          {(phase === 'fadein' || phase === 'tapping') && (
            <View style={styles.tapHint} pointerEvents="none">
              <Text style={styles.tapHintText}>{tapLabel}</Text>
              {phase === 'tapping' && (
                <TapDots count={taps} color={C.lime} />
              )}
            </View>
          )}

          {/* Final screen */}
          {isFinal && (
            <Animated.View style={[styles.finalScreen, finalStyle]}>
              {React.createElement(c.StarComponent, { width: 88, height: 88 })}
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={styles.finalLabel}>Clan</Text>
                <Text style={[styles.finalClanName, { color: c.primary }]}>
                  {c.label.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onComplete}
                activeOpacity={0.85}
                style={[styles.continueBtn, { backgroundColor: c.primary }]}
              >
                <Text style={styles.continueBtnText}>
                  Continuar reflexionando
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
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
    top: H * 0.42 - 90,
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapHint: {
    position: 'absolute',
    bottom: '22%',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 18,
  },
  tapHintText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'InriaSerif_400Regular',
    fontStyle: 'italic',
    paddingHorizontal: 32,
  },
  starLg: { width: 180, height: 180 },
  starSm: { width: 66, height: 66 },
  finalStar: { width: 88, height: 88 },
  tapDots: { flexDirection: 'row', gap: 12 },
  tapDot: { width: 8, height: 8, borderRadius: 4 },
  finalScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f0f12',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 32,
  },
  finalLabel: {
    fontSize: 16,
    color: C.muted,
    fontStyle: 'italic',
    fontFamily: 'InriaSerif_400Regular',
  },
  finalClanName: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: 'InriaSerif_400Regular',
  },
  continueBtn: {
    marginTop: 12,
    width: '100%',
    maxWidth: 300,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    color: '#0f0f12',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
