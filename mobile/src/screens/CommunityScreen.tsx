import React, { useState, useCallback, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Keyboard,
  InteractionManager,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import {
  AppTopBar,
  AppShellBottomTabsWrap,
  CommunityPostCard,
  BottomCommunityTabs,
  SidebarDrawer,
} from '@evoconn/components';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useFeedStore, simPostToCommunityPost } from '@evoconn/hooks/useFeedStore';
import { mergePanelPostsAuthorAvatars } from '@evoconn/utils/enrichPostsAuthorAvatar';
import {
  fetchProfilesBatch,
  isRealUserId,
  type BasicProfile,
} from '@evoconn/services/supabaseSocial';
import { isPublishedSimPostType, type SimPost } from '@evoconn/data/simulation/simulatedNetwork';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { useParatiSeenPosts } from '@evoconn/hooks/ParatiSeenPostsContext';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import {
  BOTTOM_BAR_LAYOUT,
  getBottomBarEdgeGestureBottomOffset,
  getBottomBarScrollContentPaddingBottom,
} from '@evoconn/constants/bottomBarLayout';
import {
  COMMUNITY_FEED_CARD_MAX_INNER_WIDTH,
  SVG_CARD_VISUAL,
} from '@evoconn/constants/svgCardLayout';
import { getMainColumnHeightForFloatingBottomBar } from '@evoconn/constants/appShellLayout';
import { getAppTopBarLayoutHeight } from '@evoconn/constants/topBarLayout';
import { useEvoPreferences } from '@evoconn/hooks/EvoPreferencesContext';
import {
  COMMUNITY_DRAWER_EDGE_ZONE_WIDTH,
  COMMUNITY_DRAWER_GESTURE_RANGE_X,
} from '@evoconn/constants/communityDrawerGesture';
import {
  COMMUNITY_DETAIL_DECELERATION_RATE_IOS,
  COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE,
  COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE_ANDROID,
  COMMUNITY_DETAIL_MAX_TO_RENDER_PER_BATCH_ANDROID,
  COMMUNITY_DETAIL_PREFETCH_POSTS,
  COMMUNITY_DETAIL_PREFETCH_POSTS_ANDROID,
  COMMUNITY_DETAIL_UPDATE_CELLS_PERIOD_ANDROID,
} from '@evoconn/constants/communityDetailFeed';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import { SearchScreen } from '@evoconn/components/SearchScreen';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useEffectiveClanId } from '@evoconn/hooks/useEffectiveClanId';
import { useBlockedUsers } from '@evoconn/hooks/BlockedUsersContext';
import { getClanColor } from '@evoconn/constants/clanColors';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import { useIncrementalList } from '@evoconn/hooks/useIncrementalList';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import { ProfileRevealPanel } from '@evoconn/components/otherProfile';
import {
  sortFollowingPosts,
  type FollowingSortOption,
} from '@evoconn/constants/followingFeedSort';
import { getParatiAuthorClanMembershipMultiplier } from '@evoconn/logic/feed/paratiFeedRanking';
import { normalizeRouteParam } from '@evoconn/utils/widgetDeepLink';
import {
  peekCommunityPostDeepLink,
  acknowledgeCommunityPostDeepLink,
  peekCommunityPostId,
  consumeRequestedCommunityTab,
} from '@evoconn/utils/communityPostDeepLink';
import {
  consumeForcedCommunityPostOpen,
  consumeForcedCommunityCommentOpen,
  consumeForcedNavigationEpoch,
  subscribeCommunityPostNavigation,
} from '@evoconn/utils/notificationNavigation';
import { useEntryAnimPlaying } from '../../mobile/lib/animationState';

type TabId = 'siguiendo' | 'para-ti' | 'search';
type FeedMode = 'following' | 'foryou';

function tabToFeedMode(tab: TabId): FeedMode {
  switch (tab) {
    case 'siguiendo':
      return 'following';
    default:
      return 'foryou';
  }
}

/** Perfiles de autores reales para hidratar Para ti tras refresh (nombres + avatares). */
async function buildAuthorProfileCacheFromSimPosts(
  simPosts: SimPost[],
): Promise<Record<string, BasicProfile>> {
  const ids = [
    ...new Set(
      simPosts
        .filter((p) => isPublishedSimPostType(p.type))
        .map((p) => p.authorId)
        .filter((id) => isRealUserId(id)),
    ),
  ];
  const cache: Record<string, BasicProfile> = {};
  if (ids.length > 0) {
    const profiles = await fetchProfilesBatch(ids);
    profiles.forEach((p) => {
      cache[p.id] = p;
    });
  }
  return cache;
}

/**
 * "PARA TI" ranking algorithm.
 * Score = net_votes × recency_boost × clan_boost × membership_boost × taste_boost
 * - Net votes: upvotes × 2 - downvotes + saves (engagement signal)
 * - Recency boost: ×2 if post is < 6 h old, ×1.5 if < 24 h, ×1 otherwise
 * - Clan boost: ×1.4 if author's clan matches viewer's clan
 * - Membership: ×1.25 si el autor tiene uno de los 8 clanes; ×0.7 si es sin clan
 * Discovery-mode: discovery posts (not from followed users) are ranked first.
 * Siguiendo is only posts from users you follow (empty if you follow no one).
 *
 * Seen posts (vertical "Para ti" viewer): reordered to the bottom so the user
 * mostly sees fresh items first; seen content still fills the tail if needed.
 */
function scorePostForYou(
  post: CommunityPost,
  viewerClanId: string | null,
  tasteBoost: (p: CommunityPost) => number,
): number {
  const net = post.voteStats.up * 2 - post.voteStats.down + post.voteStats.save;
  const ageMs = Date.now() - new Date(post.createdAt).getTime();
  const ageH = ageMs / 3_600_000;
  const recency = ageH < 6 ? 2 : ageH < 24 ? 1.5 : 1;
  const clanBoost = viewerClanId && post.author.clanId === viewerClanId ? 1.4 : 1;
  const membershipBoost = getParatiAuthorClanMembershipMultiplier(post.author.clanId);
  return net * recency * clanBoost * membershipBoost * tasteBoost(post);
}

function getDataForMode(
  mode: FeedMode,
  allPosts: CommunityPost[],
  followingSet?: Set<string>,
  viewerClanId?: string | null,
  viewerUserId?: string,
  followingSort: FollowingSortOption = 'recientes',
  tasteBoost: (p: CommunityPost) => number = () => 1,
  paratiSeenIds?: Set<string>,
): CommunityPost[] {
  switch (mode) {
    case 'following': {
      const ids = followingSet ?? new Set<string>();
      // "Más recientes" → solo cuentas que sigues (sin cambios).
      // "Más votadas" (24h / mes) → ranking GENERAL de toda la app, no solo seguidos.
      const pool =
        followingSort === 'recientes'
          ? allPosts.filter((p) => ids.has(p.author.id))
          : allPosts;
      return sortFollowingPosts(pool, followingSort);
    }
    case 'foryou': {
      // Exclude own posts from discovery.
      const others = viewerUserId
        ? allPosts.filter((p) => p.author.id !== viewerUserId)
        : allPosts;
      // Sort all by score (discovery + followed mixed, discovery floats higher).
      const sorted = [...others].sort(
        (a, b) =>
          scorePostForYou(b, viewerClanId ?? null, tasteBoost) -
          scorePostForYou(a, viewerClanId ?? null, tasteBoost),
      );
      if (!paratiSeenIds || paratiSeenIds.size === 0) return sorted;
      const unseen = sorted.filter((p) => !paratiSeenIds.has(p.id));
      const seen = sorted.filter((p) => paratiSeenIds.has(p.id));
      return [...unseen, ...seen];
    }
  }
}

function clampDetailInitialIndex(dataLength: number, initialIndex: number): number {
  if (dataLength <= 0) return 0;
  return Math.min(Math.max(0, initialIndex), dataLength - 1);
}

/**
 * Feed "Siguiendo" (todas las ordenaciones: recientes / 24h / 30d):
 * solo se mantienen MONTADAS a la vez `FOLLOWING_FEED_WINDOW` tarjetas pesadas,
 * las MÁS CERCANAS a la pantalla (centradas en lo visible: la mitad por encima
 * y la mitad por debajo). Las que quedan a más de ~media ventana de distancia
 * se desmontan y muestran un placeholder con la ruedita; al volver a acercarte
 * se vuelven a montar. Las cercanas NUNCA muestran ruedita (siguen cargadas).
 */
const FOLLOWING_FEED_WINDOW = 15;

/** Ensures the widget target post is in the detail list and selected. */
function foryouDetailWithTargetPost(
  baseData: CommunityPost[],
  postId: string | undefined,
  getPostById: (id: string) => CommunityPost | undefined,
): { data: CommunityPost[]; initialIndex: number; resolved: boolean } {
  if (!postId) {
    return {
      data: baseData,
      initialIndex: clampDetailInitialIndex(baseData.length, 0),
      resolved: true,
    };
  }
  const idx = baseData.findIndex((p) => p.id === postId);
  if (idx >= 0) {
    return { data: baseData, initialIndex: idx, resolved: true };
  }
  const target = getPostById(postId);
  if (target) {
    const data = [target, ...baseData.filter((p) => p.id !== postId)];
    return { data, initialIndex: 0, resolved: true };
  }
  return {
    data: baseData,
    initialIndex: clampDetailInitialIndex(baseData.length, 0),
    resolved: false,
  };
}

const ANIM_DURATION = 200;
const RIGHT_EDGE_ZONE_WIDTH = 28;

/** Para ti pull-to-refresh style: content slides down while clan-colored spinner shows at top. */
const PARATI_REFRESH_SHIFT = 56;

const TAB_INDEX: Record<TabId, number> = {
  'siguiendo': 0,
  'para-ti': 1,
  'search': 2,
};

const VALID_TAB_IDS: TabId[] = ['siguiendo', 'para-ti', 'search'];

/** Debe coincidir con `styles.list.paddingTop` — define el hueco vertical útil de cada fila del feed. */
const COMMUNITY_FEED_LIST_PADDING_TOP = 8;

// ── Android FlatList params — valores más conservadores para evitar lag en JS thread ──
const IS_ANDROID = Platform.OS === 'android';
const FEED_WINDOW_SIZE    = IS_ANDROID ? COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE_ANDROID : COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE;
const FEED_PREFETCH       = IS_ANDROID ? COMMUNITY_DETAIL_PREFETCH_POSTS_ANDROID : COMMUNITY_DETAIL_PREFETCH_POSTS;
const FEED_MAX_BATCH      = IS_ANDROID ? COMMUNITY_DETAIL_MAX_TO_RENDER_PER_BATCH_ANDROID : COMMUNITY_DETAIL_PREFETCH_POSTS;
const FEED_BATCH_PERIOD   = IS_ANDROID ? COMMUNITY_DETAIL_UPDATE_CELLS_PERIOD_ANDROID : 50;
/** removeClippedSubviews: en Android mejora el rendimiento; en iOS puede causar flashes con pagingEnabled. */
const FEED_CLIP_SUBVIEWS  = IS_ANDROID;
/**
 * Android: respiro extra bajo la tarjeta (dentro del área del feed) para acercar el margen al de iOS.
 */
const COMMUNITY_FEED_SLOT_BOTTOM_INSET_ANDROID = 14;
/** Pantallas anchas (tablet / iPad): mismo criterio que el tope de ancho de tarjeta; evita que el slot sea tan alto que el display quede pegado a la barra. */
const COMMUNITY_FEED_SLOT_BOTTOM_WIDE = 18;

export default function CommunityScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { tab: tabParam, postId: postIdParam, commentId: commentIdParam, nav: navParam } =
    useLocalSearchParams<{ tab?: string; postId?: string; commentId?: string; nav?: string }>();
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { followingSet } = useFollowState();
  const { thoughts } = useThoughts();
  const { posts: allPosts, getPostById } = useFeedStore();
  const { blockedIds } = useBlockedUsers();
  const { refreshSocialFromSupabase, ingestPostsByIds, activeUserId } = useSimulation();
  const { getBoost, revision: tasteRevision, recordDwell } = useRecommendationTaste();
  const { seenIds: paratiSeenIds, markParatiPostSeen } = useParatiSeenPosts();
  const { triggerHaptic } = useEvoPreferences();
  const [paratiDetailFeedKey, setParatiDetailFeedKey] = useState(0);
  const paratiRefreshShiftAnim = useRef(new Animated.Value(0)).current;
  /** Opacity del loader = posición del slide (aparece al bajar, desaparece al volver el post arriba). */
  const paratiRefreshSpinnerOpacity = useMemo(
    () =>
      paratiRefreshShiftAnim.interpolate({
        inputRange: [0, PARATI_REFRESH_SHIFT],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [paratiRefreshShiftAnim],
  );
  const viewerClanId = useEffectiveClanId();
  const paratiUserClanColor = useMemo(() => getClanColor(viewerClanId), [viewerClanId]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const drawerOpenProgress = useRef(new Animated.Value(0)).current;
  const gestureCommittingRef = useRef(false);
  const entryAnimPlaying = useEntryAnimPlaying();
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    peekCommunityPostId() ? 'para-ti' : 'siguiendo',
  );
  // Spinner del clan mientras "llegamos" a Comunidad desde otra pantalla
  // (perfil, racha, etc.). Unifica la sensación de carga con ProfileScreen y
  // tapa el destello del fondo de estrellas al revelar el panel. Se mantiene
  // hasta que terminan las interacciones/render pendientes (adaptativo al
  // dispositivo, mismo criterio que useDeferredRender), con un piso mínimo para
  // evitar el parpadeo de 1 frame y un tope de seguridad. Los cambios de
  // pestaña INTERNOS no lo activan.
  const [arrivalLoading, setArrivalLoading] = useState(false);
  const arrivalLoadingCancelRef = useRef<(() => void) | null>(null);
  const [followingSort, setFollowingSort] = useState<FollowingSortOption>('recientes');
  // While "Para ti" was a transient overlay we needed to freeze seen-ids so
  // the list did not jump as posts were marked seen. Now that the panel is
  // persistent and snapshot-based (see `paratiPanelData`), no freezing is
  // required — the panel simply does not re-rank mid-view.

  // Track which deep-link (tab + postId) we already handled.
  const consumedDeepLinkRef = useRef<string | undefined>(undefined);
  /** Widget / notificación postId cuando el feed aún no está hidratado. */
  const pendingWidgetPostIdRef = useRef<string | null>(null);
  /** Comentario a centrar tras abrir el post (notificaciones). */
  const pendingCommentIdRef = useRef<string | null>(null);
  /** postId que ya pedimos por ID a Supabase (evita reintentos en bucle). */
  const deepLinkFetchRef = useRef<string | null>(null);

  // ── Ventana de montaje del feed Siguiendo (máx. 15 tarjetas pesadas) ───────
  /** Índice de inicio de la ventana de 15 tarjetas montadas. */
  const [followingWindowStart, setFollowingWindowStart] = useState(0);
  const followingWindowStartRef = useRef(0);
  /** Alturas medidas por id, para que el placeholder mantenga el scroll exacto. */
  const followingCardHeightsRef = useRef<Map<string, number>>(new Map());
  const [focusPostId, setFocusPostId] = useState<string | null>(null);
  const [focusCommentId, setFocusCommentId] = useState<string | null>(null);
  const [postNavigationTick, setPostNavigationTick] = useState(0);

  useEffect(() => subscribeCommunityPostNavigation(() => {
    setPostNavigationTick((t) => t + 1);
  }), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);


  const handleReadingModeChange = useCallback((active: boolean) => {
    setFeedScrollEnabled(!active);
  }, []);

  const [detailFeed, setDetailFeed] = useState<{
    mode: FeedMode;
    data: CommunityPost[];
    initialIndex: number;
  } | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const detailMounted = detailFeed !== null;
  const detailFeedListRef = useRef<FlatList<CommunityPost>>(null);
  const detailFeedModeRef = useRef<FeedMode | null>(null);
  detailFeedModeRef.current = detailFeed?.mode ?? null;

  // ── Persistent "Para ti" panel ─────────────────────────────────────
  // Para Ti vertical viewer is mounted ONCE (deferred via InteractionManager)
  // and stays mounted while we're inside CommunityScreen. Switching tabs only
  // toggles its visibility (display:'none') — no re-mount, no flash.
  // Snapshot semantics: data is only refreshed on first mount, on pull-to-
  // refresh, or on a deep-link that needs a specific postId — never on the
  // live `foryouFeedOrdered` re-rank, which would cause visible jumps.
  const [paratiPanelMounted, setParatiPanelMounted] = useState(false);
  const [paratiPanelData, setParatiPanelData] = useState<CommunityPost[]>([]);
  /** Snapshot + avatares en vivo de `allPosts` (el panel no reordena al llegar fotos). */
  const paratiPanelDisplayData = useMemo(
    () => mergePanelPostsAuthorAvatars(paratiPanelData, allPosts),
    [paratiPanelData, allPosts],
  );
  const [paratiPanelInitialIndex, setParatiPanelInitialIndex] = useState(0);
  const [paratiPanelKey, setParatiPanelKey] = useState(0);
  const paratiPanelListRef = useRef<FlatList<CommunityPost>>(null);
  const paratiPanelHydratedRef = useRef(false);
  const markParatiSeenRef = useRef(markParatiPostSeen);
  markParatiSeenRef.current = markParatiPostSeen;
  const triggerHapticRef = useRef(triggerHaptic);
  triggerHapticRef.current = triggerHaptic;

  // Quitar al instante posts de autores bloqueados del panel Para Ti ya montado.
  useEffect(() => {
    const dropBlocked = (posts: CommunityPost[]) =>
      posts.filter((p) => !blockedIds.has(p.author.id));
    setParatiPanelData((prev) => (prev.length === 0 ? prev : dropBlocked(prev)));
    setDetailFeed((prev) =>
      prev
        ? {
            ...prev,
            data: dropBlocked(prev.data),
            initialIndex: clampDetailInitialIndex(
              dropBlocked(prev.data).length,
              prev.initialIndex,
            ),
          }
        : null,
    );
  }, [blockedIds]);

  // Para Ti ordering is computed on-demand in `hydrateParatiPanel` /
  // pull-to-refresh so it never re-renders the panel mid-scroll. The
  // `foryouSeenFrozen` flag is kept as a flag (active = we're in Para Ti)
  // and is still used by the spinner reset effect.
  void tasteRevision;

  const followingFeedOrdered = useMemo(
    () =>
      getDataForMode(
        'following',
        allPosts,
        followingSet,
        viewerClanId,
        mockCurrentUser.id,
        followingSort,
      ),
    [allPosts, followingSet, viewerClanId, mockCurrentUser.id, followingSort],
  );

  // #3 Prefetch (caché en disco) de los avatares de los primeros posts de cada
  // feed, para que al hacer scroll/abrir el detalle ya estén descargados y no
  // se vea el parpadeo de carga. Additive: solo calienta la caché de expo-image.
  useEffect(() => {
    const uris = new Set<string>();
    const collect = (arr: CommunityPost[]) => {
      const n = Math.min(arr.length, 12);
      for (let i = 0; i < n; i++) {
        const u = arr[i]?.author?.avatarUri?.trim();
        if (u && /^https?:\/\//i.test(u)) uris.add(u);
      }
    };
    collect(paratiPanelDisplayData);
    collect(followingFeedOrdered);
    if (uris.size === 0) return;
    void ExpoImage.prefetch([...uris], { cachePolicy: 'disk' });
  }, [paratiPanelDisplayData, followingFeedOrdered]);

  /**
   * Defer first mount of Para Ti panel until after Community paints, so the
   * very first open of CommunityScreen is not penalised by mounting two feeds.
   *
   * IMPORTANT: We only mark the panel as hydrated once we've actually got
   * data. If `allPosts` is still empty (Supabase hydrating), the effect
   * re-runs as soon as `allPosts` changes, and tries again. Without this
   * guard, the panel would mount empty and stay empty (black screen).
   *
   * Robustez añadida:
   * 1. Refs para leer los valores frescos dentro del callback. Sin esto,
   *    si `followingSet` / `viewerClanId` cambian durante la hidratación
   *    de Supabase (que en cold-start oscila por refresh_token 504), el
   *    effect se re-ejecuta y cancela el handle de InteractionManager
   *    antes de que llegue a resolverse → loading infinito.
   * 2. Fallback timer de 1200ms: si InteractionManager nunca resuelve
   *    porque hay animaciones suspendidas o el JS thread está saturado,
   *    forzamos el mount de igual manera.
   * 3. Reset del ref cuando cambia `activeUserId` (sim ↔ real): así
   *    cuando llega la hidratación de Supabase tras el login real, el
   *    panel se rehidrata con los 502 posts en vez de quedarse con la
   *    snapshot anterior (sim/vacía).
   */
  const allPostsRef = useRef(allPosts);
  allPostsRef.current = allPosts;
  const followingSetRef = useRef(followingSet);
  followingSetRef.current = followingSet;
  const viewerClanIdRef = useRef(viewerClanId);
  viewerClanIdRef.current = viewerClanId;
  const followingSortRef = useRef(followingSort);
  followingSortRef.current = followingSort;
  const getBoostRef = useRef(getBoost);
  getBoostRef.current = getBoost;
  const paratiSeenIdsRef = useRef(paratiSeenIds);
  paratiSeenIdsRef.current = paratiSeenIds;

  // Reset panel hydration solo cuando el usuario activo es un UUID REAL
  // nuevo (sim → real por primera vez, o real → otro real al cambiar de
  // cuenta). NO resetear en oscilaciones u1 ↔ UUID provocadas por fallos
  // de refresh_token: pisaría el mount cada pocos segundos durante un
  // 504 sostenido y mostraría loading infinito.
  const lastRealUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const isReal = isRealUserId(activeUserId);
    const switchedToNewReal =
      isReal && lastRealUserIdRef.current !== activeUserId;
    if (switchedToNewReal) {
      lastRealUserIdRef.current = activeUserId;
      paratiPanelHydratedRef.current = false;
      setParatiPanelData([]);
      setParatiPanelMounted(false);
    }

    if (paratiPanelHydratedRef.current) return;
    if (allPosts.length === 0) return;

    const doMount = () => {
      if (paratiPanelHydratedRef.current) return;
      const posts = allPostsRef.current;
      if (posts.length === 0) return;
      const snap = new Set(paratiSeenIdsRef.current);
      const data = getDataForMode(
        'foryou',
        posts,
        followingSetRef.current,
        viewerClanIdRef.current,
        mockCurrentUser.id,
        followingSortRef.current,
        getBoostRef.current,
        snap,
      );
      if (data.length === 0) return;
      paratiPanelHydratedRef.current = true;
      setParatiPanelData(data);
      setParatiPanelInitialIndex(0);
      setParatiPanelMounted(true);
    };

    const handle = InteractionManager.runAfterInteractions(doMount);
    const fallbackTimer = setTimeout(doMount, 1200);

    return () => {
      handle.cancel();
      clearTimeout(fallbackTimer);
    };
    // Re-correr solo cuando cambia la cantidad de posts disponibles o cuando
    // cambia el usuario activo. Las refs de arriba garantizan que el callback
    // siempre lee los valores frescos sin necesidad de deps inestables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPosts.length, activeUserId]);

  /**
   * Hydrate / re-target the persistent Para Ti panel.
   * Used by deep-links that need to land on a specific postId, and by the
   * widget cold-start retry. Always runs synchronously — no defer.
   */
  const hydrateParatiPanel = useCallback(
    (postId?: string): { resolved: boolean; data: CommunityPost[] } => {
      const snap = new Set(paratiSeenIds);
      const baseData = getDataForMode(
        'foryou',
        allPosts,
        followingSet,
        viewerClanId,
        mockCurrentUser.id,
        followingSort,
        getBoost,
        snap,
      );
      const { data, initialIndex, resolved } = foryouDetailWithTargetPost(
        baseData,
        postId,
        getPostById,
      );
      if (postId && !resolved) return { resolved: false, data: [] };
      // Sin datos no hidratamos: el effect inicial reintentará cuando lleguen.
      if (data.length === 0) return { resolved: false, data };
      const clampedIndex = clampDetailInitialIndex(data.length, initialIndex);
      paratiPanelHydratedRef.current = true;
      setParatiPanelData(data);
      setParatiPanelInitialIndex(clampedIndex);
      setParatiPanelKey((k) => k + 1);
      setParatiPanelMounted(true);
      return { resolved: true, data };
    },
    [
      allPosts,
      followingSet,
      viewerClanId,
      followingSort,
      getBoost,
      paratiSeenIds,
      getPostById,
    ],
  );

  const openDetailFeed = useCallback(
    (mode: FeedMode, postId?: string, skipAnimation?: boolean) => {
      // Para Ti uses the persistent panel — switching to it is a visibility
      // toggle, not a remount. We only re-hydrate when a specific postId is
      // requested (deep-link / widget) so that post is centered.
      if (mode === 'foryou') {
        if (postId) {
          const { resolved, data } = hydrateParatiPanel(postId);
          if (!resolved) {
            pendingWidgetPostIdRef.current = postId;
            return;
          }
          pendingWidgetPostIdRef.current = null;
          // Si ya estaba montado, hay que hacer scroll explícito al post solicitado
          // (initialScrollIndex sólo aplica al primer mount).
          if (skipAnimation && data.length > 0) {
            const idx = clampDetailInitialIndex(
              data.length,
              data.findIndex((p) => p.id === postId),
            );
            const scrollToPost = () => {
              paratiPanelListRef.current?.scrollToIndex({ index: idx, animated: false });
            };
            requestAnimationFrame(() => {
              InteractionManager.runAfterInteractions(scrollToPost);
            });
            setTimeout(scrollToPost, 120);
          }
        }
        setActiveTab('para-ti');
        return;
      }
      const data = followingFeedOrdered;
      let initialIndex = 0;
      if (postId) {
        const idx = data.findIndex((p) => p.id === postId);
        initialIndex = idx >= 0 ? idx : 0;
      }
      if (data.length === 0) return;
      initialIndex = clampDetailInitialIndex(data.length, initialIndex);
      setDetailFeed({ mode, data, initialIndex });
      slideAnim.setValue(1);
    },
    [
      slideAnim,
      followingFeedOrdered,
      paratiSeenIds,
      hydrateParatiPanel,
    ],
  );

  // No sincronizar `detailFeed.data` con el ranking en vivo mientras el visor está abierto:
  // votos, taste y “vistos” reordenan `foryouFeedOrdered` y sustituir `data` hace que FlatList
  // salte o parezca que la publicación “desaparece”. La lista es snapshot al abrir; al cerrar,
  // la próxima apertura trae el orden actual.

  /**
   * useLayoutEffect fires synchronously after React commits but BEFORE the
   * native thread paints the frame. Params de expo-router pueden perderse en
   * cold start; el intent en `communityPostDeepLink` cubre widget / share.
   */
  useLayoutEffect(() => {
    const scheduled = peekCommunityPostDeepLink();
    const forcedPid = consumeForcedCommunityPostOpen();
    const forcedCommentId = consumeForcedCommunityCommentOpen();
    const forcedNavEpoch = consumeForcedNavigationEpoch();

    if (forcedPid || forcedCommentId || forcedNavEpoch > 0) {
      consumedDeepLinkRef.current = undefined;
    }

    const pid =
      normalizeRouteParam(postIdParam) ?? forcedPid ?? scheduled?.postId;
    const commentId =
      normalizeRouteParam(commentIdParam) ??
      forcedCommentId ??
      scheduled?.commentId;

    if (!pid) return;

    let tab: TabId = 'para-ti';
    if (tabParam) {
      const normalized =
        tabParam === 'mas-votadas' ? 'para-ti' : (tabParam as TabId);
      if (VALID_TAB_IDS.includes(normalized)) tab = normalized;
    }

    const navEpoch =
      normalizeRouteParam(navParam) ??
      (forcedNavEpoch > 0 ? String(forcedNavEpoch) : '0');

    const deepLinkKey = `${navEpoch}|${tab}|${pid}|${commentId ?? ''}`;
    if (consumedDeepLinkRef.current === deepLinkKey) return;
    consumedDeepLinkRef.current = deepLinkKey;
    acknowledgeCommunityPostDeepLink();

    setFocusPostId(pid);
    setFocusCommentId(commentId ?? null);
    pendingCommentIdRef.current = commentId ?? null;

    if (tab === 'para-ti') {
      setActiveTab('para-ti');
      if (entryAnimPlaying) {
        pendingWidgetPostIdRef.current = pid;
      } else {
        openDetailFeed('foryou', pid, true);
      }
    } else {
      setActiveTab(tab);
    }
  }, [
    tabParam,
    postIdParam,
    commentIdParam,
    navParam,
    postNavigationTick,
    openDetailFeed,
    entryAnimPlaying,
  ]);

  // Tras animación de bienvenida: abrir el post del widget (cold start puede programar
  // el intent después del primer layout; peek + notify lo cubren).
  useEffect(() => {
    if (entryAnimPlaying) return;

    const scheduled = peekCommunityPostDeepLink();
    if (scheduled?.postId && !pendingWidgetPostIdRef.current) {
      pendingWidgetPostIdRef.current = scheduled.postId;
      pendingCommentIdRef.current = scheduled.commentId ?? null;
      acknowledgeCommunityPostDeepLink();
      setActiveTab('para-ti');
    }

    const pid = pendingWidgetPostIdRef.current;
    if (!pid) return;
    if (!getPostById(pid)) {
      // El post del widget / compartido puede no estar en el feed local
      // (autor no seguido, fuera del top global). Lo traemos por ID y lo
      // inyectamos; cuando `allPosts` cambie, este efecto vuelve a correr.
      if (deepLinkFetchRef.current !== pid) {
        deepLinkFetchRef.current = pid;
        void (async () => {
          const ok = await ingestPostsByIds([pid]);
          if (!ok) void refreshSocialFromSupabase();
        })();
      }
      return;
    }
    deepLinkFetchRef.current = null;
    pendingWidgetPostIdRef.current = null;
    openDetailFeed('foryou', pid, true);
  }, [
    entryAnimPlaying,
    allPosts,
    getPostById,
    openDetailFeed,
    refreshSocialFromSupabase,
    ingestPostsByIds,
    postNavigationTick,
  ]);

  useEffect(() => {
    if (!paratiPanelVisible) {
      paratiRefreshShiftAnim.setValue(0);
    }
  }, [paratiPanelVisible, paratiRefreshShiftAnim]);

  const closeDetailFeed = useCallback(() => {
    slideAnim.setValue(0);
    setDetailFeed(null);
    // Reset so widget / deep links can open Para ti again after closing.
    consumedDeepLinkRef.current = undefined;
    pendingWidgetPostIdRef.current = null;
    pendingCommentIdRef.current = null;
    deepLinkFetchRef.current = null;
    setFocusPostId(null);
    setFocusCommentId(null);
  }, [slideAnim]);

  const listTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -screenW],
  });
  const detailTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenW, 0],
  });

  const handlePostPress = useCallback(
    (post: CommunityPost) => {
      openDetailFeed(tabToFeedMode(activeTab), post.id);
    },
    [activeTab, openDetailFeed],
  );

  const handleAuthorPress = useCallback(
    (userId: string, username?: string) => {
      if (userId === mockCurrentUser.id) {
        navigateUnlessCurrent(pathname, '/my-profile');
      } else {
        const href = username
          ? `/profile/${userId}?username=${encodeURIComponent(username)}`
          : `/profile/${userId}`;
        navigateUnlessCurrent(pathname, href);
      }
    },
    [router, pathname],
  );
  const handleClanPress = useCallback(
    (clanId: string) => {
      const href = `/clan/${String(clanId).trim().toLowerCase()}`;
      navigateUnlessCurrent(pathname, href);
    },
    [pathname],
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      const tabId = tab as TabId;

      if (tabId === 'para-ti') {
        const alreadyActive = activeTab === 'para-ti' && !detailFeed;
        if (alreadyActive) {
          // Re-pulsar Para Ti = pull-to-refresh sobre el panel persistente.
          void (async () => {
            const shift = PARATI_REFRESH_SHIFT;
            paratiRefreshShiftAnim.setValue(0);
            try {
              const [, simPosts] = await Promise.all([
                new Promise<void>((resolve) => {
                  Animated.spring(paratiRefreshShiftAnim, {
                    toValue: shift,
                    useNativeDriver: true,
                    tension: 128,
                    friction: 15,
                  }).start(() => resolve());
                }),
                refreshSocialFromSupabase(),
              ]);
              const profileCache = await buildAuthorProfileCacheFromSimPosts(simPosts);
              const freshAll = simPosts
                .filter((p) => isPublishedSimPostType(p.type))
                .filter((p) => !blockedIds.has(p.authorId))
                .map((p) => simPostToCommunityPost(p, profileCache));
              const emptySeen = new Set<string>();
              const data = getDataForMode(
                'foryou',
                freshAll,
                followingSet,
                viewerClanId,
                mockCurrentUser.id,
                followingSort,
                getBoost,
                emptySeen,
              );
              paratiPanelHydratedRef.current = true;
              setParatiPanelData(data);
              setParatiPanelInitialIndex(0);
              setParatiPanelKey((k) => k + 1);
              setParatiDetailFeedKey((k) => k + 1);
            } finally {
              await new Promise<void>((resolve) => {
                Animated.spring(paratiRefreshShiftAnim, {
                  toValue: 0,
                  useNativeDriver: true,
                  tension: 132,
                  friction: 17,
                }).start(() => resolve());
              });
            }
          })();
          return;
        }
        // Cambio a Para Ti — solo toggle de visibilidad sobre panel ya montado.
        // Si todavía no se ha hidratado (caso muy temprano), lo hidrato síncrono.
        if (!paratiPanelHydratedRef.current) {
          hydrateParatiPanel();
        }
        if (detailFeed) closeDetailFeed();
        setActiveTab('para-ti');
        return;
      }

      if (detailFeed) {
        setActiveTab(tabId);
        closeDetailFeed();
        return;
      }

      if (activeTab === tabId) return;
      setActiveTab(tabId);
    },
    [
      activeTab,
      detailFeed,
      closeDetailFeed,
      refreshSocialFromSupabase,
      followingSet,
      followingSort,
      viewerClanId,
      getBoost,
      paratiRefreshShiftAnim,
      hydrateParatiPanel,
    ],
  );

  // Aplica la pestaña pedida desde OTRA pantalla (perfil, racha, etc.) sin los
  // efectos secundarios de handleTabChange (p. ej. el pull-to-refresh de Para Ti
  // al re-pulsar). Solo selecciona la pestaña y cierra el visor de detalle si
  // estuviera abierto.
  // Spinner de "aparición diferida" al llegar a Comunidad desde otra pantalla.
  // NO se muestra de entrada: si la pantalla carga rápido (caso normal), el
  // contenido sale al instante y nunca se ve spinner — así no añadimos retraso
  // artificial. Solo si tras una pequeña gracia (GRACE_MS) las interacciones/
  // render aún no terminaron, aparece el spinner para tapar la espera; una vez
  // visible se mantiene un mínimo (MIN_VISIBLE_MS) para no parpadear. Tope de
  // seguridad (MAX_MS) para que nunca quede colgado.
  const beginArrivalLoading = useCallback(() => {
    const GRACE_MS = 160;
    const MIN_VISIBLE_MS = 300;
    const MAX_MS = 4000;

    arrivalLoadingCancelRef.current?.();

    let shownAt = 0;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const graceTimer = setTimeout(() => {
      shownAt = Date.now();
      setArrivalLoading(true);
    }, GRACE_MS);

    const finish = () => {
      clearTimeout(graceTimer);
      clearTimeout(maxTimer);
      if (shownAt === 0) {
        // Nunca llegó a mostrarse: carga rápida, nada que ocultar.
        arrivalLoadingCancelRef.current = null;
        return;
      }
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
      if (remaining === 0) {
        setArrivalLoading(false);
        arrivalLoadingCancelRef.current = null;
      } else {
        hideTimer = setTimeout(() => {
          setArrivalLoading(false);
          arrivalLoadingCancelRef.current = null;
        }, remaining);
      }
    };

    const maxTimer = setTimeout(finish, MAX_MS);
    const interaction = InteractionManager.runAfterInteractions(finish);

    arrivalLoadingCancelRef.current = () => {
      clearTimeout(graceTimer);
      clearTimeout(maxTimer);
      if (hideTimer) clearTimeout(hideTimer);
      interaction.cancel();
      setArrivalLoading(false);
    };
  }, []);

  useEffect(() => () => arrivalLoadingCancelRef.current?.(), []);

  const applyRequestedTab = useCallback(
    (tabId: TabId) => {
      beginArrivalLoading();
      if (tabId === 'para-ti') {
        if (!paratiPanelHydratedRef.current) hydrateParatiPanel();
        if (detailFeed) closeDetailFeed();
        setActiveTab('para-ti');
        return;
      }
      if (detailFeed) closeDetailFeed();
      setActiveTab(tabId);
    },
    [detailFeed, closeDetailFeed, hydrateParatiPanel, beginArrivalLoading],
  );

  // Consume la pestaña solicitada cuando se navega a Comunidad desde fuera. Se
  // dispara con postNavigationTick (que sube tanto en deep-links como al pedir
  // pestaña). Cubre el caso de RE-PULSAR la misma pestaña (el query param no
  // cambia, así que el efecto de param de abajo no se reactivaría).
  //
  // useLayoutEffect (no useEffect): corre tras el commit pero ANTES del pintado,
  // así el spinner y la pestaña correcta se aplican en el primer frame visible.
  // Con useEffect se veía un parpadeo: contenido/pestaña equivocada → spinner.
  useLayoutEffect(() => {
    const requested = consumeRequestedCommunityTab();
    if (!requested) return;
    const normalized = requested === 'mas-votadas' ? 'para-ti' : requested;
    if (!VALID_TAB_IDS.includes(normalized as TabId)) return;
    applyRequestedTab(normalized as TabId);
  }, [postNavigationTick, applyRequestedTab]);

  // Mecanismo principal: aplica la pestaña del query param `tab` cuando CAMBIA
  // (navegación desde perfil/racha/etc.). El ref-guard evita reaplicarla en
  // re-renders posteriores (p. ej. al llegar avatares), lo que pisaría un cambio
  // de pestaña interno. Los deep-links con postId los maneja el useLayoutEffect.
  const lastAppliedTabParamRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!tabParam) return;
    if (normalizeRouteParam(postIdParam)) return;
    if (lastAppliedTabParamRef.current === tabParam) return;
    lastAppliedTabParamRef.current = tabParam;
    const normalized = tabParam === 'mas-votadas' ? 'para-ti' : tabParam;
    if (!VALID_TAB_IDS.includes(normalized as TabId)) return;
    applyRequestedTab(normalized as TabId);
  }, [tabParam, postIdParam, applyRequestedTab]);

  const topBarHeight = getAppTopBarLayoutHeight(insets.top);
  const feedItemHeight = getMainColumnHeightForFloatingBottomBar(
    screenH,
    insets.top,
    insets.bottom,
    safeFrame.height,
  );

  /**
   * Main panel list = Siguiendo. Para Ti vive en su propio panel persistente
   * (más abajo). Mantenemos la data aunque la pestaña activa sea Para Ti / Search:
   * así no se re-renderiza al volver a Siguiendo (sólo se oculta con display:none).
   */
  const {
    visibleData: listData,
    hasMore: hasMoreFollowing,
    loadMore: loadMoreFollowing,
  } = useIncrementalList(followingFeedOrdered, 10);

  // Ventana de montaje anclada a lo visible. `onViewableItemsChanged` y
  // `viewabilityConfig` deben ser referencias ESTABLES (FlatList lanza error si
  // cambian entre renders), por eso van en refs.
  const followingViewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 10 });
  const onFollowingViewableChangedRef = useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      if (viewableItems.length === 0) return;
      let first = Number.POSITIVE_INFINITY;
      let last = Number.NEGATIVE_INFINITY;
      for (const v of viewableItems) {
        if (v.index == null) continue;
        if (v.index < first) first = v.index;
        if (v.index > last) last = v.index;
      }
      if (!Number.isFinite(first)) return;
      // Centramos la ventana en lo visible: la mitad por encima y la mitad por
      // debajo, para que al subir o bajar las cercanas sigan montadas.
      const center = Math.floor((first + last) / 2);
      const next = Math.max(0, center - Math.floor(FOLLOWING_FEED_WINDOW / 2));
      if (next !== followingWindowStartRef.current) {
        followingWindowStartRef.current = next;
        setFollowingWindowStart(next);
      }
    },
  );

  // Al cambiar la ordenación (recientes / 24h / 30d) la lista se reordena: la
  // ventana vuelve al principio.
  useEffect(() => {
    followingWindowStartRef.current = 0;
    setFollowingWindowStart(0);
  }, [followingSort]);

  const communityFeedUsableWidth =
    screenW - SVG_CARD_VISUAL.CARD_HORIZONTAL_MARGIN * 2;
  const communityWideFeedLayout =
    communityFeedUsableWidth > COMMUNITY_FEED_CARD_MAX_INNER_WIDTH;

  const feedCardSlotOuterHeight =
    feedItemHeight -
    COMMUNITY_FEED_LIST_PADDING_TOP -
    (Platform.OS === 'android' ? COMMUNITY_FEED_SLOT_BOTTOM_INSET_ANDROID : 0) -
    (communityWideFeedLayout ? COMMUNITY_FEED_SLOT_BOTTOM_WIDE : 0);

  const renderMainListItem = useCallback(
    ({ item, index }: { item: CommunityPost; index: number }): React.ReactElement => {
      const inWindow =
        index >= followingWindowStart &&
        index < followingWindowStart + FOLLOWING_FEED_WINDOW;

      if (!inWindow) {
        // Lejos de la pantalla (fuera de la ventana de las ~20 cercanas): no
        // montamos la tarjeta pesada. Mantenemos el hueco con la altura medida
        // y mostramos la ruedita; al acercarte de nuevo se vuelve a montar.
        const placeholderHeight =
          followingCardHeightsRef.current.get(item.id) ?? feedCardSlotOuterHeight;
        return (
          <View style={{ height: placeholderHeight, justifyContent: 'center' }}>
            <ClanLoadingDot inline clanId={viewerClanId} />
          </View>
        );
      }

      return (
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0) followingCardHeightsRef.current.set(item.id, h);
          }}
        >
          <CommunityPostCard
            post={item}
            showPhraseAuthor={activeTab === 'para-ti'}
            slotOuterHeight={feedCardSlotOuterHeight}
            followingFeedStyle={activeTab === 'siguiendo'}
            onPress={handlePostPress}
            onAuthorPress={handleAuthorPress}
          />
        </View>
      );
    },
    [
      activeTab,
      feedCardSlotOuterHeight,
      handlePostPress,
      handleAuthorPress,
      followingWindowStart,
      viewerClanId,
    ],
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <ReflectionDetailItem
        post={item}
        itemHeight={feedItemHeight}
        onAuthorPress={handleAuthorPress}
        onClanPress={handleClanPress}
        onReadingModeChange={handleReadingModeChange}
        communityVerticalFeed
        highlightCommentId={
          focusPostId === item.id ? (focusCommentId ?? undefined) : undefined
        }
        reflectionStarSurfaceColor={evoconnColors.background}
      />
    ),
    [
      feedItemHeight,
      handleAuthorPress,
      handleClanPress,
      handleReadingModeChange,
      focusPostId,
      focusCommentId,
    ],
  );

  const getFeedItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: feedItemHeight,
      offset: feedItemHeight * index,
      index,
    }),
    [feedItemHeight],
  );

  const displayTab: TabId = detailFeed
    ? (detailFeed.mode === 'foryou' ? 'para-ti' : 'siguiendo')
    : activeTab;
  /**
   * Para Ti está visible cuando: (a) la pestaña activa es Para Ti, (b) no hay
   * detail overlay encima, y (c) el panel ya está hidratado. La condición (c)
   * evita que ocultemos el panel principal antes de tener algo que mostrar
   * (lo que daría pantalla negra durante la hidratación inicial).
   */
  const paratiPanelVisible =
    activeTab === 'para-ti' && !detailFeed && paratiPanelMounted;

  // ── Sidebar open/close animation ──────────────────────────────────
  useEffect(() => {
    if (sidebarOpen) {
      if (gestureCommittingRef.current) {
        gestureCommittingRef.current = false;
        Animated.spring(drawerOpenProgress, {
          toValue: 1,
          useNativeDriver: true,
          friction: 9,
          tension: 68,
        }).start();
      } else {
        Animated.timing(drawerOpenProgress, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    } else {
      Animated.timing(drawerOpenProgress, {
        toValue: 0,
        duration: 260,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [sidebarOpen, drawerOpenProgress]);

  // ── Edge-swipe gesture callbacks (sidebar — left edge) ────────────
  const setProgressJS = useCallback(
    (p: number) => { drawerOpenProgress.setValue(p); },
    [drawerOpenProgress],
  );

  const commitGestureOpenJS = useCallback(() => {
    gestureCommittingRef.current = true;
    setSidebarOpen(true);
  }, []);

  const cancelGestureJS = useCallback(() => {
    Animated.timing(drawerOpenProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [drawerOpenProgress]);

  const edgeOpenGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!sidebarOpen)
        .activeOffsetX(12)
        .failOffsetY([-32, 32])
        .onUpdate((e: { translationX: number }) => {
          const p = Math.min(1, Math.max(0, e.translationX / COMMUNITY_DRAWER_GESTURE_RANGE_X));
          runOnJS(setProgressJS)(p);
        })
        .onEnd((e: { translationX: number; velocityX: number }) => {
          const p = Math.min(1, Math.max(0, e.translationX / COMMUNITY_DRAWER_GESTURE_RANGE_X));
          const shouldOpen = p > 0.32 || e.velocityX > 520;
          if (shouldOpen) {
            runOnJS(commitGestureOpenJS)();
          } else {
            runOnJS(cancelGestureJS)();
          }
        }),
    [sidebarOpen, setProgressJS, commitGestureOpenJS, cancelGestureJS],
  );

  // ── Profile reveal overlay (right edge — left swipe) ──────────────
  const visibleAuthorIdRef = useRef<string | null>(null);
  const [visibleAuthorId, setVisibleAuthorId] = useState<string | null>(null);
  const profileRevealAnim = useRef(new Animated.Value(0)).current;
  const [profileOverlayActive, setProfileOverlayActive] = useState(false);

  useEffect(() => {
    if (detailFeed) {
      const id = detailFeed.data[detailFeed.initialIndex]?.author?.id ?? null;
      visibleAuthorIdRef.current = id;
      setVisibleAuthorId(id);
      return;
    }
    if (paratiPanelVisible && paratiPanelData.length > 0) {
      const idx = clampDetailInitialIndex(paratiPanelData.length, paratiPanelInitialIndex);
      const id = paratiPanelData[idx]?.author?.id ?? null;
      visibleAuthorIdRef.current = id;
      setVisibleAuthorId(id);
      return;
    }
    visibleAuthorIdRef.current = null;
    setVisibleAuthorId(null);
  }, [detailFeed, paratiPanelVisible, paratiPanelData, paratiPanelInitialIndex]);

  /** Marcar vistos en "Para ti" al volver a entrar al panel persistente. */
  useEffect(() => {
    if (!paratiPanelVisible) return;
    if (paratiPanelData.length === 0) return;
    const idx = clampDetailInitialIndex(paratiPanelData.length, paratiPanelInitialIndex);
    const pid = paratiPanelData[idx]?.id;
    if (pid) markParatiPostSeen(pid);
  }, [paratiPanelVisible, paratiPanelData, paratiPanelInitialIndex, markParatiPostSeen]);

  /** Marcar vistos en detailFeed mode='foryou' (deep-link / widget abrir post concreto). */
  useEffect(() => {
    if (!detailFeed || detailFeed.mode !== 'foryou') return;
    const len = detailFeed.data.length;
    if (len === 0) return;
    const idx = clampDetailInitialIndex(len, detailFeed.initialIndex);
    const pid = detailFeed.data[idx]?.id;
    if (pid) markParatiPostSeen(pid);
  }, [detailFeed, markParatiPostSeen]);

  /** Dwell time on full-screen posts → taste model (Para ti). */
  const dwellRef = useRef<{ postId: string | null; since: number }>({ postId: null, since: Date.now() });
  const tasteDwellRefs = useRef({ getPostById, recordDwell });
  tasteDwellRefs.current = { getPostById, recordDwell };

  useEffect(() => {
    let len = 0;
    let idx = 0;
    let startId: string | null = null;
    if (detailFeed) {
      len = detailFeed.data.length;
      idx = clampDetailInitialIndex(len, detailFeed.initialIndex);
      startId = len > 0 ? detailFeed.data[idx]?.id ?? null : null;
    } else if (paratiPanelVisible && paratiPanelData.length > 0) {
      len = paratiPanelData.length;
      idx = clampDetailInitialIndex(len, paratiPanelInitialIndex);
      startId = paratiPanelData[idx]?.id ?? null;
    } else {
      return;
    }
    dwellRef.current = { postId: startId, since: Date.now() };
    return () => {
      const { postId, since } = dwellRef.current;
      if (!postId) return;
      const ms = Date.now() - since;
      const p = tasteDwellRefs.current.getPostById(postId);
      if (p && ms >= 450) tasteDwellRefs.current.recordDwell(p, ms);
    };
  }, [detailFeed, paratiPanelVisible, paratiPanelData, paratiPanelInitialIndex]);

  const detailViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const handleViewableItemsChangedForMode = useCallback(
    (mode: FeedMode, viewableItems: Array<{ item: CommunityPost }>) => {
      if (viewableItems.length > 0 && viewableItems[0].item?.author?.id) {
        const post = viewableItems[0].item;
        const now = Date.now();
        const prev = dwellRef.current;
        if (prev.postId && prev.postId !== post.id) {
          const ms = now - prev.since;
          const prevPost = tasteDwellRefs.current.getPostById(prev.postId);
          if (prevPost && ms >= 450) tasteDwellRefs.current.recordDwell(prevPost, ms);
          triggerHapticRef.current('light');
          Keyboard.dismiss();
        }
        dwellRef.current = { postId: post.id, since: now };

        if (mode === 'foryou') {
          markParatiSeenRef.current(post.id);
        }

        const id = post.author.id;
        visibleAuthorIdRef.current = id;
        setVisibleAuthorId(id);
      }
    },
    [],
  );
  const onDetailViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: CommunityPost }> }) => {
      const mode = detailFeedModeRef.current ?? 'foryou';
      handleViewableItemsChangedForMode(mode, viewableItems);
    },
    [handleViewableItemsChangedForMode],
  );
  const onParatiPanelViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: CommunityPost }> }) => {
      handleViewableItemsChangedForMode('foryou', viewableItems);
    },
    [handleViewableItemsChangedForMode],
  );

  const profileRevealOverlayTranslateX = profileRevealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenW, 0],
  });
  const profileRevealDimOpacity = profileRevealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  // ── Profile OPEN gesture callbacks (left swipe from right edge) ───
  const setProfileProgressJS = useCallback(
    (p: number) => { profileRevealAnim.setValue(p); },
    [profileRevealAnim],
  );

  const commitProfileRevealJS = useCallback(() => {
    Animated.spring(profileRevealAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 9,
      tension: 68,
    }).start(({ finished }) => {
      if (finished) {
        setProfileOverlayActive(true);
      }
    });
  }, [profileRevealAnim]);

  const cancelProfileRevealJS = useCallback(() => {
    Animated.timing(profileRevealAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [profileRevealAnim]);

  /** Revealing the profile overlay works in both: detailFeed AND persistent Para Ti panel. */
  const verticalViewerVisible = detailMounted || paratiPanelVisible;
  const profileRevealGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(verticalViewerVisible && !sidebarOpen && !profileOverlayActive)
        .activeOffsetX(-12)
        .failOffsetY([-32, 32])
        .onUpdate((e: { translationX: number }) => {
          const p = Math.min(1, Math.max(0, -e.translationX / COMMUNITY_DRAWER_GESTURE_RANGE_X));
          runOnJS(setProfileProgressJS)(p);
        })
        .onEnd((e: { translationX: number; velocityX: number }) => {
          const p = Math.min(1, Math.max(0, -e.translationX / COMMUNITY_DRAWER_GESTURE_RANGE_X));
          const shouldOpen = p > 0.32 || -e.velocityX > 520;
          if (shouldOpen) {
            runOnJS(commitProfileRevealJS)();
          } else {
            runOnJS(cancelProfileRevealJS)();
          }
        }),
    [verticalViewerVisible, sidebarOpen, profileOverlayActive, setProfileProgressJS, commitProfileRevealJS, cancelProfileRevealJS],
  );

  // ── Profile CLOSE gesture callbacks (right swipe from left edge) ──
  const commitProfileCloseJS = useCallback(() => {
    Animated.timing(profileRevealAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setProfileOverlayActive(false);
      }
    });
  }, [profileRevealAnim]);

  const cancelProfileCloseJS = useCallback(() => {
    Animated.spring(profileRevealAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 9,
      tension: 68,
    }).start();
  }, [profileRevealAnim]);

  const profileCloseGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(profileOverlayActive)
        .activeOffsetX(12)
        .failOffsetY([-32, 32])
        .onUpdate((e: { translationX: number }) => {
          const p = Math.max(0, Math.min(1, 1 - e.translationX / COMMUNITY_DRAWER_GESTURE_RANGE_X));
          runOnJS(setProfileProgressJS)(p);
        })
        .onEnd((e: { translationX: number; velocityX: number }) => {
          const progress = Math.max(0, Math.min(1, 1 - e.translationX / COMMUNITY_DRAWER_GESTURE_RANGE_X));
          const shouldClose = progress < 0.68 || e.velocityX > 520;
          if (shouldClose) {
            runOnJS(commitProfileCloseJS)();
          } else {
            runOnJS(cancelProfileCloseJS)();
          }
        }),
    [profileOverlayActive, setProfileProgressJS, commitProfileCloseJS, cancelProfileCloseJS],
  );

  const edgeBottomOffset = getBottomBarEdgeGestureBottomOffset(insets.bottom);

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
      />

      <View style={[styles.contentArea, { height: feedItemHeight }]}>
        {/* Panel principal: lista de Siguiendo / Search.
            Oculto con display:'none' cuando estamos en Para Ti — así Yoga no
            mide su layout cada frame y el cambio de pestaña es instantáneo. */}
        <Animated.View
          style={[
            styles.panel,
            styles.panelOverlay,
            { transform: [{ translateX: listTranslateX }] },
            paratiPanelVisible && styles.panelHidden,
          ]}
        >
          {activeTab === 'search' ? (
            <SearchScreen onUserPress={handleAuthorPress} onClanPress={handleClanPress} />
          ) : (
            <FlatList
              data={listData}
              renderItem={renderMainListItem}
              keyExtractor={(item) => item.id}
              extraData={followingWindowStart}
              onViewableItemsChanged={onFollowingViewableChangedRef.current}
              viewabilityConfig={followingViewabilityConfigRef.current}
              onEndReached={loadMoreFollowing}
              onEndReachedThreshold={0.6}
              initialNumToRender={10}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={50}
              // Salvavidas de memoria: aunque vayas desbloqueando cientos de posts
              // de 10 en 10, FlatList solo mantiene MONTADA una ventana pequeña de
              // tarjetas alrededor de lo visible; las de arriba/abajo se descargan
              // de verdad (removeClippedSubviews). Así nunca hay "mil tarjetas"
              // montadas a la vez por mucho que sigas bajando.
              windowSize={5}
              removeClippedSubviews
              ListFooterComponent={hasMoreFollowing ? <ClanLoadingDot inline /> : null}
              contentContainerStyle={[
                styles.list,
                {
                  paddingBottom: getBottomBarScrollContentPaddingBottom(
                    insets.bottom,
                    screenH,
                    safeFrame.height,
                  ),
                },
              ]}
              style={styles.panelInner}
            />
          )}
        </Animated.View>

        {/* Panel persistente de Para Ti — siempre montado tras el primer
            InteractionManager. Cambiar entre Siguiendo ↔ Para Ti es solo un
            toggle de visibilidad, sin re-mount ni "carga a trozos". */}
        {paratiPanelMounted ? (
          <View
            style={[
              styles.panel,
              styles.panelOverlay,
              !paratiPanelVisible && styles.panelHidden,
            ]}
            pointerEvents={paratiPanelVisible ? 'auto' : 'none'}
          >
            <View style={styles.paratiDetailWithRefreshWrap}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.paratiRefreshHeader,
                  { height: PARATI_REFRESH_SHIFT, opacity: paratiRefreshSpinnerOpacity },
                ]}
              >
                <ActivityIndicator size="large" color={paratiUserClanColor} />
              </Animated.View>
              <Animated.View
                style={[
                  styles.panelInner,
                  { transform: [{ translateY: paratiRefreshShiftAnim }] },
                ]}
              >
                <FlatList
                  key={`parati-panel-${paratiPanelKey}`}
                  ref={paratiPanelListRef}
                  data={paratiPanelDisplayData}
                  renderItem={renderFeedItem}
                  keyExtractor={(item) => item.id}
                  pagingEnabled
                  nestedScrollEnabled
                  scrollEnabled={feedScrollEnabled && !profileOverlayActive && paratiPanelVisible}
                  decelerationRate={
                    Platform.OS === 'ios' ? COMMUNITY_DETAIL_DECELERATION_RATE_IOS : 'fast'
                  }
                  showsVerticalScrollIndicator={false}
                  getItemLayout={getFeedItemLayout}
                  initialScrollIndex={
                    paratiPanelData.length > 0
                      ? clampDetailInitialIndex(paratiPanelData.length, paratiPanelInitialIndex)
                      : 0
                  }
                  initialNumToRender={FEED_PREFETCH}
                  maxToRenderPerBatch={FEED_MAX_BATCH}
                  updateCellsBatchingPeriod={FEED_BATCH_PERIOD}
                  windowSize={FEED_WINDOW_SIZE}
                  removeClippedSubviews={FEED_CLIP_SUBVIEWS}
                  style={styles.panelInner}
                  viewabilityConfig={detailViewabilityConfig}
                  onViewableItemsChanged={onParatiPanelViewableItemsChanged}
                />
              </Animated.View>
            </View>
          </View>
        ) : null}

        {/* Loading clan-coloured spinner mientras se hidrata Para Ti
            (caso: usuario pulsa la pestaña antes de que `allPosts` llegue). */}
        {activeTab === 'para-ti' && !paratiPanelMounted && !detailFeed ? (
          <View
            style={[styles.panel, styles.panelOverlay, styles.paratiLoadingCenter]}
            pointerEvents="none"
          >
            <ActivityIndicator size="large" color={paratiUserClanColor} />
          </View>
        ) : null}

        {detailMounted ? (
          <Animated.View
            style={[
              styles.panel,
              styles.panelOverlay,
              { transform: [{ translateX: detailTranslateX }] },
            ]}
          >
            {detailFeed?.mode === 'foryou' ? (
              <View style={styles.paratiDetailWithRefreshWrap}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.paratiRefreshHeader,
                    { height: PARATI_REFRESH_SHIFT, opacity: paratiRefreshSpinnerOpacity },
                  ]}
                >
                  <ActivityIndicator size="large" color={paratiUserClanColor} />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.panelInner,
                    { transform: [{ translateY: paratiRefreshShiftAnim }] },
                  ]}
                >
                  <FlatList
                    key={`parati-${paratiDetailFeedKey}`}
                    ref={detailFeedListRef}
                    data={detailFeed?.data ?? []}
                    renderItem={renderFeedItem}
                    keyExtractor={(item) => item.id}
                    pagingEnabled
                    nestedScrollEnabled
                    scrollEnabled={feedScrollEnabled && !profileOverlayActive}
                    decelerationRate={
                      Platform.OS === 'ios' ? COMMUNITY_DETAIL_DECELERATION_RATE_IOS : 'fast'
                    }
                    showsVerticalScrollIndicator={false}
                    getItemLayout={getFeedItemLayout}
                    initialScrollIndex={
                      detailFeed && detailFeed.data.length > 0
                        ? clampDetailInitialIndex(detailFeed.data.length, detailFeed.initialIndex)
                        : 0
                    }
                    initialNumToRender={FEED_PREFETCH}
                    maxToRenderPerBatch={FEED_MAX_BATCH}
                    updateCellsBatchingPeriod={FEED_BATCH_PERIOD}
                    windowSize={FEED_WINDOW_SIZE}
                    removeClippedSubviews={FEED_CLIP_SUBVIEWS}
                    style={styles.panelInner}
                    viewabilityConfig={detailViewabilityConfig}
                    onViewableItemsChanged={onDetailViewableItemsChanged}
                  />
                </Animated.View>
              </View>
            ) : (
              <FlatList
                key="following-detail"
                ref={detailFeedListRef}
                data={detailFeed?.data ?? []}
                renderItem={renderFeedItem}
                keyExtractor={(item) => item.id}
                pagingEnabled
                nestedScrollEnabled
                scrollEnabled={feedScrollEnabled && !profileOverlayActive}
                decelerationRate={
                  Platform.OS === 'ios' ? COMMUNITY_DETAIL_DECELERATION_RATE_IOS : 'fast'
                }
                showsVerticalScrollIndicator={false}
                getItemLayout={getFeedItemLayout}
                initialScrollIndex={
                  detailFeed && detailFeed.data.length > 0
                    ? clampDetailInitialIndex(detailFeed.data.length, detailFeed.initialIndex)
                    : 0
                }
                initialNumToRender={FEED_PREFETCH}
                maxToRenderPerBatch={FEED_MAX_BATCH}
                updateCellsBatchingPeriod={FEED_BATCH_PERIOD}
                windowSize={FEED_WINDOW_SIZE}
                removeClippedSubviews={FEED_CLIP_SUBVIEWS}
                style={styles.panelInner}
                viewabilityConfig={detailViewabilityConfig}
                onViewableItemsChanged={onDetailViewableItemsChanged}
              />
            )}
          </Animated.View>
        ) : null}

        {/* Dim overlay between vertical viewer and profile panel */}
        {verticalViewerVisible ? (
          <Animated.View
            pointerEvents={profileOverlayActive ? 'auto' : 'none'}
            style={[
              styles.panel,
              { backgroundColor: '#000', opacity: profileRevealDimOpacity },
            ]}
          />
        ) : null}

        {/* Profile overlay panel (slides in from right) */}
        {verticalViewerVisible && visibleAuthorId ? (
          <Animated.View
            pointerEvents={profileOverlayActive ? 'auto' : 'none'}
            style={[
              styles.panel,
              styles.panelOverlay,
              { transform: [{ translateX: profileRevealOverlayTranslateX }] },
            ]}
          >
            <ProfileRevealPanel
              authorId={visibleAuthorId}
              contentHeight={feedItemHeight}
            />
          </Animated.View>
        ) : null}

        {/* Spinner del clan al LLEGAR a Comunidad desde otra pantalla. Cubre
            todos los paneles para unificar la carga con el resto de la app. */}
        {arrivalLoading ? (
          <View
            style={[styles.panel, styles.panelOverlay, styles.paratiLoadingCenter]}
            pointerEvents="none"
          >
            <ClanLoadingDot clanId={viewerClanId} />
          </View>
        ) : null}
      </View>

      <AppShellBottomTabsWrap>
        <BottomCommunityTabs
          activeTab={displayTab}
          onTabChange={handleTabChange}
          followingSort={followingSort}
          onFollowingSortChange={setFollowingSort}
        />
      </AppShellBottomTabsWrap>

      {/* Left-edge: sidebar gesture — only when profile overlay is NOT active */}
      {!sidebarOpen && !profileOverlayActive ? (
        <GestureDetector gesture={edgeOpenGesture}>
          <View
            style={[
              styles.edgeHitStrip,
              { top: topBarHeight, width: COMMUNITY_DRAWER_EDGE_ZONE_WIDTH, bottom: edgeBottomOffset },
            ]}
          />
        </GestureDetector>
      ) : null}

      {/* Left-edge: profile CLOSE gesture — only when profile overlay IS active */}
      {profileOverlayActive ? (
        <GestureDetector gesture={profileCloseGesture}>
          <View
            style={[
              styles.profileCloseStrip,
              { top: topBarHeight, width: COMMUNITY_DRAWER_EDGE_ZONE_WIDTH, bottom: edgeBottomOffset },
            ]}
          />
        </GestureDetector>
      ) : null}

      {/* Right-edge: profile OPEN gesture — only when vertical viewer visible and profile NOT active */}
      {verticalViewerVisible && !sidebarOpen && !profileOverlayActive ? (
        <GestureDetector gesture={profileRevealGesture}>
          <View
            style={[
              styles.rightEdgeHitStrip,
              { top: topBarHeight, width: RIGHT_EDGE_ZONE_WIDTH, bottom: edgeBottomOffset },
            ]}
          />
        </GestureDetector>
      ) : null}

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) => {
          setSidebarOpen(false);
          router.push({ pathname: '/reflection', params: { thoughtId: id } });
        }}
        searchQuery={searchQuery}
        openProgress={drawerOpenProgress}
      />
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  container: { flex: 1, backgroundColor: evoconnColors.background },
  edgeHitStrip: {
    position: 'absolute',
    left: 0,
    zIndex: 250,
  },
  profileCloseStrip: {
    position: 'absolute',
    left: 0,
    zIndex: 300,
  },
  rightEdgeHitStrip: {
    position: 'absolute',
    right: 0,
    zIndex: 250,
  },
  contentArea: { overflow: 'hidden' },
  panel: {
    ...StyleSheet.absoluteFillObject,
  },
  panelOverlay: {
    backgroundColor: evoconnColors.background,
  },
  /** Para Ti panel oculto: display:none evita que Yoga mida layout cada frame. */
  panelHidden: {
    display: 'none',
  },
  panelInner: { flex: 1 },
  paratiDetailWithRefreshWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  paratiRefreshHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paratiLoadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { paddingTop: 8 },
});
