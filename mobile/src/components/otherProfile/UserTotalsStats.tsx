import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  totalReflections: number;
  totalQuotes: number;
};

export const UserTotalsStats = React.memo(function UserTotalsStats({
  totalReflections,
  totalQuotes,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <Text style={styles.value}>{totalReflections}</Text>
        <Text style={styles.label}>Reflexiones{'\n'}totales</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.value}>{totalQuotes}</Text>
        <Text style={styles.label}>Frases{'\n'}totales</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  card: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
    color: '#FFFFFF',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    letterSpacing: 0.2,
    opacity: 0.7,
  },
});
