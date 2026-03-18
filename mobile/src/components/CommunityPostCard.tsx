import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanBgAsset, getClanColor } from '@evoconn/constants/clanColors';
import { VoteWidget } from './VoteWidget';

type CommunityPostCardProps = {
  post: CommunityPost;
  onPress: () => void;
  onAuthorPress: () => void;
  onClanPress: () => void;
};

export function CommunityPostCard({ post, onPress, onAuthorPress, onClanPress }: CommunityPostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isReflection = post.type === 'reflection';
  const outerColor = getClanColor(post.author.clanId);
  const outerAsset = getClanBgAsset(post.author.clanId);
  const innerAsset = useMemo(
    () => require('../assets/cards/reflection/inner_black.png'),
    []
  );

  const handleCardPress = () => {
    if (isReflection && !expanded) {
      setExpanded(true);
      return;
    }
    onPress();
  };

  if (!isReflection) {
    // Keep phrase cards unchanged for now.
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.phraseCard]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onAuthorPress}>
            <Text style={styles.username}>{post.author.username}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.body} numberOfLines={4}>
          {post.body}
        </Text>
        <View style={styles.footer}>
          <VoteWidget stats={post.voteStats} compact />
        </View>
      </TouchableOpacity>
    );
  }

  const Outer = outerAsset ? ImageBackground : View;
  const outerProps = outerAsset
    ? { source: outerAsset, resizeMode: 'stretch' as const }
    : {};

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={handleCardPress}>
      <Outer
        {...outerProps}
        style={[styles.outer, { backgroundColor: outerColor }]}
        imageStyle={styles.outerImage}
      >
        <View style={styles.coloredHeader}>
          <TouchableOpacity onPress={onAuthorPress}>
            <Text style={styles.usernameHeader}>{post.author.username}</Text>
          </TouchableOpacity>
        </View>

        <ImageBackground
          source={innerAsset}
          resizeMode="stretch"
          style={styles.inner}
          imageStyle={styles.innerImage}
        >
          {post.title ? (
            <Text style={styles.title} numberOfLines={2}>
              {post.title}
            </Text>
          ) : null}

          <Text style={styles.bodyInner} numberOfLines={expanded ? undefined : 6}>
            {post.body}
          </Text>

          <View style={styles.footer}>
            <VoteWidget stats={post.voteStats} compact />
          </View>
        </ImageBackground>
      </Outer>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  phraseCard: {
    backgroundColor: evoconnColors.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  username: { color: evoconnColors.text, fontWeight: '600', fontSize: 14 },
  outer: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 18,
    overflow: 'hidden',
    padding: 10,
  },
  outerImage: {
    borderRadius: 18,
  },
  coloredHeader: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
  },
  usernameHeader: { color: evoconnColors.background, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  inner: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  innerImage: {
    borderRadius: 14,
  },
  title: { color: evoconnColors.text, fontWeight: '800', fontSize: 18, marginBottom: 8 },
  body: { color: evoconnColors.muted, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  bodyInner: { color: evoconnColors.text, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  footer: { marginTop: 4 },
});
