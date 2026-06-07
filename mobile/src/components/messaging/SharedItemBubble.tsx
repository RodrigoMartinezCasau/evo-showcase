import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SharedItem } from '@evoconn/types/messaging';
import type { CommunityPost } from '@evoconn/types';
import type { BasicProfile } from '@evoconn/services/supabaseSocial';
import { formatProfileUsername } from '@evoconn/state/otherProfileCache';

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

  const label = useMemo(() => {
    if (item.kind === 'post') {
      if (!post) return 'Publicación';
      const preview = (post.title ?? post.body ?? '').trim();
      const short = preview.length > 80 ? `${preview.slice(0, 77)}…` : preview;
      return post.type === 'phrase' ? `Frase: ${short}` : short || 'Reflexión';
    }
    const uname = profile?.username
      ? formatProfileUsername(profile.username)
      : 'Perfil';
    return `Perfil ${uname}`;
  }, [item.kind, post, profile]);

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
        <View style={styles.iconRow}>
          <Ionicons
            name={item.kind === 'post' ? 'document-text-outline' : 'person-outline'}
            size={18}
            color="rgba(255,255,255,0.7)"
          />
          <Text style={styles.kindLabel}>
            {item.kind === 'post' ? 'Publicación' : 'Perfil'}
          </Text>
        </View>
        <Text style={styles.preview} numberOfLines={3}>
          {label}
        </Text>
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardMine: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardTheirs: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kindLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  preview: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
  },
  time: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
});
