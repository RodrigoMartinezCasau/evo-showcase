/**
 * VoiceWaveform.tsx
 * =================
 * Visualizador de audio animado para el modo de grabación de voz.
 * 9 barras verticales que reaccionan al nivel de volumen (0–1).
 * En silencio hace una animación de "respiración" suave.
 *
 * RENDIMIENTO (fix del lag en pantallas pesadas):
 * - Anima `scaleY` con useNativeDriver: true → la animación corre en el hilo
 *   de UI y no compite con el JS thread del feed (antes animaba `height` en JS).
 * - El bucle se crea UNA vez; el volumen entra por ref. Antes, cada cambio de
 *   `volume` (7 Hz) recreaba el intervalo y disparaba 9 springs en JS.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const BAR_COUNT = 9;

/** Alturas relativas base — el centro es el más alto (forma de campana). */
const BASE_PROFILE = [0.25, 0.45, 0.65, 0.85, 1.0, 0.85, 0.65, 0.45, 0.25];

/** Desfase de fase para la animación idle, hace que las barras oscilen independientemente. */
const IDLE_PHASES = [0, 0.7, 1.4, 2.1, 2.8, 2.1, 1.4, 0.7, 0.0];

/** Tick del bucle (ms). Los springs nativos interpolan entre ticks. */
const TICK_MS = 120;

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
  const minScale = MIN_H / MAX_H;

  // scaleY 0–1 sobre barras de altura fija MAX_H (compatible con native driver).
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(minScale)),
  ).current;

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const tickRef = useRef(0);

  useEffect(() => {
    const animate = () => {
      tickRef.current += 0.22;
      const t = tickRef.current;
      const vol = volumeRef.current;
      bars.forEach((bar, i) => {
        let target: number;
        if (vol < 0.05) {
          // Idle breathing: gentle sine wave per bar with phase offset
          const sine = (Math.sin(t + IDLE_PHASES[i]) + 1) / 2; // 0–1
          target = minScale + sine * (0.22 - minScale);
        } else {
          // Reactivo al volumen + ruido por barra para simular habla viva.
          const noise =
            Math.sin(t * 2.3 + IDLE_PHASES[i]) * 0.18 + 0.82 + Math.random() * 0.18;
          target = minScale + vol * BASE_PROFILE[i] * (1 - minScale) * noise;
        }

        Animated.spring(bar, {
          toValue: Math.min(1, Math.max(minScale, target)),
          useNativeDriver: true,
          tension: vol < 0.05 ? 40 : 120,
          friction: 6,
          overshootClamping: true,
        }).start();
      });
    };

    const interval = setInterval(animate, TICK_MS);
    animate(); // immediate first frame

    return () => clearInterval(interval);
    // Bucle único: volumen vía ref, sin recrear el intervalo en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, minScale]);

  return (
    <View style={[styles.container, { height }]}>
      {bars.map((scaleY, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { backgroundColor: color, height: MAX_H, transform: [{ scaleY }] },
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
