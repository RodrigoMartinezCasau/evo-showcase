import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, StyleSheet, Alert, Share, useWindowDimensions, InteractionManager } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanColor } from '@evoconn/constants/clanColors';
import { ReflectionBackground } from './ReflectionBackground';
import { DETAIL_HEADER_ROW_OFFSET_Y } from '@evoconn/constants/reflectionDetailRankBadgeLayout';
import { DetailActionColumn } from './DetailActionColumn';
import type { DetailActionColumnHandle } from './DetailActionColumn';
import { CommentCard } from './CommentCard';
import {
  REFLECTION_PANEL_LAYOUT as RP,
  COMMENTS_PANEL_LAYOUT as CP,
  PANELS_GAP,
  PANELS_BOTTOM_RESERVE,
  COMMENTS_CONTENT_INSETS,
  REFLECTION_TEXT_RIGHT_INSET,
  DETAIL_TITLE_LAYOUT as TL,
} from '@evoconn/constants/reflectionPanelsLayout';
import { DETAIL_ACTION_COLUMN_LAYOUT as COL } from '@evoconn/constants/detailActionColumnLayout';
import { mockComments } from '@evoconn/data/mockComments';
import { FollowButton } from './FollowButton';
import { useFollowState } from '@evoconn/hooks/useFollowState';

function useDoubleTap(callback: () => void, delay = 300) {
  const lastTap = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < delay) {
      callback();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }, [callback, delay]);
}

type ReflectionDetailItemProps = {
  post: CommunityPost;
  /** Visible height for this item (full screen minus top/bottom bars). */
  itemHeight: number;
  onAuthorPress: (userId: string) => void;
  onClanPress: (clanId: string) => void;
};

export const ReflectionDetailItem = React.memo(function ReflectionDetailItem({
  post,
  itemHeight,
  onAuthorPress,
  onClanPress,
}: ReflectionDetailItemProps) {
  const clanColor = getClanColor(post.author.clanId);
  const actionColRef = useRef<DetailActionColumnHandle>(null);

  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [saved, setSaved] = useState(false);
  const [commentsReady, setCommentsReady] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setCommentsReady(true);
    });
    return () => task.cancel();
  }, []);

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

  const { isFollowing: checkFollowing, toggleFollow } = useFollowState();

  const handlePostDoubleTapUpvote = useCallback(() => {
    actionColRef.current?.triggerUpvoteBounce();
    handleUpvote();
  }, [handleUpvote]);
  const handlePostDoubleTap = useDoubleTap(handlePostDoubleTapUpvote);

  const handleMorePress = useCallback(() => {
    const following = checkFollowing(post.author.id);
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
        text: following ? 'Dejar de seguir' : 'Seguir usuario',
        onPress: () => {
          toggleFollow(post.author.id);
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
  }, [post, handleBlockUser, checkFollowing, toggleFollow]);

  const { width: screenW } = useWindowDimensions();

  const headerHeight = 52;
  const panelsAvailable =
    itemHeight - headerHeight - PANELS_BOTTOM_RESERVE - PANELS_GAP - 16;
  const commentsH = CP.height != null
    ? CP.height
    : Math.max(80, panelsAvailable * (1 - RP.heightRatio));
  const reflectionH = Math.max(80, panelsAvailable - commentsH);

  const visibleComments = useMemo(
    () => mockComments.filter((c) => !blockedUsers.has(c.author.id)),
    [blockedUsers],
  );

  const actionColStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: screenW - 70 + COL.offsetX,
    top: itemHeight / 2 + COL.offsetY,
    zIndex: 10,
  }), [screenW, itemHeight]);

  const handleClanPressAction = useCallback(() => {
    if (post.author.clanId) onClanPress(post.author.clanId);
  }, [post.author.clanId, onClanPress]);

  const handleAuthorPressAction = useCallback(() => {
    onAuthorPress(post.author.id);
  }, [post.author.id, onAuthorPress]);

  return (
    <View style={[styles.container, { height: itemHeight }]}>
      <ReflectionBackground clan={post.author.clanId}>
        <View style={styles.content}>
          {/* ── Header ── */}
          <View style={[styles.headerRow, { transform: [{ translateY: DETAIL_HEADER_ROW_OFFSET_Y }] }]}>
            <View style={styles.usernameFollowRow}>
              <TouchableOpacity onPress={handleAuthorPressAction}>
                <Text style={styles.username}>{post.author.username}</Text>
              </TouchableOpacity>
              <FollowButton
                authorId={post.author.id}
                authorClanId={post.author.clanId}
                context="detail"
              />
            </View>
          </View>

          {/* ── Reflection panel (upper black box) ── */}
          <Pressable
            onPress={handlePostDoubleTap}
            onLongPress={handleMorePress}
            delayLongPress={500}
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
              contentContainerStyle={{ paddingRight: REFLECTION_TEXT_RIGHT_INSET }}
            >
              {post.title ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.title,
                    {
                      transform: [
                        { translateX: TL.offsetX },
                        { translateY: TL.offsetY },
                        { scale: TL.scale },
                      ],
                    },
                  ]}
                >
                  {post.title.length > TL.maxCharacters
                    ? post.title.slice(0, TL.maxCharacters) + '…'
                    : post.title}
                </Text>
              ) : null}
              <Text style={styles.bodyText}>{post.body}</Text>
            </ScrollView>
          </Pressable>

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
            {commentsReady ? (
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
                {visibleComments.map((c) => (
                  <CommentCard
                    key={c.id}
                    authorId={c.author.id}
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
            ) : null}
          </View>

        </View>
      </ReflectionBackground>

      {/* ── Action column (pixel-pinned, independent of any layout) ── */}
      <View
        pointerEvents="box-none"
        style={actionColStyle}
      >
        <DetailActionColumn
          ref={actionColRef}
          clanId={post.author.clanId}
          upCount={post.voteStats.up}
          downCount={post.voteStats.down}
          saved={saved}
          voted={voted}
          onUpvote={handleUpvote}
          onDownvote={handleDownvote}
          onSave={handleSave}
          onClanPress={handleClanPressAction}
          onMorePress={handleMorePress}
        />
      </View>
    </View>
  );
});

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
  usernameFollowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  username: {
    color: evoconnColors.text,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.4,
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
