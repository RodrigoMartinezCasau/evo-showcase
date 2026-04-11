import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTopBarInsigniaByHouse } from '@evoconn/utils/getTopBarInsigniaByHouse';
import type { Rank } from '@evoconn/types';

const RANK_LABELS: Record<Rank, string> = {
  aprendiz: 'Aprendiz',
  maestro: 'Maestro',
  filosofo: 'Filósofo',
};

type Props = {
  username: string;
  clanId: string | null;
  rank: Rank;
};

const SHIELD_SIZE = 62;

export const UserIdentityHeader = React.memo(function UserIdentityHeader({
  username,
  clanId,
  rank,
}: Props) {
  const ShieldSvg = useMemo(() => getTopBarInsigniaByHouse(clanId), [clanId]);
  const clanLabel = clanId
    ? clanId.charAt(0).toUpperCase() + clanId.slice(1)
    : 'Sin clan';

  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <Text style={styles.username} numberOfLines={1}>{username}</Text>
        <View style={styles.clanRankRow}>
          <Text style={styles.clanName}>{clanLabel}</Text>
          <View style={styles.rankPill}>
            <Text style={styles.rankText}>{RANK_LABELS[rank]}</Text>
          </View>
        </View>
      </View>
      <View style={styles.shieldWrap}>
        <ShieldSvg width={SHIELD_SIZE} height={SHIELD_SIZE} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  textBlock: {
    flex: 1,
    marginRight: 12,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  clanRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clanName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  rankPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 4,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  shieldWrap: {
    width: SHIELD_SIZE,
    height: SHIELD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
