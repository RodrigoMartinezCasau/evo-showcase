import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Gris idéntico al de los tres puntitos de gestión de la tarjeta. */
const COLOR = 'rgba(255,255,255,0.55)';

function formatViews(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k >= 100 || Number.isInteger(k) ? Math.round(k) : k.toFixed(1)}k`;
  }
  const m = n / 1_000_000;
  return `${m >= 100 || Number.isInteger(m) ? Math.round(m) : m.toFixed(1)}M`;
}

type Props = {
  /** Nº de visualizaciones únicas. */
  count: number;
};

/**
 * Recuento de visualizaciones en gris, esquina superior izquierda de las
 * tarjetas de "últimas publicaciones" (perfil propio, ajeno y clan).
 */
export const PostViewCountBadge = React.memo(function PostViewCountBadge({ count }: Props) {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* El ojo va centrado en una caja 24×24 idéntica a la del botón de tres
          puntos (top:10/right:10), pero en la esquina izquierda, para que ambos
          iconos queden espejados en los ejes X e Y. */}
      <View style={styles.iconBox}>
        <Ionicons name="eye-outline" size={14} color={COLOR} />
      </View>
      <Text style={styles.text}>{formatViews(Math.max(0, count))}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginLeft: 1,
    color: COLOR,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
