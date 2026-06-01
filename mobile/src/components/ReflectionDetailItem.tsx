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
import { ReflectionBackground } from './ReflectionBackground';
import { DETAIL_HEADER_ROW_OFFSET_Y, DETAIL_HEADER_ROW_OFFSET_X } from '@evoconn/constants/reflectionDetailRankBadgeLayout';
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
import { FirstUsersTesterBadge } from './shared/FirstUsersTesterBadge';
import { PROFILE_TESTER_BADGE_SIZE } from '@evoconn/constants/personalProfileLayout';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import { useNotifications } from '@evoconn/hooks/NotificationsContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import type { SimComment } from '@evoconn/data/simulation/simulatedNetwork';
import {
  insertReport,
  isRealUserId,
  deleteComment as dbDeleteComment,
  fetchProfilesBatch,
  type BasicProfile,
} from '@evoconn/services/supabaseSocial';
import { useBlockedUsers } from '@evoconn/hooks/BlockedUsersContext';
import { useAuth } from '../../mobile/lib/AuthContext';
import { useIsAdmin } from '@evoconn/hooks/useIsAdmin';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { rankCommentsForViewer } from '@evoconn/logic/comments/commentRanking';
import { useIncrementalList } from '@evoconn/hooks/useIncrementalList';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import { computePhraseDetailTypography } from '@evoconn/utils/phraseDetailTypography';
import { buildPostShareMessage } from '@evoconn/utils/appShareLinks';
import {
  EvoActionSheetModal,
  EvoConfirmModal,
  EvoInfoModal,
  EvoPickerModal,
} from '@evoconn/components/shared/EvoActionSheetModal';
import type { EvoActionOption } from '@evoconn/components/shared/EvoActionSheetModal';
import { PanelStarField } from '@evoconn/components/animations/StarFieldBackground';
import { ClanCardFeedRimOverlay } from './ClanCardFeedRimOverlay';
import { getClanColor } from '@evoconn/constants/clanColors';
import {
  NEW_COMMENT_BOX_LAYOUT as INBOX,
  NEW_COMMENT_SEND_BUTTON_LAYOUT as SEND_BTN,
} from '@evoconn/constants/newCommentBoxLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** “Ver más” / lectura: mismo tamaño aprox. que el título escalado, sin `transform: scale` (evita recorte por `overflow: hidden` del panel). */
const REFLECTION_TITLE_LONG_FONT_SIZE = Math.round(20 * TL.scale);
const REFLECTION_TITLE_LONG_LINE_HEIGHT = Math.round(REFLECTION_TITLE_LONG_FONT_SIZE * 1.28);

/** Matches `styles.content` horizontal padding — used until the reflection panel is measured. */
const REFLECTION_DETAIL_CONTENT_PAD_H = 16;

/**
 * Android OEMs often disagree between `endCoordinates.screenY` and `height` vs the app window.
 * Prefer `windowHeight - height` when `height` is known, and only blend with `screenY` when it
 * matches that estimate (otherwise `screenY` can sit under the keys and clip the composer).
 */
function androidKeyboardTopY(
  end: { screenY: number; height?: number },
  windowHeight: number,
): number {
  if (!Number.isFinite(windowHeight) || windowHeight < 120) {
    const sy = end.screenY;
    return sy > 0 ? sy : 0;
  }
  const h = end.height ?? 0;
  const { screenY } = end;
  if (h > 0) {
    const fromHeight = windowHeight - h;
    const tolerance = Math.max(64, windowHeight * 0.15);
    const plausible =
      screenY > 40 &&
      screenY < windowHeight - 24 &&
      Math.abs(screenY - fromHeight) < tolerance;
    if (plausible) {
      return Math.min(fromHeight, screenY);
    }
    return fromHeight;
  }
  if (screenY > 40 && screenY < windowHeight - 24) {
    return screenY;
  }
  return windowHeight;
}

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
  /**
   * Fill behind twinkling stars in the reflection panel. Vista AMPLIADA
   * (Para Ti y Siguiendo) = app background. Other screens: omit → app background.
   */
  reflectionStarSurfaceColor?: string;
  /** Centrar y resaltar un comentario concreto (p. ej. notificación de comentario). */
  highlightCommentId?: string;
  /**
   * Muestra la etiqueta "Republicado por @X / por ti" entre la publicación y los
   * comentarios. SOLO en el feed de Para Ti (no en Siguiendo ni otras pantallas).
   */
  showRepostLabel?: boolean;
};

/** Comentarios raíz mostrados por bloque (se cargan más al hacer scroll). */
const COMMENTS_PAGE_SIZE = 8;

function findCommentThreadRoot(comments: Comment[], targetId: string): string | undefined {
  const byId = new Map(comments.map((c) => [c.id, c]));
  let cur = byId.get(targetId);
  if (!cur) return undefined;
  while (cur.parentId) {
    const parent = byId.get(cur.parentId);
    if (!parent) break;
    cur = parent;
  }
  return cur.id;
}

/** Referencia estable para evitar re-renders cuando el usuario no ha votado nada. */
const EMPTY_COMMENT_VOTES: Record<string, true> = {};

export const ReflectionDetailItem = React.memo(function ReflectionDetailItem({
  post,
  itemHeight,
  onAuthorPress,
  onClanPress,
  onReadingModeChange,
  communityVerticalFeed = false,
  reflectionStarSurfaceColor,
  highlightCommentId,
  showRepostLabel = false,
}: ReflectionDetailItemProps) {
  const isNoClanAuthor =
    post.author.clanId == null || String(post.author.clanId).trim() === '';
  const reflectionPanelBorderColor = evoconnColors.background;
  const starFieldSurfaceColor =
    reflectionStarSurfaceColor ?? evoconnColors.background;
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
  /** Ancho medido del pill "Republicado por …" para dibujar el reborde de clan. */
  const [repostPillWidth, setRepostPillWidth] = useState(0);
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

  const {
    commentsMap,
    addComment: addSimComment,
    users: simUsers,
    ensureCommentsForPost,
    deleteCommentById,
    deletePost,
    commentVoteMap,
    castCommentVote,
    activeUserId,
    toggleRepost,
    repostAttributionByPost,
  } = useSimulation();

  const [commentAuthorCache, setCommentAuthorCache] = useState<Record<string, BasicProfile>>({});
  const fetchedCommentAuthorIds = useRef<Set<string>>(new Set());

  // Fetch fresh comments from Supabase the first time this post is opened.
  useEffect(() => {
    ensureCommentsForPost(post.id).catch(console.error);
  // We only want to run this once per post open, not on every update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  useEffect(() => {
    const simComments = commentsMap[post.id] ?? [];
    const missing = [
      ...new Set(
        simComments
          .map((c) => c.authorId)
          .filter((id) => isRealUserId(id) && !fetchedCommentAuthorIds.current.has(id)),
      ),
    ];
    if (missing.length === 0) return;
    missing.forEach((id) => fetchedCommentAuthorIds.current.add(id));
    fetchProfilesBatch(missing)
      .then((profiles) => {
        setCommentAuthorCache((prev) => {
          const next = { ...prev };
          profiles.forEach((p) => {
            next[p.id] = p;
          });
          return next;
        });
      })
      .catch(() => {
        missing.forEach((id) => fetchedCommentAuthorIds.current.delete(id));
      });
  }, [commentsMap, post.id]);

  // Voto de comentarios desde el store compartido → persiste en Supabase y se
  // mantiene tras refrescar (igual que los votos de posts). `myCommentVotes`
  // dice qué comentarios he votado YO; el conteo total vive en `c.upCount`.
  const myCommentVotes = commentVoteMap[activeUserId] ?? EMPTY_COMMENT_VOTES;
  const toggleCommentVote = useCallback(
    (commentId: string, commentAuthorId: string) => {
      const isNewVote = !myCommentVotes[commentId];
      castCommentVote(activeUserId, post.id, commentId);
      // Notificación SOLO cuando el AUTOR DEL POST vota un comentario ajeno:
      // el autor del comentario recibe un "me gusta" del autor de la publicación.
      // El resto de votos (de otros usuarios) no generan notificación.
      if (isNewVote && activeUserId === post.author.id && commentAuthorId !== activeUserId) {
        const voterUsername =
          authProfile?.username != null && authProfile.username.trim().length > 0
            ? `@${authProfile.username.trim().toUpperCase()}`
            : mockCurrentUser.username;
        void addNotification({
          recipientUserId: commentAuthorId,
          type: 'upvote_comment',
          fromUserId: activeUserId,
          fromUsername: voterUsername,
          targetPostId: post.id,
          targetCommentId: commentId,
        });
      }
    },
    [castCommentVote, activeUserId, post.id, post.author.id, myCommentVotes, authProfile, addNotification],
  );

  // Comments come from the shared persistent store — no local state needed.
  const { block, isBlocked } = useBlockedUsers();
  const { session, profile: authProfile } = useAuth();
  const isAdmin = useIsAdmin();
  const [adminDeletePostOpen, setAdminDeletePostOpen] = useState(false);

  const contextComments = useMemo<Comment[]>(() => {
    const simComments = commentsMap[post.id] ?? [];
    const liveSelfUsername =
      authProfile?.username?.trim()
        ? `@${authProfile.username.trim().toUpperCase()}`
        : mockCurrentUser.username;
    return simComments.map((sc): Comment => {
      const su = simUsers[sc.authorId];
      const isSelf =
        (session?.user?.id != null && sc.authorId === session.user.id) ||
        sc.authorId === mockCurrentUser.id;
      const cached = commentAuthorCache[sc.authorId];
      const selfAvatar =
        authProfile?.avatar_url?.trim() || mockCurrentUser.avatarUri || undefined;
      const authorAvatar = isSelf
        ? selfAvatar
        : cached?.avatarUri?.trim() || undefined;

      return {
        id: sc.id,
        author: su
          ? {
              id: su.id,
              username: su.username,
              clanId: su.clanId,
              rank: su.rank,
              avatarUri: authorAvatar,
            }
          : isSelf
            ? {
                id: authProfile?.id ?? mockCurrentUser.id,
                username: liveSelfUsername,
                clanId: authProfile?.clan_id ?? mockCurrentUser.clanId,
                rank: (authProfile?.rank ?? mockCurrentUser.rank) as Comment['author']['rank'],
                avatarUri: selfAvatar,
              }
            : {
                id: sc.authorId,
                username: cached?.username ?? sc.authorUsername ?? '?',
                clanId: cached?.clanId ?? sc.authorClanId ?? null,
                rank: (cached?.rank ?? sc.authorRank ?? 'aprendiz') as Comment['author']['rank'],
                avatarUri: authorAvatar,
              },
        body: sc.body,
        upCount: sc.upCount,
        createdAt: sc.createdAt,
        parentId: sc.parentId ?? null,
      };
    });
  }, [
    commentsMap,
    post.id,
    simUsers,
    session?.user?.id,
    authProfile?.id,
    authProfile?.username,
    authProfile?.clan_id,
    authProfile?.rank,
    authProfile?.avatar_url,
    commentAuthorCache,
  ]);

  // Avatar del autor del post ampliado. Los registros de SimulationContext no
  // guardan avatar, así que un post propio puede llegar sin foto a esta vista
  // (cabecera con icono por defecto pese a tener foto). Si es propio, caemos a
  // la foto publicada en Supabase del usuario logueado.
  const resolvedAuthorAvatar = useMemo(() => {
    const fromPost = post.author.avatarUri?.trim();
    if (fromPost) return fromPost;
    const isSelfPost =
      (session?.user?.id != null && post.author.id === session.user.id) ||
      post.author.id === mockCurrentUser.id;
    if (isSelfPost) {
      return authProfile?.avatar_url?.trim() || mockCurrentUser.avatarUri || undefined;
    }
    return undefined;
  }, [post.author.avatarUri, post.author.id, session?.user?.id, authProfile?.avatar_url]);

  const [postMoreSheetOpen, setPostMoreSheetOpen] = useState(false);
  const [reportReasonPickerOpen, setReportReasonPickerOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalMessage, setInfoModalMessage] = useState('');

  const handleBlockUser = useCallback(async (userId: string) => {
    await block(userId).catch(console.error);
  }, [block]);

  const { addNotification } = useNotifications();
  const { recordComment, recordBlockUser } = useRecommendationTaste();

  // ── Hilos de respuestas (estado declarado ANTES de handleAddComment) ──
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const commentsScrollRef = useRef<ScrollView>(null);
  const commentOffsetsRef = useRef<Map<string, number>>(new Map());
  const registerCommentOffset = useCallback((commentId: string, y: number) => {
    commentOffsetsRef.current.set(commentId, y);
  }, []);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);

  const handleAddComment = useCallback(
    async (text: string) => {
      const authorId =
        session?.user?.id && isRealUserId(session.user.id)
          ? session.user.id
          : mockCurrentUser.id;
      const authorUsername =
        authProfile?.username != null && authProfile.username.trim().length > 0
          ? `@${authProfile.username.trim().toUpperCase()}`
          : mockCurrentUser.username;
      const newId = `co-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const parentForThis = replyingTo?.commentId ?? null;
      const simComment: SimComment = {
        id: newId,
        postId: post.id,
        authorId,
        authorUsername,
        authorClanId: authProfile?.clan_id ?? mockCurrentUser.clanId,
        authorRank: authProfile?.rank ?? mockCurrentUser.rank,
        body: text,
        upCount: 0,
        createdAt: new Date().toISOString(),
        parentId: parentForThis,
      };
      await addSimComment(simComment);
      recordComment(post);
      // Auto-expandir el hilo destino para que el autor vea su respuesta.
      if (parentForThis) {
        setExpandedThreads(prev => ({ ...prev, [parentForThis]: true }));
      }
      setReplyingTo(null);

      const preview = text.trim().slice(0, 80);
      if (parentForThis) {
        // Respuesta a un comentario → avisar al autor del comentario padre.
        const parentAuthorId = (commentsMap[post.id] ?? []).find(
          (c) => c.id === parentForThis,
        )?.authorId;
        if (parentAuthorId && parentAuthorId !== authorId) {
          void addNotification({
            recipientUserId: parentAuthorId,
            type: 'comment_reply',
            fromUserId: authorId,
            fromUsername: authorUsername,
            targetPostId: post.id,
            targetCommentId: newId,
            textPreview: preview,
          });
        }
      } else if (post.author.id !== authorId) {
        // Comentario raíz → avisar al autor de la publicación.
        void addNotification({
          recipientUserId: post.author.id,
          type: 'comment',
          fromUserId: authorId,
          fromUsername: authorUsername,
          targetPostId: post.id,
          targetCommentId: newId,
          textPreview: preview,
        });
      }
    },
    [
      addSimComment,
      addNotification,
      recordComment,
      post,
      post.author.id,
      post.id,
      session?.user?.id,
      authProfile?.username,
      authProfile?.clan_id,
      authProfile?.rank,
      replyingTo,
      commentsMap,
    ],
  );

  // ── Acciones de hilo (callbacks) ───────────────────────────────────────
  const toggleThread = useCallback((rootId: string) => {
    setExpandedThreads(prev => ({ ...prev, [rootId]: !prev[rootId] }));
  }, []);

  const startReply = useCallback((commentId: string, username: string) => {
    setReplyingTo({ commentId, username });
  }, []);

  const cancelReply = useCallback(() => setReplyingTo(null), []);

  const handleDeleteComment = useCallback(
    (commentId: string, viaAdmin = false) => {
      void deleteCommentById(post.id, commentId, viaAdmin ? { admin: true } : undefined);
    },
    [deleteCommentById, post.id],
  );

  // Identidad del visor: ¿soy el autor del post? (puedo borrar comentarios ajenos).
  const isPostAuthor = useMemo(() => {
    const myId = session?.user?.id ?? mockCurrentUser.id;
    return myId === post.author.id;
  }, [session?.user?.id, post.author.id]);
  const myId = session?.user?.id ?? mockCurrentUser.id;

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
    // Estado reactivo (cambia con `myRepostIds`); `isReposted()` lee un ref estable
    // y NO recalcularía este memo, dejando la etiqueta del menú obsoleta.
    const reposted = !!repostAttributionByPost[post.id]?.isSelf;
    return [
      // "Republicar" como PRIMERA opción — solo en el feed de Para Ti.
      ...(showRepostLabel
        ? [{
            key: 'repost',
            label: reposted ? 'Quitar republicación' : 'Republicar',
            onPress: () => toggleRepost(post.id),
          }]
        : []),
      {
        key: 'share',
        label: 'Compartir',
        onPress: () => {
          void (async () => {
            try {
              const text = (livePost.body || livePost.title || '').trim();
              const preview = text.length > 240 ? `${text.slice(0, 237)}…` : text;
              await Share.share({
                message: buildPostShareMessage(
                  livePost.author.username,
                  preview,
                  livePost.id,
                ),
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
      ...(isAdmin
        ? [{
            key: 'adminDeletePost',
            label: 'Eliminar publicación (admin)',
            destructive: true,
            onPress: () => setAdminDeletePostOpen(true),
          }]
        : []),
    ];
  }, [post, livePost, checkFollowing, toggleFollow, isAdmin, repostAttributionByPost, toggleRepost, showRepostLabel]);

  const confirmAdminDeletePost = useCallback(() => {
    deletePost(post.author.id, post.id, { admin: true });
    showInfo('Publicación eliminada', 'La publicación se ha eliminado.');
  }, [deletePost, post.author.id, post.id, showInfo]);

  const handleMorePress = useCallback(() => {
    setPostMoreSheetOpen(true);
  }, []);

  const confirmBlockUser = useCallback(() => {
    void handleBlockUser(post.author.id);
    recordBlockUser(post.author.id, post.author.clanId ?? null);
    showInfo('Usuario bloqueado', `@${post.author.username} ha sido bloqueado.`);
  }, [handleBlockUser, post.author.id, post.author.username, post.author.clanId, recordBlockUser, showInfo]);

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

  const { width: screenW, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

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

  const viewerClanIdForRanking =
    authProfile?.clan_id ?? mockCurrentUser.clanId ?? null;
  const viewerIdForRanking =
    (session?.user?.id && isRealUserId(session.user.id)
      ? session.user.id
      : mockCurrentUser.id) ?? null;

  // Ordenación personalizada: mejor comentario primero (mezcla de votos +
  // recencia residual) con boost para autores del mismo clan que el lector,
  // siempre que el lector pertenezca a uno de los 8 clanes filosóficos.
  const visibleComments = useMemo(() => {
    const filtered = contextComments.filter((c) => !isBlocked(c.author.id));
    return rankCommentsForViewer(filtered, {
      viewerClanId: viewerClanIdForRanking,
      viewerId: viewerIdForRanking,
    });
  }, [contextComments, isBlocked, viewerClanIdForRanking, viewerIdForRanking]);

  // Agrupa comentarios en raíces + descendientes UNA vez (antes se recalculaba
  // en cada render dentro del JSX). Las raíces se paginan: en posts con cientos
  // de comentarios montar todas las CommentCard de golpe colgaba el hilo de UI.
  const { commentRoots, descendantsByRoot, commentById } = useMemo(() => {
    const rootIdById = new Map<string, string>();
    for (const c of visibleComments) {
      if (!c.parentId) rootIdById.set(c.id, c.id);
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of visibleComments) {
        if (rootIdById.has(c.id)) continue;
        if (c.parentId && rootIdById.has(c.parentId)) {
          rootIdById.set(c.id, rootIdById.get(c.parentId)!);
          changed = true;
        }
      }
    }
    const roots = visibleComments.filter((c) => !c.parentId);
    const byRoot = new Map<string, typeof visibleComments>();
    for (const c of visibleComments) {
      if (!c.parentId) continue;
      const rid = rootIdById.get(c.id);
      if (!rid) continue;
      const arr = byRoot.get(rid) ?? [];
      arr.push(c);
      byRoot.set(rid, arr);
    }
    const byId = new Map<string, typeof visibleComments[number]>();
    for (const c of visibleComments) byId.set(c.id, c);
    return { commentRoots: roots, descendantsByRoot: byRoot, commentById: byId };
  }, [visibleComments]);

  const {
    visibleData: visibleRoots,
    hasMore: hasMoreComments,
    loadMore: loadMoreComments,
    reset: resetCommentsPaging,
    ensureCount: ensureCommentsVisible,
  } = useIncrementalList(commentRoots, COMMENTS_PAGE_SIZE);

  // Al cambiar de post, vuelve a empezar por los primeros comentarios.
  useEffect(() => {
    resetCommentsPaging();
  }, [post.id, resetCommentsPaging]);

  // Deep link / notificación a un comentario concreto: si su raíz cae más allá
  // del bloque visible, revela hasta ahí para que el scroll-to funcione.
  useEffect(() => {
    if (!highlightCommentId) return;
    const rootId = findCommentThreadRoot(visibleComments, highlightCommentId);
    if (!rootId) return;
    const idx = commentRoots.findIndex((c) => c.id === rootId);
    if (idx >= 0) ensureCommentsVisible(idx + 1);
  }, [highlightCommentId, visibleComments, commentRoots, ensureCommentsVisible]);

  // Notificación / deep link: desplegar hilo del comentario objetivo.
  useEffect(() => {
    if (!highlightCommentId || !commentsReady) return;
    if (!visibleComments.some((c) => c.id === highlightCommentId)) {
      void ensureCommentsForPost(post.id);
      return;
    }
    const rootId = findCommentThreadRoot(visibleComments, highlightCommentId);
    if (!rootId) return;
    setExpandedThreads((prev) => (prev[rootId] ? prev : { ...prev, [rootId]: true }));
  }, [highlightCommentId, commentsReady, visibleComments, post.id, ensureCommentsForPost]);

  // Scroll + flash visual al comentario objetivo.
  useEffect(() => {
    if (!highlightCommentId || !commentsReady) return;
    if (!visibleComments.some((c) => c.id === highlightCommentId)) return;

    setHighlightedCommentId(highlightCommentId);
    const scrollToTarget = () => {
      const y = commentOffsetsRef.current.get(highlightCommentId);
      if (y != null) {
        commentsScrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      }
    };
    const t1 = setTimeout(scrollToTarget, 120);
    const t2 = setTimeout(scrollToTarget, 350);
    const t3 = setTimeout(scrollToTarget, 700);
    const clearHighlight = setTimeout(() => setHighlightedCommentId(null), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(clearHighlight);
    };
  }, [highlightCommentId, commentsReady, visibleComments, expandedThreads]);

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
    onAuthorPress(post.author.id);
  }, [post.author.id, onAuthorPress]);

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

    const onShow = (e: {
      endCoordinates: { screenY: number; height?: number };
      duration?: number;
    }) => {
      const kbTopY =
        Platform.OS === 'android'
          ? androidKeyboardTopY(e.endCoordinates, windowHeight)
          : e.endCoordinates.screenY;
      const duration = Platform.OS === 'ios' ? (e.duration ?? 250) : 220;

      const applyMeasure = () => {
        newCommentMeasureRef.current?.measureInWindow((x, y, _w, h) => {
          const boxBottom = y + h;
          const overlap = boxBottom - kbTopY;
          const cushion =
            10 +
            (Platform.OS === 'android'
              ? 12 + Math.min(28, Math.max(0, insets.bottom * 0.45))
              : 0);
          const target = overlap > 0 ? -(overlap + cushion) : 0;
          kbOffset.stopAnimation();
          Animated.timing(kbOffset, {
            toValue: target,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        });
      };

      if (Platform.OS === 'android') {
        requestAnimationFrame(() => {
          requestAnimationFrame(applyMeasure);
        });
      } else {
        applyMeasure();
      }
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
  }, [kbOffset, windowHeight, insets.bottom]);

  const reflectionTitleUsesLongLayout = isLongText || readingMode;

  // ── Etiqueta "Republicado por …" (solo Para Ti) ───────────────────────────
  const repostAttribution = showRepostLabel ? repostAttributionByPost[post.id] : undefined;
  const repostLabelText = repostAttribution
    ? repostAttribution.isSelf
      ? 'Republicado por ti'
      : repostAttribution.username
        ? `Republicado por ${repostAttribution.username}`
        : null
    : null;
  const REPOST_PILL_HEIGHT = 26;
  const REPOST_PILL_RADIUS = 13;
  const repostRimColor = getClanColor(post.author.clanId);
  const repostUserId = repostAttribution?.userId ?? null;
  const repostLabelTop =
    repostLabelText && reflPanelLayout
      ? reflPanelLayout.y + reflPanelLayout.height + (PANELS_GAP - REPOST_PILL_HEIGHT) / 2
      : null;

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
              <FirstUsersTesterBadge
                userId={post.author.id}
                iconSize={PROFILE_TESTER_BADGE_SIZE}
              />
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
            <PanelStarField surfaceColor={starFieldSurfaceColor} />
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
                          {...(reflectionTitleUsesLongLayout
                            ? {}
                            : { numberOfLines: 1, ellipsizeMode: 'tail' as const })}
                          style={[
                            styles.title,
                            !reflectionTitleUsesLongLayout && styles.textCentered,
                            reflectionTitleUsesLongLayout && styles.titleDetailLongMode,
                            !reflectionTitleUsesLongLayout && {
                              // Misma caja horizontal que el cuerpo: el centro geométrico del título
                              // coincide con el del párrafo (sin TL.offsetX, que rompía ese eje).
                              width: '100%',
                              transform: [
                                { translateX: 0 },
                                { translateY: TL.offsetY },
                                { scale: TL.scale },
                              ],
                            },
                          ]}
                        >
                          {reflectionTitleUsesLongLayout
                            ? post.title
                            : post.title.length > TL.maxCharacters
                              ? post.title.slice(0, TL.maxCharacters) + '…'
                              : post.title}
                        </Text>
                      ) : null}
                      <Text
                        key={bodyLayoutKey}
                        style={[
                          styles.bodyText,
                          !isLongText && styles.textCentered,
                          !isLongText && styles.reflectBodyShortFill,
                        ]}
                        numberOfLines={!readingMode && isLongText ? maxBodyLines : undefined}
                        onTextLayout={handleBodyTextLayout}
                      >
                        {post.body}
                      </Text>
                      {isLongText ? (
                        <Text
                          style={
                            readingMode ? styles.readLessLabel : styles.readMoreLabel
                          }
                        >
                          {readingMode ? 'Ver menos' : 'Ver más...'}
                        </Text>
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
                    ref={commentsScrollRef}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    scrollEventThrottle={16}
                    onScroll={(e) => {
                      if (!hasMoreComments) return;
                      const { contentOffset, contentSize, layoutMeasurement } =
                        e.nativeEvent;
                      const distanceFromBottom =
                        contentSize.height -
                        (contentOffset.y + layoutMeasurement.height);
                      if (distanceFromBottom < 400) loadMoreComments();
                    }}
                    style={styles.commentsScroll}
                    contentContainerStyle={{
                      paddingTop: COMMENTS_CONTENT_INSETS.top,
                      paddingBottom: COMMENTS_CONTENT_INSETS.bottom,
                      paddingLeft: COMMENTS_CONTENT_INSETS.left,
                      paddingRight: COMMENTS_CONTENT_INSETS.right,
                    }}
                  >
                    {(() => {
                      // Hilos:
                      // - parent_comment_id en DB conserva el padre inmediato.
                      // - En UI, todos los descendientes de una raíz se
                      //   muestran como una lista plana bajo la raíz, con un
                      //   único nivel de sangría (no se anida más profundo).
                      // - El agrupamiento se calcula en `useMemo` (arriba) y las
                      //   raíces se revelan por bloques (`visibleRoots`).
                      return visibleRoots.map((c) => {
                        const descendants = descendantsByRoot.get(c.id) ?? [];
                        const expanded = !!expandedThreads[c.id];
                        const isOwnerDelete = isPostAuthor || c.author.id === myId;
                        const canDelete = isOwnerDelete || isAdmin;
                        return (
                          <React.Fragment key={c.id}>
                            <View
                              onLayout={(e) =>
                                registerCommentOffset(c.id, e.nativeEvent.layout.y)
                              }
                            >
                            <CommentCard
                              authorId={c.author.id}
                              username={c.author.username}
                              avatarUri={c.author.avatarUri}
                              text={c.body}
                              clanId={c.author.clanId}
                              upvotes={c.upCount}
                              isUpvoted={!!myCommentVotes[c.id]}
                              createdAt={c.createdAt}
                              highlighted={highlightedCommentId === c.id}
                              onUpvote={() => toggleCommentVote(c.id, c.author.id)}
                              onReport={() => console.log(`Reported comment ${c.id}`)}
                              onBlockUser={() => handleBlockUser(c.author.id)}
                              onAuthorPress={() => onAuthorPress(c.author.id)}
                              onReply={() => startReply(c.id, c.author.username)}
                              onDelete={canDelete ? () => handleDeleteComment(c.id, !isOwnerDelete) : undefined}
                              replyCount={descendants.length}
                              threadExpanded={expanded}
                              onToggleThread={descendants.length > 0 ? () => toggleThread(c.id) : undefined}
                            />
                            </View>
                            {expanded
                              ? descendants.map((child) => {
                                  const childIsOwnerDelete = isPostAuthor || child.author.id === myId;
                                  const childCanDelete = childIsOwnerDelete || isAdmin;
                                  // Si el padre real NO es la raíz del hilo,
                                  // mostramos "→ @padre" para indicar a quién
                                  // se está respondiendo dentro del hilo.
                                  const parent = child.parentId
                                    ? commentById.get(child.parentId)
                                    : undefined;
                                  const replyingToUsername =
                                    parent && parent.id !== c.id
                                      ? parent.author.username
                                      : undefined;
                                  return (
                                    <View
                                      key={child.id}
                                      onLayout={(e) =>
                                        registerCommentOffset(child.id, e.nativeEvent.layout.y)
                                      }
                                    >
                                    <CommentCard
                                      authorId={child.author.id}
                                      username={child.author.username}
                                      avatarUri={child.author.avatarUri}
                                      text={child.body}
                                      clanId={child.author.clanId}
                                      upvotes={child.upCount}
                                      isUpvoted={!!myCommentVotes[child.id]}
                                      createdAt={child.createdAt}
                                      indented
                                      highlighted={highlightedCommentId === child.id}
                                      replyingToUsername={replyingToUsername}
                                      onUpvote={() => toggleCommentVote(child.id, child.author.id)}
                                      onReport={() => console.log(`Reported comment ${child.id}`)}
                                      onBlockUser={() => handleBlockUser(child.author.id)}
                                      onAuthorPress={() => onAuthorPress(child.author.id)}
                                      onReply={() => startReply(child.id, child.author.username)}
                                      onDelete={
                                        childCanDelete
                                          ? () => handleDeleteComment(child.id, !childIsOwnerDelete)
                                          : undefined
                                      }
                                    />
                                    </View>
                                  );
                                })
                              : null}
                          </React.Fragment>
                        );
                      });
                    })()}
                    {hasMoreComments ? <ClanLoadingDot inline /> : null}
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
                    {replyingTo ? (
                      <View style={threadStyles.replyBanner}>
                        <Text style={threadStyles.replyBannerText}>
                          Respondiendo a @{replyingTo.username.replace(/^@/, '')}
                        </Text>
                        <TouchableOpacity onPress={cancelReply} hitSlop={8}>
                          <Text style={threadStyles.replyBannerCancel}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    <NewCommentBox onSend={handleAddComment} clanId={post.author.clanId} />
                  </Animated.View>
                </View>
              </>
            ) : null}
          </View>

        </View>
      </ReflectionBackground>

      {/* ── Etiqueta "Republicado por …" (flota sobre el divisor entre paneles) ── */}
      {repostLabelText && repostLabelTop != null ? (
        <View
          pointerEvents="box-none"
          style={[styles.repostLabelOverlay, { top: repostLabelTop, height: REPOST_PILL_HEIGHT }]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!repostUserId}
            onPress={() => {
              if (repostUserId) onAuthorPress(repostUserId);
            }}
            style={[
              styles.repostLabelPill,
              { height: REPOST_PILL_HEIGHT, borderRadius: REPOST_PILL_RADIUS },
            ]}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              setRepostPillWidth((prev) => (Math.abs(prev - w) < 1 ? prev : w));
            }}
          >
            <Text style={styles.repostLabelText} numberOfLines={1}>
              {repostLabelText}
            </Text>
            {repostPillWidth > 0 ? (
              <ClanCardFeedRimOverlay
                width={repostPillWidth}
                height={REPOST_PILL_HEIGHT}
                borderRadius={REPOST_PILL_RADIUS}
                clanColor={repostRimColor}
                rimArmX={Math.min(16, Math.max(6, (repostPillWidth - 2 * REPOST_PILL_RADIUS) / 2))}
                rimArmY={1}
              />
            ) : null}
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Action column (pixel-pinned, independent of any layout) ── */}
      <View
        pointerEvents="box-none"
        style={actionColStyle}
      >
        <DetailActionColumn
          ref={actionColRef}
          clanId={post.author.clanId}
          avatarUri={resolvedAuthorAvatar}
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
          showClanBadge={communityVerticalFeed}
          authorRank={post.author.rank}
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
      <EvoConfirmModal
        visible={adminDeletePostOpen}
        onClose={() => setAdminDeletePostOpen(false)}
        title="Eliminar publicación (admin)"
        message="¿Eliminar esta publicación de forma permanente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={confirmAdminDeletePost}
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
  /** Título en “Ver más” / lectura: alineado con el cuerpo (eje X), sin scale que el panel recorta; texto completo (varias líneas). */
  titleDetailLongMode: {
    alignSelf: 'stretch',
    textAlign: 'left',
    fontSize: REFLECTION_TITLE_LONG_FONT_SIZE,
    lineHeight: REFLECTION_TITLE_LONG_LINE_HEIGHT,
  },
  /** Misma anchura de columna que el título corto: eje vertical de simetría compartido. */
  reflectBodyShortFill: {
    width: '100%',
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
  /** Mostrado al final del cuerpo cuando readingMode está activo, para que el
   *  usuario sepa que puede pulsar de nuevo y volver al feed. */
  readLessLabel: {
    color: '#AAAAAA',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
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
  /** Contenedor del pill "Republicado por …": centrado horizontalmente sobre el divisor. */
  /**
   * El pill ocupa el mismo ancho que el RECUADRO de un comentario (no toda la fila):
   * empieza en el borde izquierdo del contenido de comentarios (16 + CP.paddingHorizontal)
   * y termina donde acaba la caja del comentario, es decir, ANTES del botón de upvote
   * (gap INBOX.gap + ancho SEND_BTN.size). El texto va a la izquierda aunque no llene la caja.
   */
  repostLabelOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingLeft: REFLECTION_DETAIL_CONTENT_PAD_H + CP.paddingHorizontal,
    paddingRight: REFLECTION_DETAIL_CONTENT_PAD_H + CP.paddingHorizontal + INBOX.gap + SEND_BTN.size,
    zIndex: 12,
  },
  repostLabelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: evoconnColors.background,
  },
  repostLabelText: {
    color: evoconnColors.text,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

const threadStyles = StyleSheet.create({
  toggleRow: {
    paddingVertical: 6,
    paddingHorizontal: 20,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  replyBannerText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '500',
  },
  replyBannerCancel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
  },
});
