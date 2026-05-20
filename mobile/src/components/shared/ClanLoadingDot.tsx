/**
 * `ClanLoadingDot` — spinner pequeño con el color del clan, pensado para
 * mostrar mientras una pantalla está hidratando su contenido (patrón
 * "navegación instantánea + carga diferida", ver `useDeferredRender`).
 *
 * No usa Lottie / WebView para no añadir overhead al primer frame.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { getClanColor } from '@evoconn/constants/clanColors';

type Props = {
  clanId?: string | null;
  /** Cuando `false` (por defecto) ocupa toda la pantalla disponible y centra el spinner. */
  inline?: boolean;
};

export const ClanLoadingDot = React.memo(function ClanLoadingDot({
  clanId,
  inline = false,
}: Props) {
  const color = getClanColor(clanId ?? null);
  return (
    <View style={inline ? styles.inline : styles.fill}>
      <ActivityIndicator size="small" color={color} />
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
