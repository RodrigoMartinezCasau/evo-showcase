import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SharedItem } from '@evoconn/types/messaging';
import type { CommunityPost } from '@evoconn/types';
import type { BasicProfile } from '@evoconn/services/supabaseSocial';
import { UserAvatarFrame } from '@evoconn/components/shared/UserAvatarFrame';
import { formatProfileUsername } from '@evoconn/state/otherProfileCache';
import { SharedPostPreviewCard } from './SharedPostPreviewCard';

type Props = {
  item: SharedItem;
  myUserId: string;
  post?: CommunityPost | null;
  profile?: BasicProfile | null;
  onOpenPost?: (postId: string) => void;
  onOpenProfile?: (userId: string) => void;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

export const SharedItemBubble = React.memo(function SharedItemBubble({
  item,
  myUserId,
  post,
  profile,
  onOpenPost,
  onOpenProfile,
}: Props) {
  const isMine = item.senderId === myUserId;

  const postAuthorLabel = useMemo(() => {
    const raw = post?.author.username?.trim();
    if (!raw) return 'Publicación';
    return raw.startsWith('@') ? raw : `@${raw.toUpperCase()}`;
  }, [post?.author.username]);

  const profileLabel = useMemo(() => {
    if (!profile?.username) return 'Perfil';
    return formatProfileUsername(profile.username);
  }, [profile?.username]);

  const handlePress = () => {
    if (item.kind === 'post' && item.postId) {
      onOpenPost?.(item.postId);
    } else if (item.kind === 'profile' && item.profileUserId) {
      onOpenProfile?.(item.profileUserId);
    }
  };

  return (
    <View style={[styles.wrap, isMine ? styles.wrapMine : styles.wrapTheirs]}>
      <TouchableOpacity
        style={[styles.card, isMine ? styles.cardMine : styles.cardTheirs]}
        activeOpacity={0.85}
        onPress={handlePress}
      >
        {item.kind === 'post' ? (
          <Text style={styles.authorLabel} numberOfLines={1}>
            {postAuthorLabel}
          </Text>
        ) : (
          <View style={styles.iconRow}>
            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.kindLabel}>Perfil</Text>
          </View>
        )}

        {item.kind === 'post' && post ? (
          <SharedPostPreviewCard post={post} />
        ) : item.kind === 'profile' && profile ? (
          <View style={styles.profilePreview}>
            <UserAvatarFrame
              clanId={profile.clanId}
              avatarUri={profile.avatarUri}
              size={52}
              iconScale={1.05}
              deferRender
            />
            <Text style={styles.profileName} numberOfLines={1}>
              {profileLabel}
            </Text>
          </View>
        ) : (
          <Text style={styles.fallbackPreview} numberOfLines={2}>
            {item.kind === 'post' ? postAuthorLabel : 'Perfil'}
          </Text>
        )}

        <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    width: '100%',
  },
  wrapMine: {
    alignItems: 'flex-end',
  },
  wrapTheirs: {
    alignItems: 'flex-start',
  },
  card: {
    maxWidth: '82%',
    minWidth: 220,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardMine: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardTheirs: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  authorLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  kindLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  profilePreview: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  fallbackPreview: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    paddingVertical: 8,
  },
  time: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
});
