import React, { useState, useCallback, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppTopBar,
  AppShellBottomTabsWrap,
  CommunityPostCard,
  BottomCommunityTabs,
  SidebarDrawer,
} from '@evoconn/components';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { useRecommendationTaste } from '@evoconn/hooks/RecommendationTasteContext';
import { useParatiSeenPosts } from '@evoconn/hooks/ParatiSeenPostsContext';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { BOTTOM_BAR_LAYOUT, getBottomBarScrollContentPaddingBottom } from '@evoconn/constants/bottomBarLayout';
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
  COMMUNITY_DETAIL_PREFETCH_POSTS,
} from '@evoconn/constants/communityDetailFeed';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import { SearchScreen } from '@evoconn/components/SearchScreen';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import { ProfileRevealPanel } from '@evoconn/components/otherProfile';
import {
  sortFollowingPosts,
  type FollowingSortOption,
} from '@evoconn/constants/followingFeedSort';

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
 * Score = net_votes × recency_boost × clan_boost
 * - Net votes: upvotes × 2 - downvotes + saves (engagement signal)
 * - Recency boost: ×2 if post is < 6 h old, ×1.5 if < 24 h, ×1 otherwise
 * - Clan boost: ×1.4 if author's clan matches viewer's clan
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
  return net * recency * clanBoost * tasteBoost(post);
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

const TAB_INDEX: Record<TabId, number> = {
  'siguiendo': 0,
  'para-ti': 1,
  'search': 2,
};

const VALID_TAB_IDS: TabId[] = ['siguiendo', 'para-ti', 'search'];

export default function CommunityScreen() {
  const router = useRouter();
  const { tab: tabParam, postId: postIdParam } = useLocalSearchParams<{ tab?: string; postId?: string }>();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { followingSet } = useFollowState();
  const { thoughts } = useThoughts();
  const { posts: allPosts, getPostById } = useFeedStore();
  const { getBoost, revision: tasteRevision, recordDwell } = useRecommendationTaste();
  const { seenIds: paratiSeenIds, markParatiPostSeen } = useParatiSeenPosts();
  const { triggerHaptic } = useEvoPreferences();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const drawerOpenProgress = useRef(new Animated.Value(0)).current;
  const gestureCommittingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<TabId>('siguiendo');
  const [followingSort, setFollowingSort] = useState<FollowingSortOption>('recientes');
  /** While "Para ti" fullscreen is open, freeze seen-ids used for ordering so the list does not jump as posts are marked seen. */
  const [foryouSeenFrozen, setForyouSeenFrozen] = useState<Set<string> | null>(null);

  // Track which tabParam value we have already reacted to so we never
  // re-trigger the same navigation when openDetailFeed's reference changes
  // (it depends on allPosts / followingSet which can update after mount).
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
        mockCurrentUser.clanId,
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
      mockCurrentUser.clanId,
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
        mockCurrentUser.clanId,
        mockCurrentUser.id,
        followingSort,
      ),
    [allPosts, followingSet, mockCurrentUser.clanId, mockCurrentUser.id, followingSort],
  );

  const openDetailFeed = useCallback(
    (mode: FeedMode, postId?: string) => {
      if (mode === 'foryou') {
        const snap = new Set(paratiSeenIds);
        setForyouSeenFrozen(snap);
        const data = getDataForMode(
          'foryou',
          allPosts,
          followingSet,
          mockCurrentUser.clanId,
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

  useEffect(() => {
    if (!tabParam) return;
    const normalized =
      tabParam === 'mas-votadas' ? 'para-ti' : (tabParam as TabId);
    if (!VALID_TAB_IDS.includes(normalized)) return;
    if (consumedTabParamRef.current === tabParam) return;
    consumedTabParamRef.current = tabParam;

    const tab = normalized;
    if (tab === 'para-ti') {
      const pid = typeof postIdParam === 'string' ? postIdParam : undefined;
      openDetailFeed('foryou', pid);
    } else {
      setActiveTab(tab);
    }
  }, [tabParam, postIdParam, openDetailFeed]);

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
    (userId: string) => {
      if (userId === mockCurrentUser.id) {
        router.push('/my-profile');
      } else {
        router.push({ pathname: '/profile/[id]', params: { id: userId } });
      }
    },
    [router],
  );
  const handleClanPress = useCallback(
    (clanId: string) => router.push({ pathname: '/clan/[id]', params: { id: clanId } }),
    [router],
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      const tabId = tab as TabId;

      if (tabId === 'para-ti') {
        openDetailFeed('foryou');
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
    [activeTab, detailFeed, transitionTab, openDetailFeed, closeDetailFeed, tabSlideAnim],
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
  const feedItemHeight = getMainColumnHeightForFloatingBottomBar(screenH, insets.top, insets.bottom);

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

  const renderMainListItem = useCallback(
    ({ item }: { item: CommunityPost }): React.ReactElement => (
      <CommunityPostCard
        post={item}
        showPhraseAuthor={activeTab === 'para-ti'}
        onPress={() => handlePostPress(item)}
        onAuthorPress={() => handleAuthorPress(item.author.id)}
        onClanPress={() => {
          const cid = item.author.clanId;
          if (cid) handleClanPress(cid);
        }}
      />
    ),
    [activeTab, handlePostPress, handleAuthorPress, handleClanPress],
  );

  const renderTransitionListItem = useCallback(
    ({ item }: { item: CommunityPost }): React.ReactElement => (
      <CommunityPostCard
        post={item}
        showPhraseAuthor={false}
        onPress={() => handlePostPress(item)}
        onAuthorPress={() => handleAuthorPress(item.author.id)}
        onClanPress={() => {
          const cid = item.author.clanId;
          if (cid) handleClanPress(cid);
        }}
      />
    ),
    [handlePostPress, handleAuthorPress, handleClanPress],
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
      />
    ),
    [feedItemHeight, handleAuthorPress, handleClanPress, handleReadingModeChange],
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

  const edgeBottomOffset =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_EDGE_GESTURE_CLEARANCE_BELOW;

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
                  { paddingBottom: getBottomBarScrollContentPaddingBottom(insets.bottom) },
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
                { paddingBottom: getBottomBarScrollContentPaddingBottom(insets.bottom) },
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
            <FlatList
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
              initialNumToRender={COMMUNITY_DETAIL_PREFETCH_POSTS}
              maxToRenderPerBatch={COMMUNITY_DETAIL_PREFETCH_POSTS}
              windowSize={COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE}
              removeClippedSubviews={false}
              style={styles.panelInner}
              viewabilityConfig={detailViewabilityConfig}
              onViewableItemsChanged={onDetailViewableItemsChanged}
            />
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
  list: { paddingTop: 8 },
});
