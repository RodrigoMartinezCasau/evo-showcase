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
  /** Total publicaciones (reflexiones + frases) mostrado en la fila de stats. */
  postsCount: number;
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
  postsCount,
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

      <View style={styles.divider} />

      <View style={styles.stat}>
        <Text style={styles.value}>{formatCount(postsCount)}</Text>
        <Text style={styles.label}>Posts</Text>
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
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexWrap: 'wrap',
    rowGap: 8,
  },
  stat: {
    minWidth: 56,
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
