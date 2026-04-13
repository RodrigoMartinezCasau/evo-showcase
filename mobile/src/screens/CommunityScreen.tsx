import React, { useState, useCallback, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppTopBar,
  CommunityPostCard,
  BottomCommunityTabs,
  SidebarDrawer,
} from '@evoconn/components';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import type { CommunityPost } from '@evoconn/types';
import { evoconnColors } from '@evoconn/theme/colors';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import {
  COMMUNITY_DRAWER_EDGE_ZONE_WIDTH,
  COMMUNITY_DRAWER_GESTURE_RANGE_X,
} from '@evoconn/constants/communityDrawerGesture';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import { SearchScreen } from '@evoconn/components/SearchScreen';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { useFollowState } from '@evoconn/hooks/useFollowState';
import { ProfileRevealPanel } from '@evoconn/components/otherProfile';

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

function getDataForMode(mode: FeedMode, allPosts: CommunityPost[], followingSet?: Set<string>): CommunityPost[] {
  switch (mode) {
    case 'following':
      if (followingSet && followingSet.size > 0) {
        return allPosts.filter((p) => followingSet.has(p.author.id));
      }
      return allPosts;
    case 'top':
      return [...allPosts].sort((a, b) => b.voteStats.up - a.voteStats.up);
    case 'foryou':
      return shuffled(allPosts);
  }
}

const ANIM_DURATION = 200;
const RIGHT_EDGE_ZONE_WIDTH = 28;

const TAB_INDEX: Record<TabId, number> = {
  'siguiendo': 0,
  'mas-votadas': 1,
  'para-ti': 2,
  'search': 3,
};

const VALID_TAB_IDS: TabId[] = ['siguiendo', 'mas-votadas', 'para-ti', 'search'];

export default function CommunityScreen() {
  const router = useRouter();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { followingSet } = useFollowState();
  const { thoughts } = useThoughts();
  const { posts: allPosts } = useFeedStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const drawerOpenProgress = useRef(new Animated.Value(0)).current;
  const gestureCommittingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<TabId>('siguiendo');

  useEffect(() => {
    if (tabParam && VALID_TAB_IDS.includes(tabParam as TabId)) {
      setActiveTab(tabParam as TabId);
    }
  }, [tabParam]);
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

  const openDetailFeed = useCallback(
    (mode: FeedMode, postId?: string) => {
      const data = getDataForMode(mode, allPosts, followingSet);
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
    [slideAnim, allPosts, followingSet],
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

  const topBarHeight = 60 + insets.top;
  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;
  const feedItemHeight = screenH - topBarHeight - bottomBarHeight;

  const listData = useMemo(
    () => getDataForMode(tabToFeedMode(activeTab), allPosts, followingSet),
    [activeTab, allPosts, followingSet],
  );

  const transitionData = useMemo(
    () =>
      transitionTab && transitionTab !== 'search' && transitionTab !== 'para-ti'
        ? getDataForMode(tabToFeedMode(transitionTab), allPosts, followingSet)
        : [],
    [transitionTab, allPosts, followingSet],
  );

  const renderMainListItem = useCallback(
    ({ item }: { item: CommunityPost }): React.ReactElement => (
      <CommunityPostCard
        post={item}
        showPhraseAuthor={activeTab === 'para-ti'}
        onPress={() => handlePostPress(item)}
        onAuthorPress={() => handleAuthorPress(item.author.id)}
        onClanPress={() => handleClanPress(item.author.clanId)}
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

  const detailViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onDetailViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: CommunityPost }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].item?.author?.id) {
        const id = viewableItems[0].item.author.id;
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
    8;

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        onClanPress={() => router.push('/my-profile')}
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
              scrollEnabled={feedScrollEnabled && !profileOverlayActive}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              getItemLayout={getFeedItemLayout}
              initialScrollIndex={detailFeed?.initialIndex ?? 0}
              initialNumToRender={1}
              maxToRenderPerBatch={1}
              windowSize={3}
              removeClippedSubviews
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
