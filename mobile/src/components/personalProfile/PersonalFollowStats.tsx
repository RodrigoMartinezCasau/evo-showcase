import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FOLLOW_STATS_SEGUIDORES_SEGUIDOS_GAP } from '@evoconn/constants/personalProfileLayout';

type Props = {
  followersCount: number;
  followingCount: number;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export const PersonalFollowStats = React.memo(function PersonalFollowStats({
  followersCount,
  followingCount,
}: Props) {
  return (
    <View style={[styles.row, { gap: FOLLOW_STATS_SEGUIDORES_SEGUIDOS_GAP }]}>
      <View style={styles.stat}>
        <Text style={styles.value}>{formatCount(followersCount)}</Text>
        <Text style={styles.label}>Seguidores</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <Text style={styles.value}>{formatCount(followingCount)}</Text>
        <Text style={styles.label}>Seguidos</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  stat: {
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 0.4,
    opacity: 0.7,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
