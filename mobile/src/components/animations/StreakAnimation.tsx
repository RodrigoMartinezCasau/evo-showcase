// EVO — StreakAnimation.tsx
// Modal fullscreen que se muestra al aumentar la racha diaria.
// Secuencia: estrella fade-in + spin → flash blanco → fuego + texto → botón
//
// Uso — muéstralo como overlay encima de cualquier pantalla:
//   {showStreak && (
//     <StreakAnimation
//       clanId="estoico"
//       streakCount={7}
//       onClose={() => setShowStreak(false)}
//     />
//   )}

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated as RNAnimated,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import {
  ANIM_CLANS, ANIM_COLORS,
  type AnimClanId,
} from '../../constants/evoAnimationClans';

const { width: W } = Dimensions.get('window');

// ─── CountUp number ───────────────────────────────────────────────────────────
function CountUp({ from, to, duration }: { from: number; to: number; duration: number }) {
  const [val, setVal] = useState(from);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setVal(Math.round(from + (to - from) * e));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [from, to, duration]);
  return <Text style={styles.countNum}>{val}</Text>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function StreakAnimation({
  clanId, streakCount, onClose,
}: {
  clanId: AnimClanId | null;
  streakCount: number;
  onClose?: () => void;
}) {
  const key  = ((clanId || 'none') as string).toLowerCase() as AnimClanId;
  const clan = ANIM_CLANS[key] || ANIM_CLANS.none;
  const prev = Math.max(0, streakCount - 1);
  const isWeek  = streakCount > 0 && streakCount % 7  === 0;
  const isMon   = streakCount > 0 && streakCount % 30 === 0;
  const special = isWeek || isMon;

  const StarComp = clan.StarComponent;
  const FireComp = clan.FireComponent;

  // phase: 'star' | 'flash' | 'fire' | 'closing'
  const [fireVisible, setFireVisible] = useState(false);
  const [btnVisible,  setBtnVisible]  = useState(false);
  const [line1, setLine1]             = useState(false);
  const [line2, setLine2]             = useState(false);
  const [line3, setLine3]             = useState(false);
  const [line4, setLine4]             = useState(false);
  const [milestone, setMilestone]     = useState(false);
  const [showCount, setShowCount]     = useState(false);

  // Star animated values (Reanimated)
  const starOp  = useSharedValue(0);
  const starSc  = useSharedValue(0.2);
  const starRot = useSharedValue(0);
  const glowOp  = useSharedValue(0);

  // Flash (plain RN Animated for speed)
  const flashAnim = useRef(new RNAnimated.Value(0)).current;

  // Background — usa streakBg (oscuro) para la tinta del fondo al mostrar el fuego
  const [bgColor, setBgColor] = useState('#0f0f12');

  // Fire wiggle (JS-driven scale/rotate via state)
  const [fireTransform, setFireTransform] = useState([{ scale: 1 }]);
  const fireRafRef = useRef<number>(0);

  // Screen fade-out
  const screenOp = useSharedValue(1);

  // ── Animation sequence ───────────────────────────────────────────────────────
  useEffect(() => {
    // FASE 1: Star fade in (300ms)
    starOp.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }, () => {
      // FASE 1b: Star spin + scale up (1200ms)
      const spinStart = Date.now();
      let angle = 0;
      let lastTs: number | null = null;

      const spinTick = (ts: number) => {
        if (!lastTs) lastTs = ts;
        const dt = (ts - lastTs) / 1000;
        lastTs = ts;
        const elapsed = (ts - spinStart) / 1000;

        const speed = elapsed < 0.4 ? 1 + elapsed / 0.4
          : elapsed < 0.8 ? 2 + (elapsed - 0.4) / 0.4 * 2
          : 4;
        angle += speed * 360 * dt;
        const scaleProg = Math.min(elapsed / 1.2, 1);

        starSc.value  = 1 + scaleProg * 0.3;
        starRot.value = angle;
        glowOp.value  = Math.min(scaleProg * 0.6, 0.6);

        if (elapsed < 1.2) {
          requestAnimationFrame(spinTick);
        } else {
          doFlash();
        }
      };
      requestAnimationFrame(spinTick);
    });

    // FASE 2: Flash in → swap to fire → flash out
    function doFlash() {
      RNAnimated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start(() => {
        // Swap star → fire — usa el streakBg oscuro del diseño
        starOp.value = 0;
        setBgColor(clan.streakBg);
        setFireVisible(true);

        RNAnimated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          startFire();
          doTextReveal();
        });
      });
    }

    // FASE 3: Fire wiggle loop
    function startFire() {
      const scales    = [1.0, 1.1, 0.97, 1.08, 1.0, 1.12, 0.98, 1.05, 1.0];
      const rotations = [0, -3, 2, -2, 3, -1.5, 2.5, -2, 0];
      const durations = [120, 150, 130, 140, 110, 160, 130, 140];
      let kf = 0, kfProg = 0, lastTs: number | null = null;

      const fireTick = (ts: number) => {
        if (!lastTs) lastTs = ts;
        const dt = ts - lastTs; lastTs = ts;
        kfProg += dt;
        const dur = durations[kf % durations.length];
        if (kfProg >= dur) { kfProg -= dur; kf = (kf + 1) % scales.length; }
        const p    = kfProg / dur;
        const next = (kf + 1) % scales.length;
        const sc   = scales[kf] + (scales[next] - scales[kf]) * p;
        const rot  = rotations[kf] + (rotations[next] - rotations[kf]) * p;
        setFireTransform([{ scale: sc }, { rotate: `${rot}deg` }] as any);
        fireRafRef.current = requestAnimationFrame(fireTick);
      };
      fireRafRef.current = requestAnimationFrame(fireTick);
    }

    // FASE 4: Text stagger
    function doTextReveal() {
      const base = 0;
      if (special) setTimeout(() => setMilestone(true), base);
      setTimeout(() => setLine1(true),                         base + (special ? 100 : 0));
      setTimeout(() => { setLine2(true); setShowCount(true); }, base + (special ? 250 : 150));
      setTimeout(() => setLine3(true),                         base + (special ? 400 : 300));
      setTimeout(() => setLine4(true),                         base + (special ? 550 : 450));
      setTimeout(() => setBtnVisible(true), 1200);
      setTimeout(handleClose, 5200);
    }

    return () => {
      if (fireRafRef.current) cancelAnimationFrame(fireRafRef.current);
    };
  }, []);

  function handleClose() {
    if (fireRafRef.current) cancelAnimationFrame(fireRafRef.current);
    screenOp.value = withTiming(0, { duration: 300 }, () => {});
    setTimeout(() => onClose && onClose(), 320);
  }

  // ── Animated styles ──────────────────────────────────────────────────────────
  const starAnimStyle = useAnimatedStyle(() => ({
    opacity: starOp.value,
    transform: [{ scale: starSc.value }, { rotate: `${starRot.value}deg` }],
  }));
  const glowAnimStyle   = useAnimatedStyle(() => ({ opacity: glowOp.value }));
  const screenAnimStyle = useAnimatedStyle(() => ({ opacity: screenOp.value }));

  const milestoneText = isMon ? '¡UN MES DE FILOSOFÍA!' : '¡SEMANA COMPLETADA!';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: bgColor }, screenAnimStyle]}>

      {/* SVG radial background glow — funciona en Android sin elevation circular */}
      <Animated.View
        style={[styles.bgGlow, glowAnimStyle]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={clan.secondary} stopOpacity="0.55" />
              <Stop offset="60%"  stopColor={clan.secondary} stopOpacity="0.18" />
              <Stop offset="100%" stopColor={clan.secondary} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <SvgCircle cx="50%" cy="50%" r="50%" fill="url(#bgGrad)" />
        </Svg>
      </Animated.View>

      {/* White flash */}
      <RNAnimated.View
        style={[StyleSheet.absoluteFill, styles.flash, { opacity: flashAnim }]}
        pointerEvents="none"
      />

      {/* ── Star (phase 1) ── */}
      {!fireVisible && (
        <Animated.View style={[styles.iconWrap, starAnimStyle]}>
          {/* SVG glow behind star */}
          <View style={{ position: 'absolute', width: 252, height: 252, left: -56, top: -56 }}>
            <Svg width="252" height="252">
              <Defs>
                <RadialGradient id="starGlowS" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%"   stopColor={clan.primary} stopOpacity="0.5" />
                  <Stop offset="55%"  stopColor={clan.primary} stopOpacity="0.15" />
                  <Stop offset="100%" stopColor={clan.primary} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <SvgCircle cx="126" cy="126" r="126" fill="url(#starGlowS)" />
            </Svg>
          </View>
          <StarComp width={140} height={140} />
        </Animated.View>
      )}

      {/* ── Fire + text (phase 3) ── */}
      {fireVisible && (
        <View style={styles.fireBlock}>
          <View style={{ alignItems: 'center', justifyContent: 'center', elevation: 0 }}>
            {/* SVG glow behind fire */}
            <View style={{ position: 'absolute', width: 252, height: 252, left: -56, top: -56 }}>
              <Svg width="252" height="252">
                <Defs>
                  <RadialGradient id="fireGlowS" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%"   stopColor={clan.primary} stopOpacity="0.45" />
                    <Stop offset="55%"  stopColor={clan.primary} stopOpacity="0.12" />
                    <Stop offset="100%" stopColor={clan.primary} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <SvgCircle cx="126" cy="126" r="126" fill="url(#fireGlowS)" />
              </Svg>
            </View>
            <View style={{ transform: fireTransform as any }}>
              <FireComp width={140} height={140} />
            </View>
          </View>

          <View style={styles.textBlock}>
            {special && milestone && (
              <Text style={[styles.milestoneText, { color: ANIM_COLORS.lime }]}>{milestoneText}</Text>
            )}
            {line1 && (
              <Text style={[styles.rachaLabel, { color: clan.primary }]}>RACHA</Text>
            )}
            {line2 && (
              <View>
                {showCount
                  ? <CountUp from={prev} to={streakCount} duration={500} />
                  : <Text style={styles.countNum}>{prev}</Text>
                }
              </View>
            )}
            {line3 && (
              <Text style={styles.consecutivos}>días consecutivos</Text>
            )}
            {line4 && (
              <Text style={[styles.motivMsg, { color: clan.primary }]}>{clan.streakMsg}</Text>
            )}
          </View>
        </View>
      )}

      {/* ── Close button ── */}
      {btnVisible && (
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.85}
          style={[styles.closeBtn, { backgroundColor: clan.primary }]}
        >
          <Text style={styles.closeBtnText}>Seguir →</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    width: W * 1.3, height: W * 1.3,
    top: '10%', left: -W * 0.15,
  },
  flash: {
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  iconWrap: {
    width: 160, height: 160,
    alignItems: 'center', justifyContent: 'center',
  },
  fireBlock: {
    alignItems: 'center',
    width: '100%',
  },
  textBlock: {
    marginTop: 28,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  milestoneText: {
    fontSize: 12, fontWeight: '800',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  rachaLabel: {
    fontSize: 12, fontWeight: '700',
    letterSpacing: 8, textTransform: 'uppercase',
  },
  countNum: {
    fontSize: 80, fontWeight: '900',
    color: '#ffffff', lineHeight: 84,
    fontVariant: ['tabular-nums'],
  },
  consecutivos: {
    fontSize: 16, color: ANIM_COLORS.muted,
  },
  motivMsg: {
    fontSize: 15, fontStyle: 'italic',
    lineHeight: 22, textAlign: 'center', marginTop: 4,
  },
  closeBtn: {
    position: 'absolute',
    bottom: 56, left: '10%', right: '10%',
    height: 56, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 17, fontWeight: '700',
    color: '#0f0f12', letterSpacing: 0.5,
  },
});
