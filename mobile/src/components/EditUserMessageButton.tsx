/**
 * Botón de lápiz debajo de un mensaje del usuario (estilo ChatGPT / Claude).
 * Abre el texto en la barra de entrada para editarlo y reenviarlo.
 */
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { evoconnColors } from '@evoconn/theme/colors';

type Props = {
  onPress: () => void;
  /** Resalta cuando ese mensaje está en edición. */
  active?: boolean;
  disabled?: boolean;
};

export function EditUserMessageButton({ onPress, active, disabled }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.wrap, active && styles.wrapActive]}
      accessibilityLabel="Editar mensaje"
      accessibilityRole="button"
    >
      <Ionicons
        name="pencil"
        size={15}
        color={active ? evoconnColors.neonGreen : 'rgba(255,255,255,0.55)'}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginRight: 2,
    padding: 4,
    borderRadius: 6,
  },
  wrapActive: {
    backgroundColor: 'rgba(199,255,2,0.12)',
  },
});
