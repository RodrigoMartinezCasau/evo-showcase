import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { CommunityPost, Rank } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanColor } from '@evoconn/constants/clanColors';
import { ReflectionBackground } from './ReflectionBackground';
import { REFLECTION_DETAIL_RANK_BADGE_LAYOUT as RB, RANK_BADGE_COLORS, DETAIL_HEADER_ROW_OFFSET_Y } from '@evoconn/constants/reflectionDetailRankBadgeLayout';
import { DetailActionColumn } from './DetailActionColumn';
import { CommentCard } from './CommentCard';
import {
  REFLECTION_PANEL_LAYOUT as RP,
  COMMENTS_PANEL_LAYOUT as CP,
  PANELS_GAP,
  PANELS_BOTTOM_RESERVE,
  COMMENTS_CONTENT_INSETS,
} from '@evoconn/constants/reflectionPanelsLayout';
import { DETAIL_ACTION_COLUMN_LAYOUT as COL } from '@evoconn/constants/detailActionColumnLayout';
import { mockComments } from '@evoconn/data/mockComments';

const RANK_LABELS: Record<Rank, string> = {
  aprendiz: 'Aprendiz',
  maestro: 'Maestro',
  filosofo: 'Filósofo',
};

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

  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [saved, setSaved] = useState(false);

  const handleUpvote = useCallback(() => {
    setVoted((v) => (v === 'up' ? null : 'up'));
  }, []);
  const handleDownvote = useCallback(() => {
    setVoted((v) => (v === 'down' ? null : 'down'));
  }, []);
  const handleSave = useCallback(() => {
    setSaved((s) => !s);
  }, []);

  const [commentVotes, setCommentVotes] = useState<Record<string, boolean>>({});
  const toggleCommentVote = useCallback((commentId: string) => {
    setCommentVotes((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  }, []);

  const headerHeight = 52;
  const panelsAvailable =
    itemHeight - headerHeight - PANELS_BOTTOM_RESERVE - PANELS_GAP - 16;
  const commentsH = CP.height != null
    ? CP.height
    : Math.max(80, panelsAvailable * (1 - RP.heightRatio));
  const reflectionH = Math.max(80, panelsAvailable - commentsH);

  return (
    <View style={[styles.container, { height: itemHeight }]}>
      <ReflectionBackground clan={post.author.clanId}>
        <View style={styles.content}>
          {/* ── Header ── */}
          <View style={[styles.headerRow, { transform: [{ translateY: DETAIL_HEADER_ROW_OFFSET_Y }] }]}>
            <TouchableOpacity onPress={() => onAuthorPress(post.author.id)}>
              <Text style={styles.username}>{post.author.username}</Text>
            </TouchableOpacity>
            <View
              style={{
                backgroundColor: RANK_BADGE_COLORS[post.author.rank].backgroundColor,
                paddingHorizontal: RB.paddingHorizontal,
                paddingVertical: RB.paddingVertical,
                borderRadius: RB.borderRadius,
                transform: [
                  { translateX: RB.offsetX },
                  { translateY: RB.offsetY },
                ],
              }}
            >
              <Text
                style={{
                  color: RANK_BADGE_COLORS[post.author.rank].textColor,
                  fontSize: RB.fontSize,
                  fontWeight: RB.fontWeight,
                  letterSpacing: RB.letterSpacing,
                  textTransform: 'uppercase',
                }}
              >
                {RANK_LABELS[post.author.rank]}
              </Text>
            </View>
          </View>

          {/* ── Reflection panel (upper black box) ── */}
          <View
            style={[
              styles.reflectionPanel,
              {
                height: reflectionH,
                borderRadius: RP.borderRadius,
                backgroundColor: RP.backgroundColor,
                paddingHorizontal: RP.paddingHorizontal,
                paddingVertical: RP.paddingVertical,
                borderLeftColor: clanColor,
                transform: [
                  { translateX: RP.offsetX },
                  { translateY: RP.offsetY },
                  { scaleX: RP.widthScale },
                ],
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
              <Text style={styles.bodyText}>{post.body}</Text>
            </ScrollView>
          </View>

          <View style={{ height: PANELS_GAP }} />

          {/* ── Comments panel (lower black box) ── */}
          <View
            style={[
              styles.commentsPanel,
              {
                height: commentsH,
                borderRadius: CP.borderRadius,
                backgroundColor: CP.backgroundColor,
                paddingHorizontal: CP.paddingHorizontal,
                paddingVertical: CP.paddingVertical,
                transform: [
                  { translateX: CP.offsetX },
                  { translateY: CP.offsetY },
                  { scaleX: CP.widthScale },
                ],
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingTop: COMMENTS_CONTENT_INSETS.top,
                paddingBottom: COMMENTS_CONTENT_INSETS.bottom,
                paddingLeft: COMMENTS_CONTENT_INSETS.left,
                paddingRight: COMMENTS_CONTENT_INSETS.right,
              }}
            >
              {mockComments.map((c) => (
                <CommentCard
                  key={c.id}
                  username={c.author.username}
                  text={c.body}
                  clanId={c.author.clanId}
                  upvotes={
                    c.upCount + (commentVotes[c.id] ? 1 : 0)
                  }
                  isUpvoted={!!commentVotes[c.id]}
                  onUpvote={() => toggleCommentVote(c.id)}
                />
              ))}
            </ScrollView>
          </View>

          {/* ── Action column (absolute, independent layer) ── */}
          <View
            pointerEvents="box-none"
            style={[
              styles.actionCol,
              {
                transform: [
                  { translateX: COL.offsetX },
                  { translateY: COL.offsetY },
                ],
              },
            ]}
          >
            <DetailActionColumn
              clanId={post.author.clanId}
              upCount={post.voteStats.up}
              downCount={post.voteStats.down}
              saved={saved}
              voted={voted}
              onUpvote={handleUpvote}
              onDownvote={handleDownvote}
              onSave={handleSave}
              onClanPress={() => {
                if (post.author.clanId) onClanPress(post.author.clanId);
              }}
            />
          </View>
        </View>
      </ReflectionBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  username: {
    color: evoconnColors.text,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.4,
  },
  actionCol: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  reflectionPanel: {
    borderLeftWidth: 4,
    overflow: 'hidden',
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

  commentsPanel: {
    overflow: 'hidden',
  },
});
