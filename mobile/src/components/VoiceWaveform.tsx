/**
 * VoiceWaveform.tsx
 * =================
 * Visualizador de audio animado para el modo de grabación de voz.
 * 9 barras verticales que reaccionan al nivel de volumen (0–1).
 * En silencio hace una animación de "respiración" suave.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const BAR_COUNT = 9;

/** Alturas relativas base — el centro es el más alto (forma de campana). */
const BASE_PROFILE = [0.25, 0.45, 0.65, 0.85, 1.0, 0.85, 0.65, 0.45, 0.25];

/** Desfase de fase para la animación idle, hace que las barras oscilen independientemente. */
const IDLE_PHASES = [0, 0.7, 1.4, 2.1, 2.8, 2.1, 1.4, 0.7, 0.0];

type Props = {
  /** Nivel de volumen normalizado 0–1 (viene del hook useVoiceInput). */
  volume: number;
  /** Color de las barras — normalmente el color principal del clan. */
  color: string;
  /** Altura total del componente en px. */
  height?: number;
};

export const VoiceWaveform = React.memo(function VoiceWaveform({
  volume,
  color,
  height = 32,
}: Props) {
  const MIN_H = 3;
  const MAX_H = height;

  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(MIN_H)),
  ).current;

  const tickRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const animate = () => {
      tickRef.current += 0.15;
      const t = tickRef.current;
      bars.forEach((bar, i) => {
        let targetH: number;
        if (volume < 0.05) {
          // Idle breathing: gentle sine wave per bar with phase offset
          const sine = (Math.sin(t + IDLE_PHASES[i]) + 1) / 2; // 0–1
          targetH = MIN_H + sine * (MAX_H * 0.22 - MIN_H);
        } else {
          // Reactive to volume: scale by profile + slight per-bar noise
          const noise = Math.sin(t * 2.3 + IDLE_PHASES[i]) * 0.1 + 0.9;
          targetH = MIN_H + volume * BASE_PROFILE[i] * (MAX_H - MIN_H) * noise;
        }

        Animated.spring(bar, {
          toValue: Math.max(MIN_H, targetH),
          useNativeDriver: false,
          tension: volume < 0.05 ? 40 : 120,
          friction: 6,
          overshootClamping: true,
        }).start();
      });
    };

    // Animate at ~60fps equivalent tick
    intervalRef.current = setInterval(animate, 80);
    animate(); // immediate first frame

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [volume, bars, height]);

  return (
    <View style={[styles.container, { height }]}>
      {bars.map((barH, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { backgroundColor: color, height: barH },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
