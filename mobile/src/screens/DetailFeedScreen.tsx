import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  Platform,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { requestCommunityTab } from '@evoconn/utils/communityPostDeepLink';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import type { CommunityPost } from '@evoconn/types';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import { AppTopBar, AppShellBottomTabsWrap, SidebarDrawer, BottomCommunityTabs } from '@evoconn/components';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { getBottomBarEdgeGestureBottomOffset } from '@evoconn/constants/bottomBarLayout';
import { getAppShellScrollableBodyHeight } from '@evoconn/constants/appShellLayout';
import { getAppTopBarLayoutHeight } from '@evoconn/constants/topBarLayout';
import {
  COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE,
  COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE_ANDROID,
  COMMUNITY_DETAIL_MAX_TO_RENDER_PER_BATCH_ANDROID,
  COMMUNITY_DETAIL_PREFETCH_POSTS,
  COMMUNITY_DETAIL_PREFETCH_POSTS_ANDROID,
  COMMUNITY_DETAIL_UPDATE_CELLS_PERIOD_ANDROID,
} from '@evoconn/constants/communityDetailFeed';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import {
  COMMUNITY_DRAWER_EDGE_ZONE_WIDTH,
  COMMUNITY_DRAWER_GESTURE_RANGE_X,
} from '@evoconn/constants/communityDrawerGesture';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import {
  sortFollowingPosts,
  parseFollowingSortParam,
} from '@evoconn/constants/followingFeedSort';

type FeedMode = 'following' | 'foryou';

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getDataForMode(
  mode: FeedMode,
  allPosts: CommunityPost[],
  followingSet?: Set<string>,
  followingSortKey = 'recientes',
): CommunityPost[] {
  const followingSort = parseFollowingSortParam(followingSortKey);
  switch (mode) {
    case 'following': {
      const ids = followingSet ?? new Set<string>();
      const pool = allPosts.filter((p) => ids.has(p.author.id));
      return sortFollowingPosts(pool, followingSort);
    }
    case 'foryou':
      return shuffled(allPosts);
  }
}

function modeToTab(mode: FeedMode): string {
  switch (mode) {
    case 'following':
      return 'siguiendo';
    case 'foryou':
      return 'para-ti';
  }
}

function normalizeFeedMode(raw: string): FeedMode {
  if (raw === 'top' || raw === 'mas-votadas') return 'foryou';
  return raw === 'following' ? 'following' : 'foryou';
}

export default function DetailFeedScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { height: screenH } = useWindowDimensions();
  const params = useLocalSearchParams<{
    mode?: string;
    initialIndex?: string;
    postId?: string;
    followingSort?: string;
  }>();

  const mode = normalizeFeedMode(params.mode ?? 'foryou');
  const postId = typeof params.postId === 'string' ? params.postId : undefined;
  const followingSortParam = params.followingSort;

  const { followingSet } = useFollowState();
  const { thoughts } = useThoughts();
  const { posts: allPosts } = useFeedStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const drawerOpenProgress = useRef(new Animated.Value(0)).current;
  const gestureCommittingRef = useRef(false);
  const activeTab = modeToTab(mode) as 'siguiendo' | 'para-ti' | 'search';

  // When a specific postId is requested, put that post first so initialIndex=0 lands on it.
  const data = useMemo(() => {
    const base = getDataForMode(mode, allPosts, followingSet, followingSortParam);
    if (!postId) return base;
    const targetIdx = base.findIndex((p) => p.id === postId);
    if (targetIdx <= 0) return base;
    const reordered = [...base];
    const [target] = reordered.splice(targetIdx, 1);
    reordered.unshift(target);
    return reordered;
  }, [mode, allPosts, followingSet, postId, followingSortParam]);

  // If postId was passed via params, always start at index 0 (target is first).
  // Otherwise honour the explicit initialIndex param.
  const initialIndex = postId
    ? 0
    : Math.max(0, parseInt(params.initialIndex ?? '0', 10) || 0);

  const [feedScrollEnabled, setFeedScrollEnabled] = React.useState(true);
  const handleReadingModeChange = React.useCallback((active: boolean) => {
    setFeedScrollEnabled(!active);
  }, []);

  const handleAuthorPress = useCallback(
    (userId: string) => {
      if (userId === mockCurrentUser.id) {
        navigateUnlessCurrent(pathname, '/my-profile');
      } else {
        navigateUnlessCurrent(pathname, `/profile/${userId}`);
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

  const topBarHeight = getAppTopBarLayoutHeight(insets.top);
  const itemHeight = getAppShellScrollableBodyHeight(
    screenH,
    insets.top,
    insets.bottom,
    safeFrame.height,
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight],
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <ReflectionDetailItem
        post={item}
        itemHeight={itemHeight}
        onAuthorPress={handleAuthorPress}
        onClanPress={handleClanPress}
        onReadingModeChange={handleReadingModeChange}
        communityVerticalFeed
      />
    ),
    [itemHeight, handleAuthorPress, handleClanPress, handleReadingModeChange],
  );

  const detailPagerVisiblePostIdRef = useRef<string | null>(null);
  const detailPagerViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onDetailPagerViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item?: CommunityPost }> }) => {
      const id = viewableItems[0]?.item?.id;
      if (!id) return;
      const prev = detailPagerVisiblePostIdRef.current;
      detailPagerVisiblePostIdRef.current = id;
      if (prev !== null && prev !== id) {
        Keyboard.dismiss();
      }
    },
  ).current;

  const handleTabChange = useCallback(
    (tab: string) => {
      if (tab === 'search') {
        requestCommunityTab('search');
        router.navigate('/(tabs)');
        return;
      }
      const newMode: FeedMode = tab === 'siguiendo' ? 'following' : 'foryou';

      if (tab === 'siguiendo') {
        requestCommunityTab('siguiendo');
        router.navigate('/(tabs)');
        return;
      }
      if (newMode !== mode) {
        router.setParams({ mode: newMode, initialIndex: '0' });
      }
    },
    [mode, router],
  );

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

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
      />

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        nestedScrollEnabled
        scrollEnabled={feedScrollEnabled}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        snapToAlignment="start"
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex}
        initialNumToRender={Platform.OS === 'android' ? COMMUNITY_DETAIL_PREFETCH_POSTS_ANDROID : COMMUNITY_DETAIL_PREFETCH_POSTS}
        maxToRenderPerBatch={Platform.OS === 'android' ? COMMUNITY_DETAIL_MAX_TO_RENDER_PER_BATCH_ANDROID : COMMUNITY_DETAIL_PREFETCH_POSTS}
        updateCellsBatchingPeriod={Platform.OS === 'android' ? COMMUNITY_DETAIL_UPDATE_CELLS_PERIOD_ANDROID : 50}
        windowSize={Platform.OS === 'android' ? COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE_ANDROID : COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE}
        removeClippedSubviews
        style={styles.list}
        viewabilityConfig={detailPagerViewabilityConfig}
        onViewableItemsChanged={onDetailPagerViewableItemsChanged}
      />

      <AppShellBottomTabsWrap>
        <BottomCommunityTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </AppShellBottomTabsWrap>

      {!sidebarOpen ? (
        <GestureDetector gesture={edgeOpenGesture}>
          <View
            style={[
              styles.edgeHitStrip,
              {
                top: topBarHeight,
                width: COMMUNITY_DRAWER_EDGE_ZONE_WIDTH,
                bottom: getBottomBarEdgeGestureBottomOffset(insets.bottom),
              },
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
  list: { flex: 1 },
});
