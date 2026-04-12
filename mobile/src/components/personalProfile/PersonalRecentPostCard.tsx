import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { CommunityPost } from '@evoconn/types';

type Props = {
  post: CommunityPost;
  cardWidth: number;
  onPress: (post: CommunityPost) => void;
};

export const PersonalRecentPostCard = React.memo(function PersonalRecentPostCard({ post, cardWidth, onPress }: Props) {
  const isPhrase = post.type === 'phrase';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(post)}
      style={[styles.card, { width: cardWidth }]}
    >
      {isPhrase ? (
        <View style={styles.phraseWrap}>
          <Text style={styles.quoteMarks}>"</Text>
          <Text style={styles.phraseBody} numberOfLines={5}>{post.body}</Text>
          {post.quoteAuthor ? (
            <Text style={styles.quoteAuthor}>— {post.quoteAuthor}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.reflectionWrap}>
          {post.title ? (
            <Text style={styles.reflectionTitle} numberOfLines={2}>{post.title}</Text>
          ) : null}
          <Text style={styles.reflectionBody} numberOfLines={4}>{post.body}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerStat}>▲ {post.voteStats.up}</Text>
        <Text style={styles.footerType}>{isPhrase ? 'Frase' : 'Reflexión'}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000000',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    marginRight: 12,
    justifyContent: 'space-between',
    minHeight: 170,
  },
  phraseWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  quoteMarks: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 2,
  },
  phraseBody: {
    color: '#FFFFFF',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  quoteAuthor: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 6,
    opacity: 0.7,
  },
  reflectionWrap: {
    flex: 1,
  },
  reflectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  reflectionBody: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.85,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  footerStat: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  footerType: {
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    opacity: 0.5,
  },
});
