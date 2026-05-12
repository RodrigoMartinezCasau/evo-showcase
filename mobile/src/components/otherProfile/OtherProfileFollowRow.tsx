import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { OTHER_PROFILE_FOLLOW_ROW_TRACK_HEIGHT } from '@evoconn/constants/otherProfileLayout';
import { ProfileFollowButton } from './ProfileFollowButton';
import { ProfileMoreMenu } from './ProfileMoreMenu';

type Props = {
  userId: string;
  username: string;
  clanId: string | null | undefined;
  followersCount: number;
  followingCount: number;
  /** Total publicaciones (reflexiones + frases). */
  postsCount: number;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Misma anchura de referencia que la campana del perfil personal (~44 + badge). */
const TRAILING_ACTION_SLOT = 52;
/** Slot izquierdo para Seguir / Siguiendo; acotado para no comprimir los tres contadores flex. */
const LEADING_ACTION_SLOT = 112;

/**
 * Posts | Seguidores | Seguidos + menú ⋯; a la izquierda, Seguir / Siguiendo.
 * Cada bloque comparte la misma altura de pista para alinear centros en el eje Y.
 */
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
      <View style={styles.leadingSlot}>
        <ProfileFollowButton userId={userId} clanId={clanId} compact />
      </View>

      <View style={styles.statTrack}>
        <View style={styles.statInner}>
          <Text style={styles.value} numberOfLines={1}>
            {formatCount(postsCount)}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            Posts
          </Text>
        </View>
      </View>

      <View style={styles.dividerTrack}>
        <View style={styles.divider} />
      </View>

      <View style={styles.statTrack}>
        <View style={styles.statInner}>
          <Text style={styles.value} numberOfLines={1}>
            {formatCount(followersCount)}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            Seguidores
          </Text>
        </View>
      </View>

      <View style={styles.dividerTrack}>
        <View style={styles.divider} />
      </View>

      <View style={styles.statTrack}>
        <View style={styles.statInner}>
          <Text style={styles.value} numberOfLines={1}>
            {formatCount(followingCount)}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            Seguidos
          </Text>
        </View>
      </View>

      <View style={styles.trailingSlot}>
        <ProfileMoreMenu userId={userId} username={username} clanId={clanId} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: OTHER_PROFILE_FOLLOW_ROW_TRACK_HEIGHT + 16,
    flexWrap: 'nowrap',
  },
  leadingSlot: {
    width: LEADING_ACTION_SLOT,
    height: OTHER_PROFILE_FOLLOW_ROW_TRACK_HEIGHT,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailingSlot: {
    width: TRAILING_ACTION_SLOT,
    height: OTHER_PROFILE_FOLLOW_ROW_TRACK_HEIGHT,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTrack: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: OTHER_PROFILE_FOLLOW_ROW_TRACK_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerTrack: {
    height: OTHER_PROFILE_FOLLOW_ROW_TRACK_HEIGHT,
    width: 1,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  label: {
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 0.4,
    opacity: 0.7,
    textAlign: 'center',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
