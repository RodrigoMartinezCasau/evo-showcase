import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Rank } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';

const RANK_LABELS: Record<Rank, string> = {
  aprendiz: 'Aprendiz',
  maestro: 'Maestro',
  filosofo: 'Filósofo',
};

type RankBadgeProps = {
  rank: Rank;
  small?: boolean;
};

export function RankBadge({ rank, small }: RankBadgeProps) {
  return (
    <View style={[styles.badge, small && styles.badgeSmall]}>
      <Text style={[styles.text, small && styles.textSmall]}>{RANK_LABELS[rank]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: evoconnColors.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSmall: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { color: evoconnColors.muted, fontSize: 12 },
  textSmall: { fontSize: 10 },
});
