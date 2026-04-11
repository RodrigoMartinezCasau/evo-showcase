import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Share, Keyboard, Platform, Animated, useWindowDimensions, InteractionManager } from 'react-native';
import type { CommunityPost, Comment } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanColor } from '@evoconn/constants/clanColors';
import { ReflectionBackground } from './ReflectionBackground';
import { DETAIL_HEADER_ROW_OFFSET_Y } from '@evoconn/constants/reflectionDetailRankBadgeLayout';
import { DetailActionColumn } from './DetailActionColumn';
import type { DetailActionColumnHandle } from './DetailActionColumn';
import { CommentCard } from './CommentCard';
import { NewCommentBox } from './NewCommentBox';
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
import {
  DETAIL_QUOTE_LAYOUT as QL,
  DETAIL_QUOTE_AUTHOR_LAYOUT as QAL,
} from '@evoconn/constants/detailQuoteLayout';
import { mockComments } from '@evoconn/data/mockComments';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { FollowButton } from './FollowButton';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';

type ReflectionDetailItemProps = {
  post: CommunityPost;
  /** Visible height for this item (full screen minus top/bottom bars). */
  itemHeight: number;
  onAuthorPress: (userId: string) => void;
  onClanPress: (clanId: string) => void;
  onReadingModeChange?: (active: boolean) => void;
};

export const ReflectionDetailItem = React.memo(function ReflectionDetailItem({
  post,
  itemHeight,
  onAuthorPress,
  onClanPress,
  onReadingModeChange,
}: ReflectionDetailItemProps) {
  const clanColor = getClanColor(post.author.clanId);
  const actionColRef = useRef<DetailActionColumnHandle>(null);
  const { updatePostVote, updatePostSaveToggle, getPostById } = useFeedStore();
  /** Fuente de verdad para votos: el feed overlay guarda un snapshot en `post`; el store se actualiza al votar. */
  const livePost = getPostById(post.id) ?? post;

  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [saved, setSaved] = useState(false);
  const votedRef = useRef<'up' | 'down' | null>(null);
  const savedRef = useRef(false);
  const [commentsReady, setCommentsReady] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const readingModeRef = useRef(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setCommentsReady(true);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    setVoted(null);
    setSaved(false);
    votedRef.current = null;
    savedRef.current = false;
  }, [post.id]);

  const handleUpvote = useCallback(() => {
    const prev = votedRef.current;
    const next = prev === 'up' ? null : 'up';
    votedRef.current = next;
    updatePostVote(post.id, prev, next);
    setVoted(next);
  }, [post.id, updatePostVote]);

  const handleDownvote = useCallback(() => {
    const prev = votedRef.current;
    const next = prev === 'down' ? null : 'down';
    votedRef.current = next;
    updatePostVote(post.id, prev, next);
    setVoted(next);
  }, [post.id, updatePostVote]);

  const handleSave = useCallback(() => {
    const was = savedRef.current;
    const now = !was;
    savedRef.current = now;
    updatePostSaveToggle(post.id, was, now);
    setSaved(now);
  }, [post.id, updatePostSaveToggle]);

  const [commentVotes, setCommentVotes] = useState<Record<string, boolean>>({});
  const toggleCommentVote = useCallback((commentId: string) => {
    setCommentVotes((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  }, []);

  const [localComments, setLocalComments] = useState<Comment[]>(mockComments);
  const commentIdCounter = useRef(mockComments.length);

  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());

  const handleBlockUser = useCallback((userId: string) => {
    setBlockedUsers((prev) => new Set(prev).add(userId));
  }, []);

  const handleAddComment = useCallback((text: string) => {
    commentIdCounter.current += 1;
    const newComment: Comment = {
      id: `user-co-${commentIdCounter.current}`,
      author: mockCurrentUser,
      body: text,
      upCount: 0,
      createdAt: new Date().toISOString(),
    };
    setLocalComments((prev) => [...prev, newComment]);
  }, []);

  const { isFollowing: checkFollowing, toggleFollow } = useFollowState();

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

  const TAP_MOVE_THRESHOLD = 10;
  const panelLastTap = useRef(0);
  const panelSingleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const didMoveRef = useRef(false);

  useEffect(() => {
    return () => {
      if (panelSingleTapTimer.current) clearTimeout(panelSingleTapTimer.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const fireTap = useCallback(() => {
    const now = Date.now();
    if (now - panelLastTap.current < 300) {
      if (panelSingleTapTimer.current) clearTimeout(panelSingleTapTimer.current);
      panelLastTap.current = 0;
      actionColRef.current?.triggerUpvoteBounce();
      handleUpvote();
    } else {
      panelLastTap.current = now;
      panelSingleTapTimer.current = setTimeout(() => {
        if (!isLongTextRef.current) return;
        const next = !readingModeRef.current;
        readingModeRef.current = next;
        setReadingMode(next);
        onReadingModeChange?.(next);
      }, 300);
    }
  }, [handleUpvote, onReadingModeChange]);

  const handlePanelTouchStart = useCallback((e: any) => {
    const { pageX, pageY } = e.nativeEvent;
    touchStartRef.current = { x: pageX, y: pageY };
    didMoveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      handleMorePress();
    }, 500);
  }, [handleMorePress]);

  const handlePanelTouchMove = useCallback((e: any) => {
    if (didMoveRef.current) return;
    const { pageX, pageY } = e.nativeEvent;
    const dx = Math.abs(pageX - touchStartRef.current.x);
    const dy = Math.abs(pageY - touchStartRef.current.y);
    if (dx > TAP_MOVE_THRESHOLD || dy > TAP_MOVE_THRESHOLD) {
      didMoveRef.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handlePanelTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!didMoveRef.current) {
      fireTap();
    }
  }, [fireTap]);

  const handlePanelTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const { width: screenW } = useWindowDimensions();

  const headerHeight = 52;
  const panelsAvailable =
    itemHeight - headerHeight - PANELS_BOTTOM_RESERVE - PANELS_GAP - 16;
  const commentsH = CP.height != null
    ? CP.height
    : Math.max(80, panelsAvailable * (1 - RP.heightRatio));
  const reflectionH = Math.max(80, panelsAvailable - commentsH);

  const isPhrase = post.type === 'phrase';

  const BODY_LINE_HEIGHT = 24;
  const titleOccupied = post.title ? 32 : 0;
  const readMoreSpace = 22;
  const bodyAvailableH = reflectionH - RP.paddingVertical * 2 - titleOccupied - readMoreSpace;
  const maxBodyLines = Math.max(2, Math.floor(bodyAvailableH / BODY_LINE_HEIGHT));

  const [isLongText, setIsLongText] = useState(false);
  const isLongTextRef = useRef(false);

  useEffect(() => {
    setIsLongText(false);
    isLongTextRef.current = false;
    reflectionScrollLayoutH.current = 0;
    reflectionContentH.current = 0;
    readingModeRef.current = false;
    setReadingMode(false);
    onReadingModeChange?.(false);
  }, [post.id, onReadingModeChange]);

  const reflectionScrollLayoutH = useRef(0);
  const reflectionContentH = useRef(0);

  const checkOverflow = useCallback(() => {
    if (isLongTextRef.current) return;
    const containerH = reflectionScrollLayoutH.current;
    const contentH = reflectionContentH.current;
    if (containerH > 0 && contentH > containerH + 1) {
      isLongTextRef.current = true;
      setIsLongText(true);
    }
  }, []);

  const handleReflectionScrollLayout = useCallback((e: any) => {
    reflectionScrollLayoutH.current = e.nativeEvent.layout.height;
    checkOverflow();
  }, [checkOverflow]);

  const handleReflectionContentSize = useCallback((_w: number, h: number) => {
    reflectionContentH.current = h;
    checkOverflow();
  }, [checkOverflow]);

  const visibleComments = useMemo(
    () => localComments.filter((c) => !blockedUsers.has(c.author.id)),
    [localComments, blockedUsers],
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

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const kbOffset = useRef(new Animated.Value(0)).current;
  const newCommentMeasureRef = useRef<View>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: { endCoordinates: { screenY: number; height: number }; duration?: number }) => {
      const kbTopY = e.endCoordinates.screenY;
      newCommentMeasureRef.current?.measure((_x, _y, _w, h, _px, pageY) => {
        if (h <= 0) return;
        const boxBottom = pageY + h;
        const overlap = boxBottom - kbTopY;
        if (overlap > 0) {
          Animated.timing(kbOffset, {
            toValue: -(overlap + 10),
            duration: Platform.OS === 'ios' ? (e.duration ?? 250) : 220,
            useNativeDriver: false,
          }).start();
        }
      });
    };

    const onHide = (e: { duration?: number }) => {
      Animated.timing(kbOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e.duration ?? 250) : 220,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow as any);
    const hideSub = Keyboard.addListener(hideEvent, onHide as any);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [kbOffset]);

  return (
    <View style={[styles.container, { height: itemHeight }]} onStartShouldSetResponder={() => !readingMode} onResponderRelease={dismissKeyboard}>
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
          <View
            onTouchStart={handlePanelTouchStart}
            onTouchMove={handlePanelTouchMove}
            onTouchEnd={handlePanelTouchEnd}
            onTouchCancel={handlePanelTouchCancel}
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
            {isPhrase ? (
              <ScrollView
                contentContainerStyle={[
                  styles.quoteCenter,
                  {
                    flexGrow: 1,
                    paddingLeft: QL.maxWidthReductionLeft,
                    paddingRight: QL.maxWidthReductionRight,
                    transform: [
                      { translateX: QL.offsetX },
                      { translateY: QL.offsetY },
                    ],
                  },
                ]}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <Text
                  style={[
                    styles.quoteText,
                    { fontSize: QL.fontSize, lineHeight: QL.lineHeight },
                  ]}
                >
                  {`\u201C${post.body}\u201D`}
                </Text>
                {post.quoteAuthor ? (
                  <Text
                    style={[
                      styles.quoteAuthor,
                      {
                        fontSize: QAL.fontSize,
                        transform: [
                          { translateX: QAL.offsetX },
                          { translateY: QAL.offsetY },
                        ],
                      },
                    ]}
                  >
                    {post.quoteAuthor}
                  </Text>
                ) : null}
              </ScrollView>
            ) : (
              <ScrollView
                scrollEnabled={readingMode && isLongText}
                showsVerticalScrollIndicator={readingMode && isLongText}
                nestedScrollEnabled
                bounces={readingMode && isLongText}
                keyboardShouldPersistTaps="handled"
                style={styles.reflectionScroll}
                contentContainerStyle={{ paddingRight: REFLECTION_TEXT_RIGHT_INSET }}
                onLayout={handleReflectionScrollLayout}
                onContentSizeChange={handleReflectionContentSize}
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
                <Text
                  style={styles.bodyText}
                  numberOfLines={!readingMode && isLongText ? maxBodyLines : undefined}
                >
                  {post.body}
                </Text>
                {!readingMode && isLongText ? (
                  <Text style={styles.readMoreLabel}>Ver más...</Text>
                ) : null}
              </ScrollView>
            )}
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
            {commentsReady ? (
              <>
                <View style={[styles.commentsClip, { borderRadius: CP.borderRadius }]}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    style={styles.commentsScroll}
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
                </View>
                <View ref={newCommentMeasureRef} collapsable={false}>
                  <Animated.View
                    style={[
                      styles.newCommentRow,
                      { top: kbOffset, zIndex: 30 },
                    ]}
                  >
                    <NewCommentBox onSend={handleAddComment} />
                  </Animated.View>
                </View>
              </>
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
          upCount={livePost.voteStats.up}
          downCount={livePost.voteStats.down}
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
  reflectionScroll: {
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
  readMoreLabel: {
    color: '#AAAAAA',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },

  quoteCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  quoteAuthor: {
    color: '#CCCCCC',
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
  },

  commentsPanel: {
  },
  commentsClip: {
    flex: 1,
    overflow: 'hidden',
  },
  commentsScroll: {
    flex: 1,
  },
  newCommentRow: {
    paddingTop: 6,
  },
});
