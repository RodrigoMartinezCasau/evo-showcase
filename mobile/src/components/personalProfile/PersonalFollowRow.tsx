import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PersonalNotificationsButton } from './PersonalNotificationsButton';

type Props = {
  userId: string;
  username: string;
  clanId: string | null | undefined;
  followersCount: number;
  followingCount: number;
  /** Live count derived from the user's actual published posts. */
  totalPosts: number;
  onPostsPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export const PersonalFollowRow = React.memo(function PersonalFollowRow({
  followersCount,
  followingCount,
  totalPosts,
  onPostsPress,
  onFollowersPress,
  onFollowingPress,
}: Props) {
  return (
    <View style={styles.row}>
      {/* Publicaciones */}
      <TouchableOpacity
        style={styles.stat}
        onPress={onPostsPress}
        activeOpacity={onPostsPress ? 0.7 : 1}
        disabled={!onPostsPress}
      >
        <Text style={styles.value}>{formatCount(totalPosts)}</Text>
        <Text style={styles.label}>Publicaciones</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Seguidores */}
      <TouchableOpacity
        style={styles.stat}
        onPress={onFollowersPress}
        activeOpacity={onFollowersPress ? 0.7 : 1}
        disabled={!onFollowersPress}
      >
        <Text style={styles.value}>{formatCount(followersCount)}</Text>
        <Text style={styles.label}>Seguidores</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Seguidos */}
      <TouchableOpacity
        style={styles.stat}
        onPress={onFollowingPress}
        activeOpacity={onFollowingPress ? 0.7 : 1}
        disabled={!onFollowingPress}
      >
        <Text style={styles.value}>{formatCount(followingCount)}</Text>
        <Text style={styles.label}>Seguidos</Text>
      </TouchableOpacity>

      {/* Notification bell */}
      <PersonalNotificationsButton />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
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
