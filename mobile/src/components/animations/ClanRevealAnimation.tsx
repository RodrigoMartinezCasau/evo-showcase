// EVO — ClanRevealAnimation.tsx
// Cubre dos casos:
//   1. Asignación de clan (nuevo usuario): previousClanId = undefined
//   2. Cambio de clan:                     previousClanId = clan anterior
//
// Secuencia:
//   FADEIN (3.5s) → TAPPING (3 toques) → SPINNING (círculo gira 3s + flash blanco)
//   → REVEAL (estrella del clan, blur dissolve) → ENTRY (copia ClanEntryWithClan)
//   → FINAL (pantalla negra "Bienvenido al Clan X" + botón)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableWithoutFeedback,
  StyleSheet, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, Easing,
  cancelAnimation, runOnJS,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import {
  ANIM_CLANS, ANIM_CLAN_IDS, CIRCLE_POSITIONS, ANIM_COLORS,
  type AnimClanId,
} from '../../constants/evoAnimationClans';

const { width: W, height: H } = Dimensions.get('window');

// ─── Tiny star field ────────────────────────────────────────────────────────
function StarField({ seed = 0 }) {
  const stars = React.useMemo(() => {
    const rng = (i: number) => { const x = Math.sin((i + seed) * 9999) * 10000; return x - Math.floor(x); };
    return Array.from({ length: 24 }).map((_, i) => ({
      x: rng(i * 2) * 100, y: rng(i * 2 + 1) * 100,
      size: rng(i * 3) * 2 + 1, opacity: 0.15 + rng(i * 4) * 0.4,
    }));
  }, [seed]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <View key={i} style={{
          position: 'absolute', left: `${s.x}%` as any, top: `${s.y}%` as any,
          width: s.size, height: s.size, borderRadius: s.size / 2,
          backgroundColor: '#fff', opacity: s.opacity,
        }} />
      ))}
    </View>
  );
}

// ─── SVG radial glow helper ──────────────────────────────────────────────────
function RadialGlow({ size, color, id }: { size: number; color: string; id: string }) {
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%"   stopColor={color} stopOpacity="0.55" />
          <Stop offset="60%"  stopColor={color} stopOpacity="0.18" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <SvgCircle cx="50%" cy="50%" r="50%" fill={`url(#${id})`} />
    </Svg>
  );
}

// ─── Star glow wrapper ────────────────────────────────────────────────────────
function StarWithGlow({ size, color, children }: { size: number; color: string; children: React.ReactNode }) {
  const glowSize = size * 1.8;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <RadialGlow size={glowSize} color={color} id={`sg_${color.slice(1)}`} />
      {children}
    </View>
  );
}

// ─── Tap dots ────────────────────────────────────────────────────────────────
function TapDots({ count, color }: { count: number; color: string }) {
  return (
    <View style={styles.tapDots}>
      {[0, 1, 2].map(i => (
        <View key={i} style={[
          styles.tapDot,
          { backgroundColor: i < count ? color : 'rgba(255,255,255,0.18)' },
        ]} />
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ClanRevealAnimation({
  clanId, previousClanId, isChange = false, onComplete,
}: {
  clanId: Exclude<AnimClanId, 'none'>;
  previousClanId?: Exclude<AnimClanId, 'none'>;
  isChange?: boolean;
  onComplete?: () => void;
}) {
  const c     = ANIM_CLANS[clanId] || ANIM_CLANS.estoico;
  const prevC = previousClanId ? ANIM_CLANS[previousClanId] : null;

  const BaseStar = ANIM_CLANS.none.StarComponent;
  const ClanStar = c.StarComponent;
  const PrevStar = prevC ? prevC.StarComponent : null;

  const [phase, setPhase]       = useState<string>('fadein');
  const [taps, setTaps]         = useState(0);
  const [shakeKey, setShakeKey] = useState(0);

  // ── Animated values ──────────────────────────────────────────────────────
  const screenOp   = useSharedValue(0);
  const baseStarOp = useSharedValue(1);
  const baseStarSc = useSharedValue(1);

  const circleOp  = useSharedValue(0);
  const circleSc  = useSharedValue(0.1);
  const circleRot = useSharedValue(0); // ← driven by rAF, applied via useAnimatedStyle
  const flashOp   = useSharedValue(0);

  const clanStarOp = useSharedValue(0);
  const clanStarSc = useSharedValue(0.9);

  const animalOp = useSharedValue(0);
  const animalSc = useSharedValue(0.15);

  const bgOp    = useSharedValue(0);
  const finalOp = useSharedValue(0);

  // ── rAF rotation (JS-driven, synced to shared value) ─────────────────────
  const circleRotationRef = useRef(0);
  const rafRef            = useRef<number>(0);

  // ── Timeout refs for cleanup ──────────────────────────────────────────────
  const t1Ref  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2Ref  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t3Ref  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t4Ref  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t5Ref  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spinningStarted = useRef(false);

  function clearAllTimeouts() {
    [t1Ref, t2Ref, t3Ref, t4Ref, t5Ref].forEach(r => {
      if (r.current) { clearTimeout(r.current); r.current = null; }
    });
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
  }

  function cancelAllAnimations() {
    cancelAnimation(screenOp);
    cancelAnimation(baseStarOp); cancelAnimation(baseStarSc);
    cancelAnimation(circleOp);   cancelAnimation(circleSc);
    cancelAnimation(circleRot);  cancelAnimation(flashOp);
    cancelAnimation(clanStarOp); cancelAnimation(clanStarSc);
    cancelAnimation(animalOp);   cancelAnimation(animalSc);
    cancelAnimation(bgOp);       cancelAnimation(finalOp);
    cancelAnimation(shakeSc);
  }

  // ── PHASE 1: fade in ──────────────────────────────────────────────────────
  useEffect(() => {
    spinningStarted.current = false;
    screenOp.value = withTiming(1, { duration: 3400, easing: Easing.out(Easing.ease) });
    t1Ref.current = setTimeout(() => setPhase('tapping'), 3500);
    return () => { clearAllTimeouts(); cancelAllAnimations(); };
  }, []);

  // ── Shake on tap ──────────────────────────────────────────────────────────
  const shakeSc = useSharedValue(1);
  useEffect(() => {
    if (shakeKey === 0) return;
    cancelAnimation(shakeSc);
    shakeSc.value = withSequence(
      withTiming(1.12, { duration: 60 }),
      withTiming(0.94, { duration: 60 }),
      withTiming(1.06, { duration: 60 }),
      withTiming(1.0,  { duration: 60 }),
    );
  }, [shakeKey]);

  // ── PHASE 2: tap ─────────────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    if (phase !== 'tapping') return;
    const next = taps + 1;
    setTaps(next);
    setShakeKey(k => k + 1);
    if (next >= 3 && !spinningStarted.current) {
      spinningStarted.current = true;
      t2Ref.current = setTimeout(startSpinning, 350);
    }
  }, [phase, taps]);

  // ── PHASE 3: spinning ────────────────────────────────────────────────────
  function startSpinning() {
    cancelAnimation(baseStarOp); cancelAnimation(baseStarSc);
    setPhase('spinning');

    baseStarOp.value = withTiming(0, { duration: 800 });
    baseStarSc.value = withTiming(1.6, { duration: 800 });

    t3Ref.current = setTimeout(() => {
      cancelAnimation(circleOp); cancelAnimation(circleSc);
      circleOp.value = withTiming(1, { duration: 640 });
      circleSc.value = withTiming(1, { duration: 880, easing: Easing.out(Easing.back(1.2)) });
    }, 30);

    const t0 = Date.now();
    let last = t0;

    const tick = () => {
      const now     = Date.now();
      const elapsed = (now - t0) / 1000;
      const dt      = (now - last) / 1000;
      last = now;

      const progress = Math.min(elapsed / 3, 1);
      const rps = 0.3 + (5 - 0.3) * progress * progress;
      circleRotationRef.current += rps * 360 * dt;
      circleRot.value = circleRotationRef.current; // sync to Reanimated shared value

      flashOp.value = progress * progress * 0.96;

      if (elapsed < 3) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        beginReveal();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  // ── PHASE 4: reveal ───────────────────────────────────────────────────────
  function beginReveal() {
    setPhase('reveal');
    cancelAnimation(flashOp);
    cancelAnimation(circleOp); cancelAnimation(circleSc);
    flashOp.value  = withTiming(0, { duration: 700 });
    circleOp.value = withTiming(0, { duration: 400 });
    circleSc.value = withTiming(0, { duration: 400 });

    t4Ref.current = setTimeout(() => {
      runOnJS(setPhase)('entry');
    }, 750);
  }

  // ── PHASE 5: entry ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'entry') return;

    cancelAnimation(clanStarOp); cancelAnimation(clanStarSc); cancelAnimation(bgOp);
    clanStarOp.value = withTiming(1, { duration: 720 });
    clanStarSc.value = withTiming(1, { duration: 880, easing: Easing.out(Easing.ease) });
    bgOp.value       = withTiming(0.30, { duration: 800 });

    const ea = setTimeout(() => {
      cancelAnimation(clanStarOp); cancelAnimation(clanStarSc); cancelAnimation(bgOp);
      clanStarOp.value = withTiming(0, { duration: 720 });
      clanStarSc.value = withTiming(0, { duration: 880, easing: Easing.in(Easing.ease) });
      bgOp.value       = withTiming(0.42, { duration: 600 });
    }, 1280);

    const eb = setTimeout(() => {
      cancelAnimation(animalOp); cancelAnimation(animalSc);
      animalOp.value = withTiming(1, { duration: 640 });
      animalSc.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.2)) });
    }, 2560);

    const ec = setTimeout(() => {
      cancelAnimation(animalSc); cancelAnimation(animalOp);
      cancelAnimation(bgOp);     cancelAnimation(flashOp);
      animalSc.value = withTiming(3, { duration: 560, easing: Easing.in(Easing.ease) });
      animalOp.value = withTiming(0, { duration: 400 });
      bgOp.value     = withTiming(1, { duration: 400 });
      flashOp.value  = withTiming(0.65, { duration: 400 });
    }, 5600);

    const ed = setTimeout(() => {
      runOnJS(setPhase)('final');
      cancelAnimation(flashOp); cancelAnimation(finalOp);
      flashOp.value = withTiming(0, { duration: 300 });
      finalOp.value = withTiming(1, { duration: 600 });
    }, 6160);

    return () => { [ea, eb, ec, ed].forEach(clearTimeout); };
  }, [phase]);

  // ── Animated styles ───────────────────────────────────────────────────────
  const screenStyle   = useAnimatedStyle(() => ({ opacity: screenOp.value }));
  const baseStarStyle = useAnimatedStyle(() => ({
    opacity: baseStarOp.value,
    transform: [{ scale: baseStarSc.value * shakeSc.value }],
  }));
  const circleStyle   = useAnimatedStyle(() => ({
    opacity: circleOp.value,
    transform: [{ scale: circleSc.value }],
  }));
  // ← rotation applied here, not via setNativeProps
  const circleRotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${circleRot.value}deg` }],
  }));
  const flashStyle    = useAnimatedStyle(() => ({ opacity: flashOp.value }));
  const clanStarStyle = useAnimatedStyle(() => ({
    opacity: clanStarOp.value,
    transform: [{ scale: clanStarSc.value }],
  }));
  const animalStyle   = useAnimatedStyle(() => ({
    opacity: animalOp.value,
    transform: [{ scale: animalSc.value }],
  }));
  const bgStyle       = useAnimatedStyle(() => ({ opacity: bgOp.value }));
  const finalStyle    = useAnimatedStyle(() => ({ opacity: finalOp.value }));

  const isFadein  = phase === 'fadein';
  const isTapping = phase === 'tapping';
  const isEntry   = phase === 'entry';
  const isFinal   = phase === 'final';
  const showBase  = isFadein || isTapping || phase === 'spinning';

  const tapLabel =
    taps === 0 ? (isChange ? 'Pulsa para conocer tu nuevo clan' : 'Pulsa para conocer tu clan')
    : taps === 1 ? 'Dos veces más...'
    : 'Una vez más...';

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, screenStyle]}>
          <StarField seed={42} />

          {/* Clan bg fill */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: c.primary }, bgStyle]}
            pointerEvents="none"
          />

          {/* Radial center glow */}
          <View pointerEvents="none" style={styles.centerGlowWrap}>
            <RadialGlow size={460} color={c.primary} id={`cg_${c.id}`} />
          </View>

          {/* Base / previous star */}
          {showBase && (
            <Animated.View style={[styles.center, baseStarStyle]}>
              <StarWithGlow size={180} color={prevC ? prevC.primary : ANIM_CLANS.none.primary}>
                {PrevStar
                  ? <PrevStar width={180} height={180} />
                  : <BaseStar width={180} height={180} />
                }
              </StarWithGlow>
            </Animated.View>
          )}

          {/* Circle of 8 clan stars — rotation via circleRotStyle */}
          <Animated.View style={[styles.center, circleStyle]}>
            <Animated.View style={circleRotStyle}>
              {ANIM_CLAN_IDS.map((id, i) => {
                const cl  = ANIM_CLANS[id];
                const pos = CIRCLE_POSITIONS[i];
                const S   = cl.StarComponent;
                return (
                  <View key={id} style={{ position: 'absolute', left: pos.x - 33, top: pos.y - 33 }}>
                    <StarWithGlow size={66} color={cl.primary}>
                      <S width={66} height={66} />
                    </StarWithGlow>
                  </View>
                );
              })}
            </Animated.View>
          </Animated.View>

          {/* Flash overlay */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }, flashStyle]}
            pointerEvents="none"
          />

          {/* Clan star (entry phase) */}
          {(isEntry || phase === 'reveal') && (
            <Animated.View style={[styles.center, clanStarStyle]}>
              <StarWithGlow size={180} color={c.primary}>
                <ClanStar width={180} height={180} />
              </StarWithGlow>
            </Animated.View>
          )}

          {/* Animal (entry phase) */}
          {isEntry && c.animalAsset && (
            <Animated.View style={[styles.centerAnimal, animalStyle]}>
              <View style={styles.animalAuraWrap} pointerEvents="none">
                <RadialGlow size={400} color={c.primary} id={`aa_${c.id}`} />
              </View>
              <Image source={c.animalAsset} style={styles.animalImg} resizeMode="contain" />
            </Animated.View>
          )}

          {/* Tap hint */}
          {(isFadein || isTapping) && (
            <View style={styles.tapHint} pointerEvents="none">
              <Text style={styles.tapHintText}>{tapLabel}</Text>
              {isTapping && <TapDots count={taps} color={ANIM_COLORS.lime} />}
            </View>
          )}

          {/* Final screen */}
          {isFinal && (
            <Animated.View style={[styles.finalScreen, finalStyle]}>
              <StarWithGlow size={88} color={c.primary}>
                <ClanStar width={88} height={88} />
              </StarWithGlow>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={styles.finalLabel}>Clan</Text>
                <Text style={[styles.finalClanName, { color: c.primary }]}>
                  {c.label.toUpperCase()}
                </Text>
              </View>
              <TouchableWithoutFeedback onPress={onComplete}>
                <View style={[styles.continueBtn, { backgroundColor: c.primary }]}>
                  <Text style={styles.continueBtnText}>Continuar reflexionando</Text>
                </View>
              </TouchableWithoutFeedback>
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
    width: 180, height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAnimal: {
    position: 'absolute',
    left: W / 2 - 160,
    top: H / 2 - 160,
    width: 320, height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerGlowWrap: {
    position: 'absolute',
    left: W / 2 - 230,
    top: H / 2 - 230,
    width: 460, height: 460,
  },
  animalImg: { width: 320, height: 320 },
  animalAuraWrap: {
    position: 'absolute',
    left: -40, top: -40,
    width: 400, height: 400,
  },
  tapHint: {
    position: 'absolute', bottom: '22%', left: 0, right: 0,
    alignItems: 'center', gap: 18,
  },
  tapHintText: {
    color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '500',
    textAlign: 'center', lineHeight: 24,
    fontFamily: 'InriaSerif_400Regular', fontStyle: 'italic',
    paddingHorizontal: 32,
  },
  tapDots: { flexDirection: 'row', gap: 12 },
  tapDot: { width: 8, height: 8, borderRadius: 4 },
  finalScreen: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0f0f12',
    alignItems: 'center', justifyContent: 'center',
    gap: 20, paddingHorizontal: 32,
  },
  finalLabel: {
    fontSize: 16, color: ANIM_COLORS.muted,
    fontStyle: 'italic', fontFamily: 'InriaSerif_400Regular',
  },
  finalClanName: {
    fontSize: 40, fontWeight: '800', letterSpacing: 4,
    fontFamily: 'InriaSerif_400Regular',
  },
  continueBtn: {
    marginTop: 12, width: '100%', maxWidth: 300,
    height: 56, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  continueBtnText: {
    color: '#0f0f12', fontSize: 17, fontWeight: '700', letterSpacing: 0.3,
  },
});
