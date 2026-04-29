// EVO — RankUpAnimation.tsx
// Modal fullscreen para subida de rango (Aprendiz → Maestro → Filósofo)
//
// Uso:
//   {showRankUp && (
//     <RankUpAnimation
//       clanId="racionalista"
//       prevRankId="aprendiz"
//       newRankId="maestro"
//       percentage={42.3}
//       onClose={() => setShowRankUp(false)}
//     />
//   )}

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated as RNAnimated, Easing as RNEasing,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, withRepeat, Easing, cancelAnimation,
} from 'react-native-reanimated';
import {
  ANIM_CLANS, ANIM_COLORS,
  type AnimClanId,
} from '../../constants/evoAnimationClans';

const { width: W, height: H } = Dimensions.get('window');

// ─── Rangos ───────────────────────────────────────────────────────────────────
export type RankId = 'aprendiz' | 'maestro' | 'filosofo';

const RANKS: Record<RankId, { name: string; color: string }> = {
  aprendiz: { name: 'Aprendiz',  color: '#949ba6' },
  maestro:  { name: 'Maestro',   color: '#efb318' },
  filosofo: { name: 'Filósofo',  color: '#c7ff02' },
};

const MESSAGES: Record<Exclude<RankId, 'aprendiz'>, Partial<Record<AnimClanId, string>>> = {
  maestro: {
    nihilista:          'El vacío ya no te asusta.',
    cientista:          'La evidencia te da la razón.',
    estoico:            'Tu disciplina habla por ti.',
    existencialista:    'Te has elegido a ti mismo.',
    trascendentalista:  'Vas más allá de lo visible.',
    humanista:          'Tu empatía no tiene límites.',
    realista:           'La realidad es tu terreno.',
    racionalista:       'Tu razón se ha afilado.',
  },
  filosofo: {
    nihilista:          'Has encontrado verdad en la nada.',
    cientista:          'La razón y la evidencia son tuyas.',
    estoico:            'Eres la calma que otros buscan.',
    existencialista:    'Tu libertad es absoluta.',
    trascendentalista:  'Has cruzado el umbral.',
    humanista:          'Eres lo mejor del ser humano.',
    realista:           'Nadie ve la realidad como tú.',
    racionalista:       'La lógica es tu lengua materna.',
  },
};

// ─── Particle ────────────────────────────────────────────────────────────────
function Particle({
  startX, startY, endX, endY, color, size, delayMs, duration,
}: {
  startX: number; startY: number; endX: number; endY: number;
  color: string; size: number; delayMs: number; duration: number;
}) {
  const x  = useRef(new RNAnimated.Value(startX)).current;
  const y  = useRef(new RNAnimated.Value(startY)).current;
  const op = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(x,  { toValue: endX, duration, useNativeDriver: true, easing: RNEasing.inOut(RNEasing.quad) }),
        RNAnimated.timing(y,  { toValue: endY, duration, useNativeDriver: true, easing: RNEasing.inOut(RNEasing.quad) }),
        RNAnimated.sequence([
          RNAnimated.timing(op, { toValue: 1, duration: duration * 0.15, useNativeDriver: true }),
          RNAnimated.timing(op, { toValue: 1, duration: duration * 0.50, useNativeDriver: true }),
          RNAnimated.timing(op, { toValue: 0, duration: duration * 0.35, useNativeDriver: true }),
        ]),
      ]).start();
    }, delayMs);
    return () => clearTimeout(t);
  }, []);

  return (
    <RNAnimated.View style={{
      position: 'absolute',
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
      transform: [{ translateX: x }, { translateY: y }],
      opacity: op,
    }} pointerEvents="none" />
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function spawnParticleConfig(colors: string[], count: number, fromTop: boolean) {
  const cx = W / 2;
  const cy = fromTop ? -20 : H * 0.42;
  const out: any[] = [];

  for (let i = 0; i < count; i++) {
    const size  = 4 + Math.random() * 4;
    const angle = fromTop
      ? (Math.PI * 0.2) + Math.random() * Math.PI * 0.6
      : (i / count) * Math.PI * 2;
    const dist   = fromTop ? 200 + Math.random() * 300 : 80 + Math.random() * 200;
    const startX = cx + (Math.random() - 0.5) * (fromTop ? 300 : 0);
    const startY = cy;
    const endX   = startX + Math.cos(angle) * dist;
    const endY   = startY + (fromTop ? 1 : Math.sin(angle)) * dist;

    out.push({
      id: `${Date.now()}-${i}`,
      startX, startY, endX, endY,
      color: colors[i % colors.length],
      size,
      delayMs: i * 15 + Math.random() * 80,
      duration: 900 + Math.random() * 400,
    });
  }
  return out;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RankUpAnimation({
  clanId, prevRankId, newRankId, percentage, onClose,
}: {
  clanId: Exclude<AnimClanId, 'none'>;
  prevRankId: RankId;
  newRankId: Exclude<RankId, 'aprendiz'>;
  percentage: number;
  onClose?: () => void;
}) {
  const clan  = ANIM_CLANS[clanId] || ANIM_CLANS.estoico;
  const prevR = RANKS[prevRankId] || RANKS.aprendiz;
  const newR  = RANKS[newRankId] || RANKS.maestro;
  const msg   = (MESSAGES[newRankId] || {})[clanId] || '';
  const isFilosofo = newRankId === 'filosofo';

  const ClanStar = clan.StarComponent;

  const [showPrev,    setShowPrev]    = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [labelVis,    setLabelVis]    = useState(false);
  const [letterIdx,   setLetterIdx]   = useState(0);
  const [decoVis,     setDecoVis]     = useState(false);
  const [pctVis,      setPctVis]      = useState(false);
  const [msgVis,      setMsgVis]      = useState(false);
  const [closeVis,    setCloseVis]    = useState(false);
  const [particles,   setParticles]   = useState<any[]>([]);

  const modalOp    = useSharedValue(0);
  const bgGlowOp   = useSharedValue(0);
  const flashOp    = useSharedValue(0);
  const starOp     = useSharedValue(0);
  const starSc     = useSharedValue(0.3);
  const starRot    = useSharedValue(0);
  const starShake  = useSharedValue(0);
  const starGlowOp = useSharedValue(0);
  const prevOp     = useSharedValue(0);
  const decoW      = useSharedValue(0);

  const letters = newR.name.toUpperCase().split('');

  useEffect(() => {
    let canceled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const set = (fn: () => void, ms: number) => {
      const t = setTimeout(() => { if (!canceled) fn(); }, ms);
      timeouts.push(t);
      return t;
    };

    modalOp.value = withTiming(1, { duration: 300 });

    set(() => {
      starOp.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
      starSc.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.4)) });
    }, 100);

    set(() => {
      setShowPrev(true);
      prevOp.value = withTiming(1, { duration: 300 });
    }, 600);

    set(() => {
      starShake.value = withRepeat(
        withSequence(
          withTiming(8,  { duration: 80 }),
          withTiming(-8, { duration: 80 }),
        ),
        -1, true,
      );
      bgGlowOp.value = withTiming(0.2, { duration: 600 });

      let n = 0;
      const flick = setInterval(() => {
        prevOp.value = withTiming(n % 2 === 0 ? 0.3 : 1, { duration: 60 });
        n++;
        if (n >= 6) clearInterval(flick);
      }, 100);
      timeouts.push(flick as any);
    }, 950);

    set(() => {
      cancelAnimation(starShake);
      starShake.value = withTiming(0, { duration: 100 });
      starSc.value    = withTiming(2, { duration: 200, easing: Easing.inOut(Easing.ease) });
      starRot.value   = withTiming(180, { duration: 200, easing: Easing.inOut(Easing.ease) });
      flashOp.value   = withTiming(1, { duration: 80 });
    }, 1800);

    set(() => {
      setShowPrev(false);
      setShowContent(true);
      starSc.value     = withTiming(1, { duration: 200 });
      starRot.value    = withTiming(0, { duration: 200 });
      flashOp.value    = withTiming(0, { duration: 300 });
      starGlowOp.value = withTiming(1, { duration: 400 });
    }, 1880);

    set(() => setLabelVis(true), 2180);

    letters.forEach((_, i) => {
      set(() => setLetterIdx(i + 1), 2380 + i * 80);
    });

    const lettersDone = 2380 + letters.length * 80 + 100;

    set(() => {
      setDecoVis(true);
      decoW.value = withTiming(0.6, { duration: 400, easing: Easing.out(Easing.ease) });
    }, lettersDone);

    set(() => setPctVis(true), lettersDone + 450);
    set(() => setMsgVis(true), lettersDone + 650);

    set(() => {
      if (isFilosofo) {
        setParticles(prev => [
          ...prev,
          ...spawnParticleConfig([clan.primary, `${clan.primary}cc`, clan.secondary], 50, false),
        ]);
        set(() => {
          setParticles(prev => [
            ...prev,
            ...spawnParticleConfig([clan.secondary, `${clan.secondary}cc`], 20, true),
          ]);
        }, 150);
      } else {
        setParticles(prev => [
          ...prev,
          ...spawnParticleConfig(
            [clan.primary, `${clan.primary}cc`, clan.secondary, `${clan.secondary}99`],
            25, false,
          ),
        ]);
      }
    }, lettersDone + 1050);

    set(() => setCloseVis(true), lettersDone + 2050);
    set(() => handleClose(), lettersDone + 7050);

    return () => {
      canceled = true;
      timeouts.forEach(t => clearTimeout(t));
      cancelAnimation(starShake);
    };
  }, []);

  function handleClose() {
    modalOp.value = withTiming(0, { duration: 300 });
    setTimeout(() => onClose && onClose(), 320);
  }

  const modalStyle    = useAnimatedStyle(() => ({ opacity: modalOp.value }));
  const bgGlowStyle   = useAnimatedStyle(() => ({ opacity: bgGlowOp.value }));
  const flashStyle    = useAnimatedStyle(() => ({ opacity: flashOp.value }));
  const starStyle     = useAnimatedStyle(() => ({
    opacity: starOp.value,
    transform: [
      { translateX: starShake.value },
      { scale: starSc.value },
      { rotate: `${starRot.value}deg` },
    ],
  }));
  const starGlowStyle = useAnimatedStyle(() => ({ opacity: starGlowOp.value }));
  const prevStyle     = useAnimatedStyle(() => ({ opacity: prevOp.value }));
  const decoStyle     = useAnimatedStyle(() => ({ width: `${decoW.value * 100}%` as any }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, modalStyle]}>
      {/* BG glow */}
      <Animated.View
        style={[styles.bgGlow, { backgroundColor: clan.primary }, bgGlowStyle]}
        pointerEvents="none"
      />

      {/* Star glow halo */}
      <Animated.View
        style={[styles.starGlow, { backgroundColor: `${clan.primary}55` }, starGlowStyle]}
        pointerEvents="none"
      />

      {/* Star */}
      <Animated.View style={[styles.starWrap, starStyle]}>
        <ClanStar width={160} height={160} />
      </Animated.View>

      {/* Previous rank text */}
      {showPrev && (
        <Animated.View style={[styles.prevWrap, prevStyle]}>
          <Text style={[styles.prevText, { color: prevR.color }]}>
            {prevR.name.toUpperCase()}
          </Text>
        </Animated.View>
      )}

      {/* Reveal content */}
      {showContent && (
        <View style={styles.contentBlock}>
          {labelVis && (
            <Text style={styles.labelNuevo}>NUEVO RANGO</Text>
          )}
          <View style={styles.rankNameRow}>
            {letters.map((l, i) => (
              <Text
                key={i}
                style={[
                  styles.rankLetter,
                  { color: clan.primary, opacity: i < letterIdx ? 1 : 0 },
                ]}
              >
                {l === ' ' ? '\u00A0' : l}
              </Text>
            ))}
          </View>
          {decoVis && (
            <Animated.View style={[styles.decoLine, { backgroundColor: clan.primary }, decoStyle]} />
          )}
          {pctVis && (
            <Text style={[styles.clanPct, { color: clan.primary }]}>
              {percentage.toFixed(1)}% {clan.label}
            </Text>
          )}
          {msgVis && (
            <Text style={[styles.rankMsg, { color: clan.secondary }]}>
              {msg}
            </Text>
          )}
        </View>
      )}

      {/* Particles */}
      {particles.map(p => (
        <Particle key={p.id} {...p} />
      ))}

      {/* Flash white */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.flash, flashStyle]}
        pointerEvents="none"
      />

      {/* Close button */}
      {closeVis && (
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.85}
          style={[styles.closeBtn, { backgroundColor: clan.primary }]}
        >
          <Text style={styles.closeBtnText}>Continuar →</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0f0f12',
    zIndex: 9999,
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    width: W * 1.4, height: H * 0.5,
    top: H * 0.25, left: -W * 0.2,
    borderRadius: W,
  },
  starGlow: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
    top: H * 0.32 - 110, left: W / 2 - 110,
  },
  starWrap: {
    position: 'absolute',
    top: H * 0.32 - 80, left: W / 2 - 80,
    width: 160, height: 160,
    alignItems: 'center', justifyContent: 'center',
  },
  prevWrap: {
    position: 'absolute',
    top: H * 0.32 + 100,
    left: 0, right: 0,
    alignItems: 'center',
  },
  prevText: {
    fontSize: 20, fontWeight: '700',
    letterSpacing: 4, textTransform: 'uppercase',
    fontFamily: 'InriaSerif_400Regular',
  },
  contentBlock: {
    position: 'absolute',
    top: H * 0.32 + 80,
    left: 0, right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  labelNuevo: {
    fontSize: 13, fontWeight: '600',
    letterSpacing: 6, color: ANIM_COLORS.muted,
    textTransform: 'uppercase',
  },
  rankNameRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 6,
  },
  rankLetter: {
    fontSize: 52, fontWeight: '900',
    letterSpacing: 4,
    fontFamily: 'InriaSerif_400Regular',
  },
  decoLine: {
    height: 2, borderRadius: 1,
    marginVertical: 6,
  },
  clanPct: {
    fontSize: 14, fontWeight: '600',
    letterSpacing: 1,
  },
  rankMsg: {
    fontSize: 15, fontStyle: 'italic',
    textAlign: 'center', lineHeight: 22,
    marginTop: 6,
  },
  flash: { backgroundColor: '#ffffff' },
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
