import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Keyboard,
  Platform,
  Animated,
  Easing,
  useWindowDimensions,
  InteractionManager,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { CommunityPost, Comment } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { getClanColor, NO_CLAN_COMMUNITY_POST_FRAME_COLOR } from '@evoconn/constants/clanColors';
import { ReflectionBackground } from './ReflectionBackground';
import { DETAIL_HEADER_ROW_OFFSET_Y, DETAIL_HEADER_ROW_OFFSET_X } from '@evoconn/constants/reflectionDetailRankBadgeLayout';
import { DetailActionColumn } from './DetailActionColumn';
import type { DetailActionColumnHandle } from './DetailActionColumn';
import { CommentCard } from './CommentCard';
import { NewCommentBox } from './NewCommentBox';
import { ClanSendButton } from './ChatInputBar';
import {
  REFLECTION_PANEL_LAYOUT as RP,
  COMMENTS_PANEL_LAYOUT as CP,
  PANELS_GAP,
  PANELS_BOTTOM_RESERVE,
  COMMENTS_CONTENT_INSETS,
  REFLECTION_TEXT_RIGHT_INSET,
  DETAIL_TITLE_LAYOUT as TL,
} from '@evoconn/constants/reflectionPanelsLayout';
import {
  DETAIL_ACTION_COLUMN_LAYOUT as COL,
  DETAIL_CLAN_BUTTON_LAYOUT as CLAN_L,
} from '@evoconn/constants/detailActionColumnLayout';
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
import { blockUser, insertReport, isRealUserId } from '@evoconn/services/supabaseSocial';
import { useAuth } from '../../mobile/lib/AuthContext';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { computePhraseDetailTypography } from '@evoconn/utils/phraseDetailTypography';
import { getAppPostOpenUrl } from '@evoconn/utils/appShareLinks';
import {
  EvoActionSheetModal,
  EvoConfirmModal,
  EvoInfoModal,
  EvoPickerModal,
} from '@evoconn/components/shared/EvoActionSheetModal';
import type { EvoActionOption } from '@evoconn/components/shared/EvoActionSheetModal';
import { PanelStarField } from '@evoconn/components/animations/StarFieldBackground';

/** Matches `styles.content` horizontal padding — used until the reflection panel is measured. */
const REFLECTION_DETAIL_CONTENT_PAD_H = 16;

type ReflectionDetailItemProps = {
  post: CommunityPost;
  /** Visible height for this item (full screen minus top/bottom bars). */
  itemHeight: number;
  onAuthorPress: (userId: string) => void;
  onClanPress: (clanId: string) => void;
  onReadingModeChange?: (active: boolean) => void;
  /**
   * Community vertical pager (Para ti / Siguiendo): don’t capture the root responder so the
   * outer FlatList can scroll; enable long-reflection “Ver más” reliably with nested scroll.
   */
  communityVerticalFeed?: boolean;
};

export const ReflectionDetailItem = React.memo(function ReflectionDetailItem({
  post,
  itemHeight,
  onAuthorPress,
  onClanPress,
  onReadingModeChange,
  communityVerticalFeed = false,
}: ReflectionDetailItemProps) {
  const isNoClanAuthor =
    post.author.clanId == null || String(post.author.clanId).trim() === '';
  const clanColor = getClanColor(post.author.clanId);
  const reflectionPanelBorderColor = evoconnColors.background;
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

  // Measure the reflection panel to anchor the action column exactly.
  const [reflPanelLayout, setReflPanelLayout] = useState<{
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const handleReflPanelLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, width, height } = e.nativeEvent.layout;
    setReflPanelLayout(prev => {
      if (
        prev &&
        Math.abs(prev.y - y) < 1 &&
        Math.abs(prev.width - width) < 1 &&
        Math.abs(prev.height - height) < 1
      ) {
        return prev;
      }
      return { y, width, height };
    });
  }, []);

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
  const { session } = useAuth();

  const [postMoreSheetOpen, setPostMoreSheetOpen] = useState(false);
  const [reportReasonPickerOpen, setReportReasonPickerOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalMessage, setInfoModalMessage] = useState('');

  const handleBlockUser = useCallback(async (userId: string) => {
    setBlockedUsers((prev) => new Set(prev).add(userId));
    if (session?.user && isRealUserId(session.user.id) && isRealUserId(userId)) {
      await blockUser(session.user.id, userId).catch(console.error);
    }
  }, [session]);

  const { addNotification } = useNotifications();
  const { recordComment } = useRecommendationTaste();

  const handleAddComment = useCallback(
    async (text: string) => {
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
      await addSimComment(simComment);
      recordComment(post);
      addNotification({
        recipientUserId: post.author.id,
        type: 'comment',
        fromUserId: mockCurrentUser.id,
        fromUsername: mockCurrentUser.username,
        targetPostId: post.id,
        targetCommentId: newId,
        textPreview: text.trim().slice(0, 80),
      });
    },
    [addSimComment, addNotification, recordComment, post, post.author.id, post.id],
  );

  const { isFollowing: checkFollowing, toggleFollow } = useFollowState();

  const showInfo = useCallback((title: string, message: string) => {
    setInfoModalTitle(title);
    setInfoModalMessage(message);
    setInfoModalOpen(true);
  }, []);

  const submitReport = useCallback(
    async (reason: string) => {
      if (session?.user) {
        await insertReport({
          reporterId: session.user.id,
          targetType: 'post',
          targetId: post.id,
          reason,
        }).catch(console.error);
      }
      showInfo('Publicación denunciada', 'Gracias por tu reporte. Lo revisaremos pronto.');
    },
    [session, post.id, showInfo],
  );

  const reportPickerItems = useMemo(
    () => [
      {
        key: 'inap',
        label: 'Contenido inapropiado',
        onPress: () => void submitReport('Contenido inapropiado'),
      },
      {
        key: 'spam',
        label: 'Spam',
        onPress: () => void submitReport('Spam'),
      },
      {
        key: 'abuso',
        label: 'Acoso o abuso',
        onPress: () => void submitReport('Acoso o abuso'),
      },
    ],
    [submitReport],
  );

  const postMoreOptions = useMemo((): EvoActionOption[] => {
    const following = checkFollowing(post.author.id);
    return [
      {
        key: 'share',
        label: 'Compartir',
        onPress: () => {
          void (async () => {
            try {
              const text = (livePost.body || livePost.title || '').trim();
              const preview = text.length > 240 ? `${text.slice(0, 237)}…` : text;
              const url = getAppPostOpenUrl(livePost.id);
              await Share.share({
                message: `${livePost.author.username}: «${preview}»\n\n${url}`,
                url,
              });
            } catch {
              /* user cancelled */
            }
          })();
        },
      },
      {
        key: 'follow',
        label: following ? 'Dejar de seguir' : 'Seguir usuario',
        onPress: () => toggleFollow(post.author.id),
      },
      {
        key: 'report',
        label: 'Denunciar publicación',
        onPress: () => setReportReasonPickerOpen(true),
      },
      {
        key: 'block',
        label: 'Bloquear usuario',
        destructive: true,
        onPress: () => setBlockConfirmOpen(true),
      },
    ];
  }, [post, livePost, checkFollowing, toggleFollow]);

  const handleMorePress = useCallback(() => {
    setPostMoreSheetOpen(true);
  }, []);

  const confirmBlockUser = useCallback(() => {
    handleBlockUser(post.author.id);
    showInfo('Usuario bloqueado', `@${post.author.username} ha sido bloqueado.`);
  }, [handleBlockUser, post.author.id, post.author.username, showInfo]);

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

  /**
   * The reflection panel uses `transform: [{ scaleX: widthScale }]`. Layout still uses the unscaled
   * width, so `Text` wraps with fewer lines than what you see — "Ver más" never triggers. Constrain
   * the text column to the scaled width so `onTextLayout` matches the real wrap.
   */
  const reflectionTextColumnWidth = useMemo(() => {
    const inner =
      reflPanelLayout && reflPanelLayout.width > 0
        ? Math.max(1, reflPanelLayout.width - 2 * RP.paddingHorizontal)
        : Math.max(
            1,
            screenW - 2 * REFLECTION_DETAIL_CONTENT_PAD_H - 2 * RP.paddingHorizontal,
          );
    return Math.max(1, (inner - REFLECTION_TEXT_RIGHT_INSET) * RP.widthScale);
  }, [screenW, reflPanelLayout]);

  const headerHeight = 52;
  const panelsAvailable =
    itemHeight - headerHeight - PANELS_BOTTOM_RESERVE - PANELS_GAP - 16;
  const commentsH = CP.height != null
    ? CP.height
    : Math.max(80, panelsAvailable * (1 - RP.heightRatio));
  const reflectionH = Math.max(80, panelsAvailable - commentsH);

  const isPhrase = post.type === 'phrase';

  /** Effective width for phrase wrap (panel scale + quote paddings). */
  const phraseTextMaxWidth = useMemo(() => {
    const inner =
      reflPanelLayout && reflPanelLayout.width > 0
        ? Math.max(1, reflPanelLayout.width - 2 * RP.paddingHorizontal)
        : Math.max(
            1,
            screenW - 2 * REFLECTION_DETAIL_CONTENT_PAD_H - 2 * RP.paddingHorizontal,
          );
    const afterPad = inner - QL.maxWidthReductionLeft - QL.maxWidthReductionRight;
    return Math.max(1, afterPad * RP.widthScale);
  }, [screenW, reflPanelLayout]);

  const phraseAvailHeight = useMemo(
    () => Math.max(48, reflectionH - RP.paddingVertical * 2 - 14),
    [reflectionH],
  );

  const phraseTypography = useMemo(() => {
    if (!isPhrase) return null;
    const quoted = `\u201C${post.body}\u201D`;
    return computePhraseDetailTypography(
      quoted,
      post.quoteAuthor,
      phraseTextMaxWidth,
      phraseAvailHeight,
      QL.fontSize,
      QL.lineHeight,
      QAL.fontSize,
      8,
    );
  }, [
    isPhrase,
    post.body,
    post.quoteAuthor,
    phraseTextMaxWidth,
    phraseAvailHeight,
    QL.fontSize,
    QL.lineHeight,
    QAL.fontSize,
  ]);

  /** Correct rare underestimation: shrink fonts in small steps until native layout fits the viewport. */
  const [phraseFitMultiplier, setPhraseFitMultiplier] = useState(1);
  const [phraseOverflowScroll, setPhraseOverflowScroll] = useState(false);
  const phraseViewportHRef = useRef(0);
  const phraseContentHRef = useRef(0);
  const phraseFitMultiplierRef = useRef(1);

  const phraseSizes = useMemo(() => {
    if (!phraseTypography) return null;
    const m = phraseFitMultiplier;
    return {
      quoteFontSize: Math.max(9, Math.round(phraseTypography.quoteFontSize * m)),
      quoteLineHeight: Math.max(
        Math.round(phraseTypography.quoteLineHeight * m),
        Math.round(phraseTypography.quoteFontSize * m) + 4,
      ),
      authorFontSize: Math.max(9, Math.round(phraseTypography.authorFontSize * m)),
      authorLineHeight: Math.max(
        Math.round(phraseTypography.authorLineHeight * m),
        Math.round(phraseTypography.authorFontSize * m) + 3,
      ),
    };
  }, [phraseTypography, phraseFitMultiplier]);

  const applyPhraseViewportFit = useCallback(() => {
    const ch = phraseContentHRef.current;
    const vh = phraseViewportHRef.current;
    if (vh <= 0) return;
    if (ch <= vh + 2) {
      setPhraseOverflowScroll(false);
      return;
    }
    const prev = phraseFitMultiplierRef.current;
    if (prev > 0.72) {
      const next = Math.max(0.72, Math.round((prev - 0.05) * 100) / 100);
      phraseFitMultiplierRef.current = next;
      setPhraseFitMultiplier(next);
    } else {
      setPhraseOverflowScroll(true);
    }
  }, []);

  const onPhraseScrollViewportLayout = useCallback(
    (e: LayoutChangeEvent) => {
      phraseViewportHRef.current = e.nativeEvent.layout.height;
      applyPhraseViewportFit();
    },
    [applyPhraseViewportFit],
  );

  const onPhraseContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      phraseContentHRef.current = e.nativeEvent.layout.height;
      applyPhraseViewportFit();
    },
    [applyPhraseViewportFit],
  );

  useEffect(() => {
    phraseFitMultiplierRef.current = phraseFitMultiplier;
  }, [phraseFitMultiplier]);

  const BODY_LINE_HEIGHT = 24;
  const titleOccupied = post.title ? 32 : 0;
  const readMoreSpace = 22;
  const bodyAvailableH = reflectionH - RP.paddingVertical * 2 - titleOccupied - readMoreSpace;
  const maxBodyLines = Math.max(2, Math.floor(bodyAvailableH / BODY_LINE_HEIGHT));

  const [isLongText, setIsLongText] = useState(false);
  const isLongTextRef = useRef(false);
  const reflectionScrollLayoutH = useRef(0);
  const reflectionContentH = useRef(0);

  /** Bumps when scroll viewport height is first measured so body Text re-runs onTextLayout with a reliable budget. */
  const [bodyLayoutKey, setBodyLayoutKey] = useState(0);
  const scrollViewportReadyRef = useRef(false);

  useEffect(() => {
    setIsLongText(false);
    isLongTextRef.current = false;
    reflectionScrollLayoutH.current = 0;
    reflectionContentH.current = 0;
    scrollViewportReadyRef.current = false;
    readingModeRef.current = false;
    setReadingMode(false);
    setBodyLayoutKey(0);
    setPhraseFitMultiplier(1);
    phraseFitMultiplierRef.current = 1;
    setPhraseOverflowScroll(false);
    phraseViewportHRef.current = 0;
    phraseContentHRef.current = 0;
    onReadingModeChange?.(false);
  }, [post.id, onReadingModeChange]);

  const checkOverflow = useCallback(() => {
    if (isLongTextRef.current) return;
    const containerH = reflectionScrollLayoutH.current;
    const contentH = reflectionContentH.current;
    if (containerH > 0 && contentH > containerH + 0.5) {
      isLongTextRef.current = true;
      setIsLongText(true);
    }
  }, []);

  useEffect(() => {
    if (isPhrase) return;
    const task = InteractionManager.runAfterInteractions(() => checkOverflow());
    return () => task.cancel();
  }, [post.body, post.id, reflectionH, isPhrase, checkOverflow]);

  const handleReflectionScrollLayout = useCallback((e: any) => {
    const h = e.nativeEvent.layout.height;
    if (h <= 0) return;
    reflectionScrollLayoutH.current = h;
    checkOverflow();
  }, [checkOverflow]);

  /** Row wraps track + ScrollView; height is reliable when inner ScrollView reports 0 (pager / clipping). */
  const handleReflectionScrollRowLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h <= 0) return;
      reflectionScrollLayoutH.current = h;
      if (!scrollViewportReadyRef.current) {
        scrollViewportReadyRef.current = true;
        setBodyLayoutKey(k => k + 1);
      }
      checkOverflow();
    },
    [checkOverflow],
  );

  const handleReflectionContentSize = useCallback((_w: number, h: number) => {
    reflectionContentH.current = h;
    checkOverflow();
  }, [checkOverflow]);

  type BodyTextLayoutEvent = NativeSyntheticEvent<{ lines: Array<{ y: number; height: number }> }>;

  const handleBodyTextLayout = useCallback(
    (e: BodyTextLayoutEvent) => {
      if (isLongTextRef.current || readingModeRef.current) return;
      const lines = e.nativeEvent?.lines;
      if (!lines?.length) return;

      const titleBlockH = post.title ? titleOccupied + 10 : 0;
      const viewportBudget =
        reflectionScrollLayoutH.current > 0
          ? Math.max(1, reflectionScrollLayoutH.current - titleBlockH)
          : bodyAvailableH;

      const approxCharsPerLine = Math.max(
        14,
        Math.floor(reflectionTextColumnWidth / (BODY_LINE_HEIGHT * 0.45)),
      );
      const bodyLen = post.body.trim().length;
      const newlineBlocks = post.body.split(/\n/).length;

      if (lines.length > maxBodyLines) {
        isLongTextRef.current = true;
        setIsLongText(true);
        return;
      }

      if (newlineBlocks > maxBodyLines) {
        isLongTextRef.current = true;
        setIsLongText(true);
        return;
      }

      if (lines.length >= maxBodyLines && bodyLen > approxCharsPerLine * (maxBodyLines - 0.4)) {
        isLongTextRef.current = true;
        setIsLongText(true);
        return;
      }

      const last = lines[lines.length - 1]!;
      const lastBottom = last.y + (last.height > 0 ? last.height : BODY_LINE_HEIGHT);
      if (lastBottom > viewportBudget - 1) {
        isLongTextRef.current = true;
        setIsLongText(true);
      }
    },
    [
      maxBodyLines,
      bodyAvailableH,
      post.title,
      titleOccupied,
      post.body,
      reflectionTextColumnWidth,
    ],
  );

  const visibleComments = useMemo(
    () => contextComments.filter((c) => !blockedUsers.has(c.author.id)),
    [contextComments, blockedUsers],
  );

  const actionColStyle = useMemo(() => {
    if (reflPanelLayout) {
      // Compute the panel's visual right edge in container coordinates.
      // The panel layout width = content area width = screenW - 2 * paddingH.
      // scaleX(RP.widthScale) shrinks from center → right edge recedes by
      // layoutWidth * (1 - widthScale) / 2.
      // translateX(RP.offsetX) shifts visually.
      const PADDING_H = 16;
      const contentW = screenW - 2 * PADDING_H;
      const panelVisualRight =
        PADDING_H + contentW / 2 + (contentW * RP.widthScale) / 2 + RP.offsetX;

      // Column width = maxClanW. Shift center columnCenterInset px inside the panel
      // so the wider column stays within screen bounds.
      const COL_FIXED_WIDTH = COL.maxClanW;

      // Clan badge protrudes 5% of panel height above the grey box top.
      // Container height extends 5% upward so the bottom stays at the panel bottom.
      const overhang = reflPanelLayout.height * 0.05;
      const fullH = reflPanelLayout.height * 1.05;
      // verticalFillRatio shrinks the icon group and centers it inside the panel.
      const fillRatio = COL.verticalFillRatio;
      const verticalShift = (fullH * (1 - fillRatio)) / 2;
      return {
        position: 'absolute' as const,
        left: panelVisualRight - COL_FIXED_WIDTH / 2 - COL.columnCenterInset,
        top: reflPanelLayout.y - overhang + verticalShift,
        zIndex: 10,
      };
    }
    // Fallback while reflPanelLayout hasn't been measured yet.
    return {
      position: 'absolute' as const,
      left: screenW - 70 + COL.offsetX,
      top: itemHeight / 2 + COL.offsetY,
      zIndex: 10,
    };
  }, [screenW, itemHeight, reflPanelLayout]);

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

    const onShow = (e: { endCoordinates: { screenY: number }; duration?: number }) => {
      const kbTopY = e.endCoordinates.screenY;
      const duration = Platform.OS === 'ios' ? (e.duration ?? 250) : 220;
      newCommentMeasureRef.current?.measureInWindow((x, y, _w, h) => {
        const boxBottom = y + h;
        const overlap = boxBottom - kbTopY;
        const target = overlap > 0 ? -(overlap + 10) : 0;
        kbOffset.stopAnimation();
        Animated.timing(kbOffset, {
          toValue: target,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    };

    const onHide = (e: { duration?: number }) => {
      kbOffset.stopAnimation();
      Animated.timing(kbOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e.duration ?? 250) : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
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
    <>
    <View
      style={[styles.container, { height: itemHeight }]}
      onStartShouldSetResponder={() => (communityVerticalFeed ? false : !readingMode)}
      onResponderRelease={dismissKeyboard}
    >
      <ReflectionBackground clan={post.author.clanId}>
        <View style={styles.content}>
          {/* ── Header ── */}
          <View style={[styles.headerRow, { transform: [{ translateX: DETAIL_HEADER_ROW_OFFSET_X }, { translateY: DETAIL_HEADER_ROW_OFFSET_Y }] }]}>
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
            onLayout={handleReflPanelLayout}
            style={[
              styles.reflectionPanel,
              {
                height: reflectionH,
                borderRadius: RP.borderRadius,
                backgroundColor: evoconnColors.background,
                paddingHorizontal: RP.paddingHorizontal,
                paddingVertical: RP.paddingVertical,
                borderLeftColor: reflectionPanelBorderColor,
                borderBottomWidth: 4,
                borderBottomColor: reflectionPanelBorderColor,
                transform: [
                  { translateX: RP.offsetX },
                  { translateY: RP.offsetY },
                  { scaleX: RP.widthScale },
                ],
              },
            ]}
          >
            <PanelStarField />
            {isPhrase ? (
              <ScrollView
                scrollEnabled={phraseOverflowScroll}
                onLayout={onPhraseScrollViewportLayout}
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
                showsVerticalScrollIndicator={phraseOverflowScroll}
                nestedScrollEnabled
              >
                <View style={styles.phraseQuoteStack} onLayout={onPhraseContentLayout}>
                  <Text
                    style={[
                      styles.quoteText,
                      phraseSizes && {
                        fontSize: phraseSizes.quoteFontSize,
                        lineHeight: phraseSizes.quoteLineHeight,
                        maxWidth: phraseTextMaxWidth,
                      },
                    ]}
                  >
                    {`\u201C${post.body}\u201D`}
                  </Text>
                  {post.quoteAuthor ? (
                    <Text
                      style={[
                        styles.quoteAuthor,
                        phraseSizes && {
                          fontSize: phraseSizes.authorFontSize,
                          lineHeight: phraseSizes.authorLineHeight,
                          maxWidth: phraseTextMaxWidth,
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
                </View>
              </ScrollView>
            ) : (
              <View style={styles.reflectionScrollRow} onLayout={handleReflectionScrollRowLayout}>
                <ScrollView
                  style={[styles.reflectionScroll, styles.reflectionScrollFlex]}
                  scrollEnabled={readingMode && isLongText}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  bounces={readingMode && isLongText}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={[
                    styles.reflectionScrollContent,
                    !isLongText && styles.reflectionScrollContentCentered,
                  ]}
                  onLayout={handleReflectionScrollLayout}
                  onContentSizeChange={handleReflectionContentSize}
                >
                  <View style={[styles.reflectionScrollTextOuter, !isLongText && styles.reflectionScrollTextOuterCentered]}>
                    <View style={{ width: reflectionTextColumnWidth, alignItems: !isLongText ? 'center' : 'flex-start' }}>
                      {post.title ? (
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.title,
                            !isLongText && styles.textCentered,
                            {
                              transform: [
                                // When centered, cancel the left-aligned offsetX so the
                                // title's center axis aligns with the body's center axis.
                                { translateX: isLongText ? TL.offsetX : 0 },
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
                        key={bodyLayoutKey}
                        style={[styles.bodyText, !isLongText && styles.textCentered]}
                        numberOfLines={!readingMode && isLongText ? maxBodyLines : undefined}
                        onTextLayout={handleBodyTextLayout}
                      >
                        {post.body}
                      </Text>
                      {!readingMode && isLongText ? (
                        <Text style={styles.readMoreLabel}>Ver más...</Text>
                      ) : null}
                    </View>
                  </View>
                </ScrollView>
              </View>
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
                backgroundColor: evoconnColors.background,
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
                      {
                        zIndex: 30,
                        transform: [{ translateY: kbOffset }],
                      },
                    ]}
                  >
                    <NewCommentBox onSend={handleAddComment} clanColor={clanColor} />
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
          avatarUri={post.author.avatarUri}
          upCount={livePost.voteStats.up}
          downCount={livePost.voteStats.down}
          saved={saved}
          voted={voted}
          onUpvote={handleUpvote}
          onDownvote={handleDownvote}
          onSave={handleSave}
          onClanPress={handleClanPressAction}
          onMorePress={handleMorePress}
          containerHeight={reflPanelLayout ? reflPanelLayout.height * 1.05 * COL.verticalFillRatio : undefined}
        />
      </View>
    </View>

      <EvoActionSheetModal
        visible={postMoreSheetOpen}
        onClose={() => setPostMoreSheetOpen(false)}
        title={post.title?.trim() ? String(post.title) : 'Publicación'}
        options={postMoreOptions}
      />
      <EvoPickerModal
        visible={reportReasonPickerOpen}
        onClose={() => setReportReasonPickerOpen(false)}
        title="Denunciar publicación"
        items={reportPickerItems}
      />
      <EvoConfirmModal
        visible={blockConfirmOpen}
        onClose={() => setBlockConfirmOpen(false)}
        title="Bloquear usuario"
        message={`¿Bloquear a @${post.author.username}?`}
        confirmLabel="Bloquear"
        destructive
        onConfirm={confirmBlockUser}
      />
      <EvoInfoModal
        visible={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title={infoModalTitle}
        message={infoModalMessage}
      />
    </>
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
  reflectionScrollRow: {
    flex: 1,
    alignItems: 'stretch',
  },
  reflectionScrollContent: {
    flexGrow: 1,
    width: '100%',
  },
  /** Applied when the body fits without "Ver más" — centers the text block vertically inside the panel, matching phrase behavior. */
  reflectionScrollContentCentered: {
    justifyContent: 'center',
  },
  /** Applied to title and body when the reflection is short — centers text horizontally like a phrase. */
  textCentered: {
    textAlign: 'center',
  },
  /** Full width so the inner column can stay left-aligned; a narrow-only child made the strip hug the wrong edge. */
  reflectionScrollTextOuter: {
    width: '100%',
    alignItems: 'flex-start',
  },
  reflectionScrollTextOuterCentered: {
    alignItems: 'center',
  },
  reflectionScroll: {
    flex: 1,
  },
  reflectionScrollFlex: {
    minWidth: 0,
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
  phraseQuoteStack: {
    alignItems: 'center',
    width: '100%',
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
