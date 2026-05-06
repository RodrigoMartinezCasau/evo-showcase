// EVO — ClanEntryAnimation.tsx
// Pantalla de entrada al abrir la app. Dos variantes:
//   - Sin clan: estrella base → 8 estrellas en círculo → giro → zoom fill
//   - Con clan:  estrella base → estrella del clan → zoom out → animal → flash

import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import {
  ANIM_CLANS, ANIM_CLAN_IDS, CIRCLE_POSITIONS,
  type AnimClanId,
} from '../../constants/evoAnimationClans';

const { width: W, height: H } = Dimensions.get('window');

// ─── Tiny star field ─────────────────────────────────────────────────────────
function StarField({ seed = 0 }) {
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
        <View key={i} style={{
          position: 'absolute',
          left: `${s.x}%` as any,
          top: `${s.y}%` as any,
          width: s.size, height: s.size,
          borderRadius: s.size / 2,
          backgroundColor: '#fff',
          opacity: s.opacity,
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

// ─── Star wrapped with radial glow ───────────────────────────────────────────
function StarWithGlow({ size, color, id, children }: {
  size: number; color: string; id: string; children: React.ReactNode;
}) {
  const glowSize = size * 1.8;
  const offset   = (glowSize - size) / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: -offset, top: -offset, width: glowSize, height: glowSize }}>
        <RadialGlow size={glowSize} color={color} id={id} />
      </View>
      {children}
    </View>
  );
}

// ─── No-clan animation ────────────────────────────────────────────────────────
function NoClanEntry({ onComplete, runKey = 0 }: { onComplete?: () => void; runKey?: number }) {
  const clan = ANIM_CLANS.none;

  const starsOp    = useSharedValue(0);
  const starsScale = useSharedValue(0.15);

  const circleRotation = useRef(0);
  const circleRot      = useSharedValue(0);
  const rafRef         = useRef<number>(0);

  useEffect(() => {
    // Corona aparece directamente desde el inicio
    starsOp.value    = withTiming(1, { duration: 557 });
    starsScale.value = withTiming(1, { duration: 435 });

    // Giro empieza justo después de que la corona aparece
    const t1 = setTimeout(() => {
      const start = Date.now();
      const spin = () => {
        const elapsed = (Date.now() - start) / 1000;
        circleRotation.current += (0.3 + (5 - 0.3) * Math.min(elapsed / 2.7, 1)) * 0.36;
        circleRot.value = circleRotation.current;
        if (elapsed < 2.7) {
          rafRef.current = requestAnimationFrame(spin);
        } else {
          setTimeout(() => {
            cancelAnimation(starsScale); cancelAnimation(starsOp);
            starsScale.value = withTiming(5, { duration: 1739, easing: Easing.in(Easing.ease) });
            starsOp.value    = withTiming(0, { duration: 1200 });
            setTimeout(() => { onComplete && onComplete(); }, 1800);
          }, 521);
        }
      };
      rafRef.current = requestAnimationFrame(spin);
    }, 600);

    return () => {
      clearTimeout(t1);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      cancelAnimation(starsOp); cancelAnimation(starsScale);
      cancelAnimation(circleRot);
    };
  }, [runKey]);

  const starsStyle = useAnimatedStyle(() => ({
    opacity: starsOp.value,
    transform: [{ scale: starsScale.value }],
  }));
  const circleRotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${circleRot.value}deg` }],
  }));

  return (
    <View style={styles.root}>
      <StarField seed={1} />

      {/* Radial center glow */}
      <View pointerEvents="none" style={styles.centerGlow}>
        <RadialGlow size={460} color={clan.primary} id="nc_base_glow" />
      </View>

      {/* Corona de 8 estrellas — aparece directamente sin estrella base */}
      <Animated.View style={[styles.center, starsStyle]}>
        <Animated.View style={circleRotStyle}>
          {ANIM_CLAN_IDS.map((id, i) => {
            const c = ANIM_CLANS[id];
            const pos = CIRCLE_POSITIONS[i];
            const S = c.StarComponent;
            return (
              <View key={id} style={[styles.circleItem, { left: pos.x - 33, top: pos.y - 33 }]}>
                <StarWithGlow size={66} color={c.primary} id={`nc_sm_${id}`}>
                  <S width={66} height={66} />
                </StarWithGlow>
              </View>
            );
          })}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── With-clan animation ──────────────────────────────────────────────────────
function WithClanEntry({ clanId, onComplete, runKey = 0 }: {
  clanId: Exclude<AnimClanId, 'none'>; onComplete?: () => void; runKey?: number;
}) {
  const c = ANIM_CLANS[clanId] || ANIM_CLANS.estoico;
  const BaseStar = ANIM_CLANS.none.StarComponent;
  const ClanStar = c.StarComponent;

  const baseOp    = useSharedValue(0);
  const clanOp    = useSharedValue(0);
  const clanScale = useSharedValue(0.9);
  const animalOp    = useSharedValue(0);
  const animalScale = useSharedValue(0.15);
  const bgOp    = useSharedValue(0);
  const flashOp = useSharedValue(0);
  const auraOp  = useSharedValue(0);

  useEffect(() => {
    baseOp.value = 0; clanOp.value = 0; clanScale.value = 0.9;
    animalOp.value = 0; animalScale.value = 0.15;
    bgOp.value = 0; flashOp.value = 0; auraOp.value = 0;

    baseOp.value = withTiming(1, { duration: 800 });

    const t1 = setTimeout(() => {
      cancelAnimation(baseOp);
      cancelAnimation(clanOp); cancelAnimation(clanScale); cancelAnimation(bgOp);
      baseOp.value    = withTiming(0, { duration: 800 });
      clanOp.value    = withTiming(1, { duration: 720 });
      clanScale.value = withTiming(1, { duration: 880, easing: Easing.out(Easing.ease) });
      bgOp.value      = withTiming(0.30, { duration: 800 });
    }, 1280);

    const t2 = setTimeout(() => {
      cancelAnimation(clanOp); cancelAnimation(clanScale); cancelAnimation(bgOp);
      clanOp.value    = withTiming(0, { duration: 720 });
      clanScale.value = withTiming(0, { duration: 880, easing: Easing.in(Easing.ease) });
      bgOp.value      = withTiming(0.42, { duration: 600 });
    }, 2560);

    const t3 = setTimeout(() => {
      cancelAnimation(animalOp); cancelAnimation(animalScale); cancelAnimation(auraOp);
      animalOp.value    = withTiming(1, { duration: 640 });
      animalScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.2)) });
      auraOp.value      = withTiming(1, { duration: 600 });
    }, 3600);

    const t4 = setTimeout(() => {
      cancelAnimation(animalScale); cancelAnimation(animalOp);
      cancelAnimation(bgOp); cancelAnimation(flashOp); cancelAnimation(auraOp);
      animalScale.value = withTiming(3.0, { duration: 560, easing: Easing.in(Easing.ease) });
      animalOp.value    = withTiming(0, { duration: 400 });
      bgOp.value        = withTiming(1, { duration: 400 });
      flashOp.value     = withTiming(0.65, { duration: 400 });
      auraOp.value      = withTiming(0, { duration: 300 });
    }, 5600);

    const t5 = setTimeout(() => { onComplete && onComplete(); }, 6160);

    return () => {
      [t1, t2, t3, t4, t5].forEach(clearTimeout);
      cancelAnimation(baseOp); cancelAnimation(clanOp); cancelAnimation(clanScale);
      cancelAnimation(animalOp); cancelAnimation(animalScale);
      cancelAnimation(bgOp); cancelAnimation(flashOp); cancelAnimation(auraOp);
    };
  }, [runKey, clanId]);

  const baseStyle   = useAnimatedStyle(() => ({ opacity: baseOp.value }));
  const clanStyle   = useAnimatedStyle(() => ({
    opacity: clanOp.value, transform: [{ scale: clanScale.value }],
  }));
  const animalStyle = useAnimatedStyle(() => ({
    opacity: animalOp.value, transform: [{ scale: animalScale.value }],
  }));
  const bgStyle    = useAnimatedStyle(() => ({ opacity: bgOp.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOp.value }));
  const auraStyle  = useAnimatedStyle(() => ({ opacity: auraOp.value }));

  return (
    <View style={styles.root}>
      <StarField seed={clanId.length} />

      {/* Clan background fill */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: c.primary }, bgStyle]}
        pointerEvents="none"
      />

      {/* Radial center glow */}
      <View pointerEvents="none" style={styles.centerGlow}>
        <RadialGlow size={460} color={c.primary} id={`wc_cg_${c.id}`} />
      </View>

      {/* Animal aura + image */}
      {c.animalAsset && (
        <Animated.View style={[styles.centerAnimal, animalStyle]}>
          {/* SVG aura behind animal */}
          <Animated.View style={[{ position: 'absolute', left: -40, top: -40 }, auraStyle]}>
            <RadialGlow size={400} color={c.primary} id={`wc_aa_${c.id}`} />
          </Animated.View>
          <Image source={c.animalAsset} style={styles.animalImg} resizeMode="contain" />
        </Animated.View>
      )}

      {/* Base star */}
      <Animated.View style={[styles.center, baseStyle]}>
        <StarWithGlow size={180} color={ANIM_CLANS.none.primary} id={`wc_bs_${c.id}`}>
          <BaseStar width={180} height={180} />
        </StarWithGlow>
      </Animated.View>

      {/* Clan star */}
      <Animated.View style={[styles.center, clanStyle]}>
        <StarWithGlow size={180} color={c.primary} id={`wc_cs_${c.id}`}>
          <ClanStar width={180} height={180} />
        </StarWithGlow>
      </Animated.View>

      {/* Flash */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: c.primary }, flashStyle]}
        pointerEvents="none"
      />
    </View>
  );
}

// ─── Public wrapper ───────────────────────────────────────────────────────────
export default function ClanEntryAnimation({
  clanId, onComplete, runKey = 0,
}: {
  clanId: AnimClanId | null;
  onComplete?: () => void;
  runKey?: number;
}) {
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
  centerGlow: {
    position: 'absolute',
    left: W / 2 - 230,
    top: H / 2 - 230,
    width: 460, height: 460,
  },
  animalImg: { width: 320, height: 320 },
  circleItem: {
    position: 'absolute',
    width: 66, height: 66,
  },
});
