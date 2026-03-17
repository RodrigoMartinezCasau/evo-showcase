import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanCardColor } from '@evoconn/theme/theme';
import { ClanBanner } from './ClanBanner';
import { VoteWidget } from './VoteWidget';

type CommunityPostCardProps = {
  post: CommunityPost;
  onPress: () => void;
  onAuthorPress: () => void;
  onClanPress: () => void;
};

export function CommunityPostCard({ post, onPress, onAuthorPress, onClanPress }: CommunityPostCardProps) {
  const clanColor = getClanCardColor(post.author.clanId);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, { borderLeftColor: clanColor }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onAuthorPress}>
          <Text style={styles.username}>{post.author.username}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClanPress}>
          <ClanBanner clanId={post.author.clanId} shortLabel={post.author.clanId.toUpperCase()} small />
        </TouchableOpacity>
      </View>
      {post.type === 'reflection' && post.title && (
        <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
      )}
      <Text style={styles.body} numberOfLines={4}>{post.body}</Text>
      <View style={styles.footer}>
        <VoteWidget stats={post.voteStats} compact />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: evoconnColors.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderLeftWidth: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  username: { color: evoconnColors.text, fontWeight: '600', fontSize: 14 },
  title: { color: evoconnColors.text, fontWeight: '700', fontSize: 16, marginBottom: 6 },
  body: { color: evoconnColors.muted, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  footer: { marginTop: 4 },
});
