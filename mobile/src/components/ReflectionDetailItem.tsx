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
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { FollowButton } from './FollowButton';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import { useNotifications } from '@evoconn/hooks/NotificationsContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import type { SimComment } from '@evoconn/data/simulation/simulatedNetwork';

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
  const { updatePostVote, updatePostSaveToggle, getPostById, getMyVote } = useFeedStore();
  const { savePost, unsavePost, isSaved } = usePersonalProfile();
  /** Fuente de verdad para votos y counts: usa el store en vivo, no el snapshot del overlay. */
  const livePost = getPostById(post.id) ?? post;

  // Vote state derived from the shared voteMap — stays in sync across all feeds.
  const voted = getMyVote(post.id);
  // Save state comes from shared context — no local state needed
  const saved = isSaved(post.id);
  const [commentsReady, setCommentsReady] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const readingModeRef = useRef(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setCommentsReady(true);
    });
    return () => task.cancel();
  }, []);

  const handleUpvote = useCallback(() => {
    const next: 'up' | null = voted === 'up' ? null : 'up';
    updatePostVote(post.id, voted, next);
  }, [post.id, voted, updatePostVote]);

  const handleDownvote = useCallback(() => {
    const next: 'down' | null = voted === 'down' ? null : 'down';
    updatePostVote(post.id, voted, next);
  }, [post.id, voted, updatePostVote]);

  const handleSave = useCallback(() => {
    const now = !isSaved(post.id);
    updatePostSaveToggle(post.id, !now, now);
    if (now) savePost(post);
    else unsavePost(post.id);
  }, [post, isSaved, updatePostSaveToggle, savePost, unsavePost]);

  const { commentsMap, addComment: addSimComment, users: simUsers, ensureCommentsForPost } = useSimulation();

  // Fetch fresh comments from Supabase the first time this post is opened.
  useEffect(() => {
    ensureCommentsForPost(post.id).catch(console.error);
  // We only want to run this once per post open, not on every update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const [commentVotes, setCommentVotes] = useState<Record<string, boolean>>({});
  const toggleCommentVote = useCallback((commentId: string) => {
    setCommentVotes((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  }, []);

  // Comments come from the shared persistent store — no local state needed.
  const contextComments = useMemo<Comment[]>(() => {
    const simComments = commentsMap[post.id] ?? [];
    return simComments.map((sc): Comment => {
      const su = simUsers[sc.authorId];
      const isSelf = sc.authorId === mockCurrentUser.id;
      return {
        id: sc.id,
        author: su
          ? { id: su.id, username: su.username, clanId: su.clanId, rank: su.rank }
          // Self: use live mockCurrentUser (stays up to date if they change username).
          : isSelf
            ? { id: mockCurrentUser.id, username: mockCurrentUser.username, clanId: mockCurrentUser.clanId, rank: mockCurrentUser.rank }
            // Other real users: use snapshot stored at comment time.
            : {
                id: sc.authorId,
                username: sc.authorUsername ?? '?',
                clanId: sc.authorClanId ?? null,
                rank: sc.authorRank ?? 'aprendiz',
              },
        body: sc.body,
        upCount: sc.upCount,
        createdAt: sc.createdAt,
      };
    });
  }, [commentsMap, post.id, simUsers]);

  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());

  const handleBlockUser = useCallback((userId: string) => {
    setBlockedUsers((prev) => new Set(prev).add(userId));
  }, []);

  const { addNotification } = useNotifications();

  const handleAddComment = useCallback((text: string) => {
    const newId = `co-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const simComment: SimComment = {
      id: newId,
      postId: post.id,
      authorId: mockCurrentUser.id,
      // Snapshot so the username survives restarts and is visible to other users.
      authorUsername: mockCurrentUser.username,
      authorClanId: mockCurrentUser.clanId,
      authorRank: mockCurrentUser.rank,
      body: text,
      upCount: 0,
      createdAt: new Date().toISOString(),
    };
    addSimComment(simComment);
    addNotification({
      recipientUserId: post.author.id,
      type: 'comment',
      fromUserId: mockCurrentUser.id,
      fromUsername: mockCurrentUser.username,
      targetPostId: post.id,
      targetCommentId: newId,
      textPreview: text.trim().slice(0, 80),
    });
  }, [addSimComment, addNotification, post.author.id, post.id]);

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
    () => contextComments.filter((c) => !blockedUsers.has(c.author.id)),
    [contextComments, blockedUsers],
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
                        onAuthorPress={() => onAuthorPress(c.author.id)}
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
