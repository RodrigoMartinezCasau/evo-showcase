import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { evoconnColors } from '@evoconn/theme/colors';

type ReflectionBlockProps = {
  label: string;
  content: string;
  accentColor?: string;
};

export function ReflectionBlock({ label, content, accentColor }: ReflectionBlockProps) {
  const borderColor = accentColor ?? evoconnColors.accent;
  return (
    <View style={[styles.block, { borderLeftColor: borderColor }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.content}>{content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 10,
    marginVertical: 6,
    backgroundColor: evoconnColors.card,
    borderRadius: 8,
  },
  label: { color: evoconnColors.muted, fontSize: 12, marginBottom: 4 },
  content: { color: evoconnColors.text, fontSize: 14, lineHeight: 20 },
});
