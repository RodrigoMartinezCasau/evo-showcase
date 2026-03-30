import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Share } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanColor } from '@evoconn/constants/clanColors';
import { ReflectionBackground } from './ReflectionBackground';
import { DETAIL_HEADER_ROW_OFFSET_Y } from '@evoconn/constants/reflectionDetailRankBadgeLayout';
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

  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());

  const handleBlockUser = useCallback((userId: string) => {
    setBlockedUsers((prev) => new Set(prev).add(userId));
  }, []);

  const handleMorePress = useCallback(() => {
    Alert.alert(post.title ?? 'Publicación', undefined, [
      {
        text: 'Compartir',
        onPress: async () => {
          try {
            await Share.share({
              message: `${post.author.username}: "${post.body}"`,
            });
          } catch (_) { /* user cancelled */ }
        },
      },
      {
        text: 'Denunciar publicación',
        onPress: () => {
          Alert.alert('Publicación denunciada', 'Gracias por tu reporte.');
        },
      },
      {
        text: 'Bloquear usuario',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Bloquear usuario',
            `¿Bloquear a @${post.author.username}?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Bloquear',
                style: 'destructive',
                onPress: () => {
                  handleBlockUser(post.author.id);
                  Alert.alert('Usuario bloqueado', `@${post.author.username} ha sido bloqueado.`);
                },
              },
            ],
          );
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [post, handleBlockUser]);

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
              {mockComments
                .filter((c) => !blockedUsers.has(c.author.id))
                .map((c) => (
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
                  onReport={() => console.log(`Reported comment ${c.id}`)}
                  onBlockUser={() => handleBlockUser(c.author.id)}
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
              onMorePress={handleMorePress}
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
