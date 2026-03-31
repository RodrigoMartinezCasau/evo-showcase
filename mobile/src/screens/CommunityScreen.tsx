import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppTopBar,
  CommunityPostCard,
  BottomCommunityTabs,
  SidebarDrawer,
} from '@evoconn/components';
import { mockFeedPosts } from '@evoconn/data/mockCommunity';
import { mockConversations } from '@evoconn/data/mockConversations';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import {
  COMMUNITY_DRAWER_EDGE_ZONE_WIDTH,
  COMMUNITY_DRAWER_GESTURE_RANGE_X,
} from '@evoconn/constants/communityDrawerGesture';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import { SearchScreen } from '@evoconn/components/SearchScreen';
import { useFollowState } from '@evoconn/hooks/useFollowState';

type TabId = 'siguiendo' | 'mas-votadas' | 'para-ti' | 'search';
type FeedMode = 'following' | 'top' | 'foryou';

function tabToFeedMode(tab: TabId): FeedMode {
  switch (tab) {
    case 'siguiendo':
      return 'following';
    case 'mas-votadas':
      return 'top';
    default:
      return 'foryou';
  }
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getDataForMode(mode: FeedMode, followingSet?: Set<string>): CommunityPost[] {
  switch (mode) {
    case 'following':
      if (followingSet && followingSet.size > 0) {
        return mockFeedPosts.filter((p) => followingSet.has(p.author.id));
      }
      return mockFeedPosts;
    case 'top':
      return [...mockFeedPosts].sort((a, b) => b.voteStats.up - a.voteStats.up);
    case 'foryou':
      return shuffled(mockFeedPosts);
  }
}

const ANIM_DURATION = 200;

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { followingSet } = useFollowState();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const drawerOpenProgress = useRef(new Animated.Value(0)).current;
  const gestureCommittingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<TabId>('siguiendo');
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

  const openDetailFeed = useCallback(
    (mode: FeedMode, postId?: string) => {
      const data = getDataForMode(mode, followingSet);
      let initialIndex = 0;
      if (postId) {
        const idx = data.findIndex((p) => p.id === postId);
        initialIndex = idx >= 0 ? idx : 0;
      }
      setDetailFeed({ mode, data, initialIndex });
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
    [slideAnim],
  );

  const closeDetailFeed = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: ANIM_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
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

  const handlePostPress = useCallback(
    (post: CommunityPost) => {
      openDetailFeed(tabToFeedMode(activeTab), post.id);
    },
    [activeTab, openDetailFeed],
  );

  const handleAuthorPress = useCallback(
    (userId: string) => router.push({ pathname: '/profile/[id]', params: { id: userId } }),
    [router],
  );
  const handleClanPress = useCallback(
    (clanId: string) => router.push({ pathname: '/clan/[id]', params: { id: clanId } }),
    [router],
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      const tabId = tab as TabId;

      if (tabId === 'search') {
        if (detailFeed) {
          closeDetailFeed();
        }
        setActiveTab('search');
        return;
      }

      if (tabId === 'para-ti') {
        openDetailFeed('foryou');
        return;
      }

      if (detailFeed) {
        closeDetailFeed();
      }
      setActiveTab(tabId);
    },
    [detailFeed, openDetailFeed, closeDetailFeed],
  );

  const topBarHeight = 60 + insets.top;
  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;
  const feedItemHeight = screenH - topBarHeight - bottomBarHeight;

  const listData = useMemo(
    () => getDataForMode(tabToFeedMode(activeTab), followingSet),
    [activeTab, followingSet],
  );

  const renderListItem = useCallback(
    ({ item }: { item: CommunityPost }): React.ReactElement => (
      <CommunityPostCard
        post={item}
        onPress={() => handlePostPress(item)}
        onAuthorPress={() => handleAuthorPress(item.author.id)}
        onClanPress={() => handleClanPress(item.author.clanId)}
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
    ? (detailFeed.mode === 'foryou' ? 'para-ti' : detailFeed.mode === 'top' ? 'mas-votadas' : 'siguiendo') as TabId
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

  // ── Edge-swipe gesture callbacks ──────────────────────────────────
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
        onClanPress={() => router.push('/profile')}
      />

      <View style={[styles.contentArea, { height: feedItemHeight }]}>
        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateX: listTranslateX }] },
          ]}
        >
          {activeTab === 'search' ? (
            <SearchScreen onUserPress={handleAuthorPress} />
          ) : (
            <FlatList
              data={listData}
              renderItem={renderListItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.list,
                {
                  paddingBottom:
                    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
                    insets.bottom +
                    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
                    16,
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
            <FlatList
              data={detailFeed?.data ?? []}
              renderItem={renderFeedItem}
              keyExtractor={(item) => item.id}
              pagingEnabled
              scrollEnabled={feedScrollEnabled}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              getItemLayout={getFeedItemLayout}
              initialScrollIndex={detailFeed?.initialIndex ?? 0}
              initialNumToRender={1}
              maxToRenderPerBatch={1}
              windowSize={3}
              removeClippedSubviews
              style={styles.panelInner}
            />
          </Animated.View>
        ) : null}
      </View>

      <View
        style={[
          styles.bottomTabsWrap,
          {
            paddingBottom: insets.bottom + BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION,
            paddingHorizontal: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HORIZONTAL_PADDING,
            bottom: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BOTTOM_OFFSET,
            borderRadius: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BORDER_RADIUS,
          },
        ]}
      >
        <BottomCommunityTabs
          activeTab={displayTab}
          onTabChange={handleTabChange}
        />
      </View>

      {!sidebarOpen ? (
        <GestureDetector gesture={edgeOpenGesture}>
          <View
            style={[
              styles.edgeHitStrip,
              {
                top: topBarHeight,
                width: COMMUNITY_DRAWER_EDGE_ZONE_WIDTH,
                bottom:
                  BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
                  insets.bottom +
                  BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
                  8,
              },
            ]}
          />
        </GestureDetector>
      ) : null}

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={mockConversations}
        onConversationPress={() => {}}
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
  contentArea: { overflow: 'hidden' },
  panel: {
    ...StyleSheet.absoluteFillObject,
  },
  panelOverlay: {
    backgroundColor: evoconnColors.background,
  },
  panelInner: { flex: 1 },
  list: { paddingTop: 8 },
  bottomTabsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: evoconnColors.background,
    borderTopWidth: 1,
    borderTopColor: evoconnColors.background,
  },
});
