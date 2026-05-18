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
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { pushUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
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
import { PANEL_STAR_SURFACE_DEFAULT } from '@evoconn/components/animations/StarFieldBackground';
import { SearchScreen } from '@evoconn/components/SearchScreen';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useEffectiveClanId } from '@evoconn/hooks/useEffectiveClanId';
import { getClanColor } from '@evoconn/constants/clanColors';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import { ProfileRevealPanel } from '@evoconn/components/otherProfile';
import {
  sortFollowingPosts,
  type FollowingSortOption,
} from '@evoconn/constants/followingFeedSort';
import { getParatiAuthorClanMembershipMultiplier } from '@evoconn/logic/feed/paratiFeedRanking';

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
      const pool = allPosts.filter((p) => ids.has(p.author.id));
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
  const { tab: tabParam, postId: postIdParam } = useLocalSearchParams<{ tab?: string; postId?: string }>();
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { followingSet } = useFollowState();
  const { thoughts } = useThoughts();
  const { posts: allPosts, getPostById } = useFeedStore();
  const { refreshSocialFromSupabase } = useSimulation();
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
  const [activeTab, setActiveTab] = useState<TabId>('siguiendo');
  const [followingSort, setFollowingSort] = useState<FollowingSortOption>('recientes');
  /** While "Para ti" fullscreen is open, freeze seen-ids used for ordering so the list does not jump as posts are marked seen. */
  const [foryouSeenFrozen, setForyouSeenFrozen] = useState<Set<string> | null>(null);

  // Track which tabParam value we have already reacted to so we never
  // re-trigger the same navigation when openDetailFeed's reference changes.
  const consumedTabParamRef = useRef<string | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);

  const tabSlideAnim = useRef(new Animated.Value(1)).current;
  const [transitionTab, setTransitionTab] = useState<TabId | null>(null);
  const slideDirectionRef = useRef(1);

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
  const markParatiSeenRef = useRef(markParatiPostSeen);
  markParatiSeenRef.current = markParatiPostSeen;
  const triggerHapticRef = useRef(triggerHaptic);
  triggerHapticRef.current = triggerHaptic;

  const seenForParatiOrder = foryouSeenFrozen ?? paratiSeenIds;

  /** Orden global Para ti — memoizado para no re-ordenar en cada frame y al abrir el detalle. */
  const foryouFeedOrdered = useMemo(
    () =>
      getDataForMode(
        'foryou',
        allPosts,
        followingSet,
        viewerClanId,
        mockCurrentUser.id,
        followingSort,
        getBoost,
        seenForParatiOrder,
      ),
    // Only `seenForParatiOrder` for seen-state — do not also depend on `paratiSeenIds` while
    // frozen: that Set changes every mark and would thrash this memo + FlatList (initialScrollIndex bugs).
    [
      allPosts,
      followingSet,
      viewerClanId,
      mockCurrentUser.id,
      followingSort,
      getBoost,
      tasteRevision,
      seenForParatiOrder,
    ],
  );

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

  const openDetailFeed = useCallback(
    (mode: FeedMode, postId?: string, skipAnimation?: boolean) => {
      if (mode === 'foryou') {
        const snap = new Set(paratiSeenIds);
        setForyouSeenFrozen(snap);
        const data = getDataForMode(
          'foryou',
          allPosts,
          followingSet,
          viewerClanId,
          mockCurrentUser.id,
          followingSort,
          getBoost,
          snap,
        );
        let initialIndex = 0;
        if (postId) {
          const idx = data.findIndex((p) => p.id === postId);
          initialIndex = idx >= 0 ? idx : 0;
        }
        initialIndex = clampDetailInitialIndex(data.length, initialIndex);
        setDetailFeed({ mode, data, initialIndex });
        if (skipAnimation) {
          slideAnim.setValue(1);
          detailFeedListRef.current?.scrollToOffset({ offset: 0, animated: false });
          return;
        }
      } else {
        setForyouSeenFrozen(null);
        const data = followingFeedOrdered;
        let initialIndex = 0;
        if (postId) {
          const idx = data.findIndex((p) => p.id === postId);
          initialIndex = idx >= 0 ? idx : 0;
        }
        initialIndex = clampDetailInitialIndex(data.length, initialIndex);
        setDetailFeed({ mode, data, initialIndex });
        if (skipAnimation) {
          slideAnim.setValue(1);
          return;
        }
      }
      slideAnim.stopAnimation();
      slideAnim.setValue(0);
      requestAnimationFrame(() => {
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    },
    [
      slideAnim,
      followingFeedOrdered,
      allPosts,
      followingSet,
      followingSort,
      getBoost,
      paratiSeenIds,
    ],
  );

  // No sincronizar `detailFeed.data` con el ranking en vivo mientras el visor está abierto:
  // votos, taste y “vistos” reordenan `foryouFeedOrdered` y sustituir `data` hace que FlatList
  // salte o parezca que la publicación “desaparece”. La lista es snapshot al abrir; al cerrar,
  // la próxima apertura trae el orden actual.

  /**
   * useLayoutEffect fires synchronously after React commits but BEFORE the
   * native thread paints the frame. This means state changes made here are
   * included in the very first native frame — so Para Ti is already open by
   * the time the navigation animation reveals CommunityScreen, eliminating
   * the card-list flash entirely.
   */
  useLayoutEffect(() => {
    if (!tabParam) return;
    const normalized =
      tabParam === 'mas-votadas' ? 'para-ti' : (tabParam as TabId);
    if (!VALID_TAB_IDS.includes(normalized)) return;
    if (consumedTabParamRef.current === tabParam) return;
    consumedTabParamRef.current = tabParam;

    const tab = normalized;
    if (tab === 'para-ti') {
      const pid = typeof postIdParam === 'string' ? postIdParam : undefined;
      // skipAnimation=true: sets slideAnim=1 immediately so the detail panel
      // is fully visible in the same native frame — no slide-in required.
      openDetailFeed('foryou', pid, true);
    } else {
      setActiveTab(tab);
    }
  }, [tabParam, postIdParam, openDetailFeed]);

  useEffect(() => {
    if (!detailFeed || detailFeed.mode !== 'foryou') {
      paratiRefreshShiftAnim.setValue(0);
    }
  }, [detailFeed, paratiRefreshShiftAnim]);

  const closeDetailFeed = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: ANIM_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setForyouSeenFrozen(null);
        setDetailFeed(null);
        // Reset so that navigating back to Para Ti from another screen correctly
        // re-opens the detail feed (consumedTabParamRef would otherwise block it).
        consumedTabParamRef.current = undefined;
      }
    });
  }, [slideAnim]);

  const listTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -screenW],
  });
  const detailTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenW, 0],
  });

  const dir = slideDirectionRef.current;
  const incomingTabTranslateX = tabSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [dir * screenW, 0],
  });
  const outgoingTabTranslateX = tabSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -dir * screenW],
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
        pushUnlessCurrent(pathname, '/my-profile');
      } else {
        router.push({
          pathname: '/profile/[id]',
          params: { id: userId, ...(username ? { username } : {}) },
        });
      }
    },
    [router, pathname],
  );
  const handleClanPress = useCallback(
    (clanId: string) => {
      const href = `/clan/${String(clanId).trim().toLowerCase()}`;
      pushUnlessCurrent(pathname, href);
    },
    [pathname],
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      const tabId = tab as TabId;

      if (tabId === 'para-ti') {
        const alreadyOpen = detailFeed?.mode === 'foryou';
        if (alreadyOpen) {
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
              const freshAll = simPosts.map(simPostToCommunityPost);
              const emptySeen = new Set<string>();
              setForyouSeenFrozen(emptySeen);
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
              setParatiDetailFeedKey((k) => k + 1);
              setDetailFeed({
                mode: 'foryou',
                data,
                initialIndex: clampDetailInitialIndex(data.length, 0),
              });
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
        openDetailFeed('foryou', undefined, false);
        return;
      }

      if (detailFeed) {
        setActiveTab(tabId);
        closeDetailFeed();
        return;
      }

      if (activeTab === tabId) return;

      if (transitionTab !== null) {
        tabSlideAnim.stopAnimation();
      }

      const fromIdx = TAB_INDEX[activeTab] ?? 0;
      const toIdx = TAB_INDEX[tabId] ?? 0;
      slideDirectionRef.current = toIdx > fromIdx ? 1 : -1;

      const oldTab = activeTab;
      setActiveTab(tabId);
      setTransitionTab(oldTab);
    },
    [
      activeTab,
      detailFeed,
      transitionTab,
      openDetailFeed,
      closeDetailFeed,
      tabSlideAnim,
      refreshSocialFromSupabase,
      followingSet,
      followingSort,
      getBoost,
    ],
  );

  useLayoutEffect(() => {
    if (transitionTab === null) return;

    tabSlideAnim.setValue(0);
    Animated.timing(tabSlideAnim, {
      toValue: 1,
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setTransitionTab(null);
      }
    });

    return () => {
      tabSlideAnim.stopAnimation();
    };
  }, [transitionTab, tabSlideAnim]);

  const topBarHeight = getAppTopBarLayoutHeight(insets.top);
  const feedItemHeight = getMainColumnHeightForFloatingBottomBar(
    screenH,
    insets.top,
    insets.bottom,
    safeFrame.height,
  );

  const listData = useMemo(() => {
    switch (activeTab) {
      case 'siguiendo':
        return followingFeedOrdered;
      case 'para-ti':
        return foryouFeedOrdered;
      default:
        return [];
    }
  }, [activeTab, followingFeedOrdered, foryouFeedOrdered]);

  const transitionData = useMemo(
    () =>
      transitionTab && transitionTab !== 'search' && transitionTab !== 'para-ti'
        ? followingFeedOrdered
        : [],
    [transitionTab, followingFeedOrdered],
  );

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
    ({ item }: { item: CommunityPost }): React.ReactElement => (
      <CommunityPostCard
        post={item}
        showPhraseAuthor={activeTab === 'para-ti'}
        slotOuterHeight={feedCardSlotOuterHeight}
        followingFeedStyle={activeTab === 'siguiendo'}
        onPress={() => handlePostPress(item)}
        onAuthorPress={() => handleAuthorPress(item.author.id)}
        onClanPress={() => {
          const cid = item.author.clanId;
          if (cid) handleClanPress(cid);
        }}
      />
    ),
    [activeTab, feedCardSlotOuterHeight, handlePostPress, handleAuthorPress, handleClanPress],
  );

  const renderTransitionListItem = useCallback(
    ({ item }: { item: CommunityPost }): React.ReactElement => (
      <CommunityPostCard
        post={item}
        showPhraseAuthor={false}
        slotOuterHeight={feedCardSlotOuterHeight}
        followingFeedStyle
        onPress={() => handlePostPress(item)}
        onAuthorPress={() => handleAuthorPress(item.author.id)}
        onClanPress={() => {
          const cid = item.author.clanId;
          if (cid) handleClanPress(cid);
        }}
      />
    ),
    [feedCardSlotOuterHeight, handlePostPress, handleAuthorPress, handleClanPress],
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
        reflectionStarSurfaceColor={
          detailFeed?.mode === 'foryou' ? evoconnColors.background : PANEL_STAR_SURFACE_DEFAULT
        }
      />
    ),
    [
      feedItemHeight,
      handleAuthorPress,
      handleClanPress,
      handleReadingModeChange,
      detailFeed?.mode,
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

  const displayTab = detailFeed
    ? ((detailFeed.mode === 'foryou' ? 'para-ti' : 'siguiendo') as TabId)
    : activeTab;

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
    } else {
      visibleAuthorIdRef.current = null;
      setVisibleAuthorId(null);
    }
  }, [detailFeed]);

  /** Marcar vistos en "Para ti" al abrir el visor vertical (prioridad: no vistos arriba). */
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
    if (!detailFeed) return;
    const len = detailFeed.data.length;
    const idx = clampDetailInitialIndex(len, detailFeed.initialIndex);
    const startId = len > 0 ? detailFeed.data[idx]?.id ?? null : null;
    dwellRef.current = { postId: startId, since: Date.now() };
    return () => {
      const { postId, since } = dwellRef.current;
      if (!postId) return;
      const ms = Date.now() - since;
      const p = tasteDwellRefs.current.getPostById(postId);
      if (p && ms >= 450) tasteDwellRefs.current.recordDwell(p, ms);
    };
  }, [detailFeed]);

  const detailViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onDetailViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: CommunityPost }> }) => {
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

        if (detailFeedModeRef.current === 'foryou') {
          markParatiSeenRef.current(post.id);
        }

        const id = post.author.id;
        visibleAuthorIdRef.current = id;
        setVisibleAuthorId(id);
      }
    },
  ).current;

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

  const profileRevealGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(detailMounted && !sidebarOpen && !profileOverlayActive)
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
    [detailMounted, sidebarOpen, profileOverlayActive, setProfileProgressJS, commitProfileRevealJS, cancelProfileRevealJS],
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
        {transitionTab !== null ? (
          <Animated.View
            style={[
              styles.panel,
              styles.panelOverlay,
              { transform: [{ translateX: outgoingTabTranslateX }] },
            ]}
          >
            {transitionTab === 'search' ? (
              <SearchScreen onUserPress={handleAuthorPress} />
            ) : (
              <FlatList
                data={transitionData}
                renderItem={renderTransitionListItem}
                keyExtractor={(item) => item.id}
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
        ) : null}

        <Animated.View
          style={[
            styles.panel,
            styles.panelOverlay,
            {
              transform: [
                { translateX: listTranslateX },
                { translateX: incomingTabTranslateX },
              ],
            },
          ]}
        >
          {activeTab === 'search' ? (
            <SearchScreen onUserPress={handleAuthorPress} />
          ) : (
            <FlatList
              data={listData}
              renderItem={renderMainListItem}
              keyExtractor={(item) => item.id}
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

        {/* Dim overlay between detail feed and profile panel */}
        {detailMounted ? (
          <Animated.View
            pointerEvents={profileOverlayActive ? 'auto' : 'none'}
            style={[
              styles.panel,
              { backgroundColor: '#000', opacity: profileRevealDimOpacity },
            ]}
          />
        ) : null}

        {/* Profile overlay panel (slides in from right) */}
        {detailMounted && visibleAuthorId ? (
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

      {/* Right-edge: profile OPEN gesture — only when detail feed visible and profile NOT active */}
      {detailMounted && !sidebarOpen && !profileOverlayActive ? (
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
  list: { paddingTop: 8 },
});
