import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';

type PublishCardProps = {
  onPublish: () => void;
  disabled?: boolean;
};

export function PublishCard({ onPublish, disabled }: PublishCardProps) {
  return (
    <TouchableOpacity
      onPress={onPublish}
      disabled={disabled}
      style={[styles.card, disabled && styles.disabled]}
    >
      <Text style={styles.label}>PUBLICAR</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: evoconnColors.neonGreen,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  disabled: { opacity: 0.5 },
  label: { color: evoconnColors.background, fontWeight: '700', fontSize: 16 },
});
