import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type PctEntry = { clanId: string; label: string; pct: number };

type Props = {
  percentages: PctEntry[];
};

export const PhilosophyPercentagesPanel = React.memo(function PhilosophyPercentagesPanel({ percentages }: Props) {
  const sorted = [...percentages].sort((a, b) => b.pct - a.pct);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pensamiento filosófico</Text>
      {sorted.map((entry) => (
        <View key={entry.clanId} style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>{entry.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${entry.pct}%` }]} />
          </View>
          <Text style={styles.pct}>{entry.pct}%</Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    backgroundColor: '#000000',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    width: 110,
  },
  barTrack: {
    flex: 1,
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  pct: {
    fontSize: 13,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
    color: '#FFFFFF',
  },
});
