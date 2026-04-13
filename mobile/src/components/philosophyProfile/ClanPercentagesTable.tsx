/**
 * Full clan percentages table.
 * Shows ALL clans, dominant clan first, rest sorted descending.
 * Always includes every clan even if percentage is 0.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ALL_CLANS: { clanId: string; label: string }[] = [
  { clanId: 'nihilista', label: 'Nihilista' },
  { clanId: 'cientista', label: 'Cientista' },
  { clanId: 'estoico', label: 'Estoico' },
  { clanId: 'existencialista', label: 'Existencialista' },
  { clanId: 'racionalista', label: 'Racionalista' },
  { clanId: 'humanista', label: 'Humanista' },
  { clanId: 'realista', label: 'Realista' },
  { clanId: 'trascendentalista', label: 'Trascendentalista' },
];

type ClanPct = { clanId: string; label: string; pct: number };

type Props = {
  percentages: ClanPct[];
};

export const ClanPercentagesTable = React.memo(function ClanPercentagesTable({
  percentages,
}: Props) {
  // Build a map from what the profile provides
  const pctMap = new Map<string, number>();
  for (const e of percentages) {
    pctMap.set(e.clanId, e.pct);
  }

  // Ensure every clan appears (0 if missing)
  const fullList: ClanPct[] = ALL_CLANS.map((c) => ({
    clanId: c.clanId,
    label: c.label,
    pct: pctMap.get(c.clanId) ?? 0,
  }));

  // Dominant first, then descending
  const sorted = [...fullList].sort((a, b) => b.pct - a.pct);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Distribución filosófica completa</Text>
      {sorted.map((entry, i) => (
        <View key={entry.clanId} style={styles.row}>
          <View style={styles.labelWrap}>
            {i === 0 && <View style={styles.dominantDot} />}
            <Text style={[styles.label, i === 0 && styles.dominantLabel]} numberOfLines={1}>
              {entry.label}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${entry.pct}%` }]} />
          </View>
          <Text style={[styles.pct, entry.pct === 0 && styles.pctZero]}>{entry.pct}%</Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000000',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.7,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  labelWrap: {
    width: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dominantDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  dominantLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  pct: {
    fontSize: 12,
    fontWeight: '700',
    width: 38,
    textAlign: 'right',
    color: '#FFFFFF',
  },
  pctZero: {
    opacity: 0.3,
  },
});
