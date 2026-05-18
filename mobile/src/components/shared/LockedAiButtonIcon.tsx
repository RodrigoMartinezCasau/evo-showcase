import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  size: number;
  /** Color del círculo (mismo que el botón de enviar del clan). */
  circleColor?: string;
};

/** Estrella / replay sustituidos por candado cuando no hay usos de IA. */
export function LockedAiButtonIcon({ size, circleColor = '#c7ff02' }: Props) {
  const r = size / 2;
  const lockSize = Math.round(size * 0.44);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={r} cy={r} r={r} fill={circleColor} />
      </Svg>
      <Ionicons
        name="lock-closed"
        size={lockSize}
        color="#0b0b0f"
        style={styles.lock}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: {
    position: 'absolute',
  },
});
