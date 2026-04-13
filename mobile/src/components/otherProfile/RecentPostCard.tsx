import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { REFLECTION_PREVIEW_LAYOUT as L } from '@evoconn/constants/postPreviewLayout';

type Props = {
  post: CommunityPost;
  cardWidth: number;
  onPress: (post: CommunityPost) => void;
};

function voteRatioPct(up: number, down: number): number {
  return Math.round((up / Math.max(1, up + down)) * 100);
}

export const RecentPostCard = React.memo(function RecentPostCard({ post, cardWidth, onPress }: Props) {
  const isPhrase = post.type === 'phrase';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(post)}
      style={[styles.card, { width: cardWidth }]}
    >
      {isPhrase ? (
        /* ─── Phrase: unchanged ─────────────────────────────────────── */
        <>
          <View style={styles.phraseWrap}>
            <Text style={styles.quoteMarks}>"</Text>
            <Text style={styles.phraseBody} numberOfLines={5}>{post.body}</Text>
            {post.quoteAuthor ? (
              <Text style={styles.quoteAuthor}>— {post.quoteAuthor}</Text>
            ) : null}
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerStat}>▲ {post.voteStats.up}</Text>
            <Text style={styles.footerType}>Frase</Text>
          </View>
        </>
      ) : (
        /* ─── Reflection: title only + stats ────────────────────────── */
        <View style={styles.reflectionWrap}>

          {/* Title */}
          <View
            style={{
              transform: [
                { translateX: L.titleOffsetX },
                { translateY: L.titleOffsetY },
                { scale: L.titleScale },
              ],
            }}
          >
            <Text style={styles.reflectionTitle} numberOfLines={2}>
              {post.title ?? post.body.slice(0, 80)}
            </Text>
          </View>

          {/* Stats block */}
          <View
            style={[
              styles.statsBlock,
              {
                transform: [
                  { translateX: L.statsBlockOffsetX },
                  { translateY: L.statsBlockOffsetY },
                  { scale: L.statsBlockScale },
                ],
              },
            ]}
          >
            <View style={styles.statsRow}>

              {/* ▲ icon */}
              <View
                style={{
                  transform: [
                    { translateX: L.upIconOffsetX },
                    { translateY: L.upIconOffsetY },
                    { scale: L.upIconScale },
                  ],
                }}
              >
                <Text style={styles.statIconUp}>▲</Text>
              </View>

              {/* up count */}
              <View
                style={{
                  transform: [
                    { translateX: L.upCountOffsetX },
                    { translateY: L.upCountOffsetY },
                    { scale: L.upCountScale },
                  ],
                }}
              >
                <Text style={styles.statCount}>{post.voteStats.up}</Text>
              </View>

              {/* ▼ icon */}
              <View
                style={{
                  transform: [
                    { translateX: L.downIconOffsetX },
                    { translateY: L.downIconOffsetY },
                    { scale: L.downIconScale },
                  ],
                }}
              >
                <Text style={styles.statIconDown}>▼</Text>
              </View>

              {/* down count */}
              <View
                style={{
                  transform: [
                    { translateX: L.downCountOffsetX },
                    { translateY: L.downCountOffsetY },
                    { scale: L.downCountScale },
                  ],
                }}
              >
                <Text style={styles.statCount}>{post.voteStats.down}</Text>
              </View>

              {/* ★ icon */}
              <View
                style={{
                  transform: [
                    { translateX: L.savedIconOffsetX },
                    { translateY: L.savedIconOffsetY },
                    { scale: L.savedIconScale },
                  ],
                }}
              >
                <Text style={styles.statIconSaved}>★</Text>
              </View>

              {/* saved count */}
              <View
                style={{
                  transform: [
                    { translateX: L.savedCountOffsetX },
                    { translateY: L.savedCountOffsetY },
                    { scale: L.savedCountScale },
                  ],
                }}
              >
                <Text style={styles.statCount}>{post.voteStats.save}</Text>
              </View>

              {/* percentage */}
              <View
                style={{
                  transform: [
                    { translateX: L.percentageOffsetX },
                    { translateY: L.percentageOffsetY },
                    { scale: L.percentageScale },
                  ],
                }}
              >
                <Text style={styles.statPercentage}>
                  {voteRatioPct(post.voteStats.up, post.voteStats.down)}%
                </Text>
              </View>

            </View>
          </View>
        </View>
      )}
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

  /* ── Phrase ─────────────────────────────────────────────────────────── */
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

  /* ── Reflection ──────────────────────────────────────────────────────── */
  reflectionWrap: {
    flex: 1,
    justifyContent: 'space-between',
  },
  reflectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 20,
  },
  statsBlock: {
    // space-between in reflectionWrap naturally pushes this to the bottom
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  statIconUp: {
    color: 'rgba(100,220,100,0.85)',
    fontSize: 10,
    lineHeight: 13,
  },
  statIconDown: {
    color: 'rgba(220,100,100,0.85)',
    fontSize: 10,
    lineHeight: 13,
  },
  statIconSaved: {
    color: 'rgba(255,210,80,0.85)',
    fontSize: 10,
    lineHeight: 13,
  },
  statCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
    lineHeight: 13,
  },
  statPercentage: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.6,
    lineHeight: 13,
    letterSpacing: 0.2,
  },
});
