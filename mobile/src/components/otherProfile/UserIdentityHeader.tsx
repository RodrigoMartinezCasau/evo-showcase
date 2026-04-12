import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTopBarInsigniaByHouse } from '@evoconn/utils/getTopBarInsigniaByHouse';
import type { Rank } from '@evoconn/types';
import {
  SHIELD_OFFSET_X,
  SHIELD_OFFSET_Y,
  SHIELD_SCALE,
  SHIELD_BASE_SIZE,
  USERNAME_OFFSET_X,
  USERNAME_OFFSET_Y,
  USERNAME_FONT_SIZE,
  CLAN_OFFSET_X,
  CLAN_OFFSET_Y,
  CLAN_FONT_SIZE,
  RANK_OFFSET_X,
  RANK_OFFSET_Y,
  RANK_FONT_SIZE,
} from '@evoconn/constants/otherProfileLayout';

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
        <Text
          style={[
            styles.username,
            {
              fontSize: USERNAME_FONT_SIZE,
              transform: [{ translateX: USERNAME_OFFSET_X }, { translateY: USERNAME_OFFSET_Y }],
            },
          ]}
          numberOfLines={1}
        >
          {username}
        </Text>
        <View style={styles.clanRankRow}>
          <Text
            style={[
              styles.clanName,
              {
                fontSize: CLAN_FONT_SIZE,
                transform: [{ translateX: CLAN_OFFSET_X }, { translateY: CLAN_OFFSET_Y }],
              },
            ]}
          >
            {clanLabel}
          </Text>
          <View
            style={[
              styles.rankPill,
              { transform: [{ translateX: RANK_OFFSET_X }, { translateY: RANK_OFFSET_Y }] },
            ]}
          >
            <Text style={[styles.rankText, { fontSize: RANK_FONT_SIZE }]}>{RANK_LABELS[rank]}</Text>
          </View>
        </View>
      </View>
      <View
        style={[
          styles.shieldWrap,
          {
            width: SHIELD_BASE_SIZE,
            height: SHIELD_BASE_SIZE,
            marginTop: -SHIELD_BASE_SIZE / 2,
            transform: [
              { translateX: SHIELD_OFFSET_X },
              { translateY: SHIELD_OFFSET_Y },
              { scale: SHIELD_SCALE },
            ],
          },
        ]}
      >
        <ShieldSvg width={SHIELD_BASE_SIZE} height={SHIELD_BASE_SIZE} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingHorizontal: 20,
  },
  textBlock: {
    paddingRight: SHIELD_BASE_SIZE + 20,
  },
  username: {
    color: '#FFFFFF',
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
    fontWeight: '600',
    opacity: 0.7,
  },
  shieldWrap: {
    position: 'absolute',
    right: 0,
    top: '50%',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
