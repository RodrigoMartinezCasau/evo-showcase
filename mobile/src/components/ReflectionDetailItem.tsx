import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanColor } from '@evoconn/constants/clanColors';
import { ClanBanner, RankBadge, VoteWidget } from '@evoconn/components';

type ReflectionDetailItemProps = {
  post: CommunityPost;
  /** Visible height for this item (full screen minus top/bottom bars). */
  itemHeight: number;
  onAuthorPress: (userId: string) => void;
  onClanPress: (clanId: string) => void;
};

export function ReflectionDetailItem({
  post,
  itemHeight,
  onAuthorPress,
  onClanPress,
}: ReflectionDetailItemProps) {
  const clanColor = getClanColor(post.author.clanId);

  return (
    <View style={[styles.container, { height: itemHeight }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => onAuthorPress(post.author.id)}>
          <Text style={styles.username}>{post.author.username}</Text>
        </TouchableOpacity>
        <View style={styles.badges}>
          {post.author.clanId ? (
            <TouchableOpacity onPress={() => onClanPress(post.author.clanId!)}>
              <ClanBanner clanId={post.author.clanId} shortLabel={post.author.clanId.toUpperCase()} small />
            </TouchableOpacity>
          ) : null}
          <RankBadge rank={post.author.rank} small />
        </View>
      </View>

      <View style={[styles.body, { borderLeftColor: clanColor }]}>
        {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
        <Text style={styles.bodyText}>{post.body}</Text>
      </View>

      <View style={styles.actions}>
        <VoteWidget stats={post.voteStats} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    justifyContent: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  username: {
    color: evoconnColors.text,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.4,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  body: {
    borderLeftWidth: 4,
    paddingLeft: 14,
    paddingVertical: 16,
    backgroundColor: evoconnColors.card,
    borderRadius: 12,
    marginBottom: 16,
    flex: 1,
  },
  title: {
    color: evoconnColors.text,
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 10,
  },
  bodyText: {
    color: evoconnColors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    paddingVertical: 12,
  },
});
