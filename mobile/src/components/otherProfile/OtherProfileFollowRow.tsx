import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProfileFollowButton } from './ProfileFollowButton';
import { ProfileMoreMenu } from './ProfileMoreMenu';

type Props = {
  userId: string;
  username: string;
  clanId: string | null | undefined;
  followersCount: number;
  followingCount: number;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export const OtherProfileFollowRow = React.memo(function OtherProfileFollowRow({
  userId,
  username,
  clanId,
  followersCount,
  followingCount,
}: Props) {
  return (
    <View style={styles.row}>
      {/* Seguir / Siguiendo button */}
      <ProfileFollowButton userId={userId} clanId={clanId} />

      <View style={styles.divider} />

      {/* Seguidores */}
      <View style={styles.stat}>
        <Text style={styles.value}>{formatCount(followersCount)}</Text>
        <Text style={styles.label}>Seguidores</Text>
      </View>

      <View style={styles.divider} />

      {/* Seguidos */}
      <View style={styles.stat}>
        <Text style={styles.value}>{formatCount(followingCount)}</Text>
        <Text style={styles.label}>Seguidos</Text>
      </View>

      {/* Three-dots menu */}
      <ProfileMoreMenu userId={userId} username={username} />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  stat: {
    flex: 1,
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
