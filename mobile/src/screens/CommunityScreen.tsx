import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
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
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';

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

function getDataForMode(mode: FeedMode): CommunityPost[] {
  switch (mode) {
    case 'following':
      return mockFeedPosts;
    case 'top':
      return [...mockFeedPosts].sort((a, b) => b.voteStats.up - a.voteStats.up);
    case 'foryou':
      return shuffled(mockFeedPosts);
  }
}

const ANIM_DURATION = 280;

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('siguiendo');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail feed state: null = showing list, object = showing detail feed.
  // `data` is frozen at open-time so the order never changes while the panel is visible.
  const [detailFeed, setDetailFeed] = useState<{
    mode: FeedMode;
    data: CommunityPost[];
    initialIndex: number;
  } | null>(null);

  // 0 = list visible, 1 = detail visible
  const slideAnim = useRef(new Animated.Value(0)).current;
  // Track whether detail panel should render (kept alive during exit animation)
  const [detailMounted, setDetailMounted] = useState(false);

  /**
   * Open the detail feed.
   * @param mode    - data source
   * @param postId  - id of the pressed post (omit for "Para ti" cold open → index 0)
   */
  const openDetailFeed = useCallback(
    (mode: FeedMode, postId?: string) => {
      const data = getDataForMode(mode);
      let initialIndex = 0;
      if (postId) {
        const idx = data.findIndex((p) => p.id === postId);
        initialIndex = idx >= 0 ? idx : 0;
        if (__DEV__ && idx < 0) {
          console.warn('[DetailFeed] postId not found in feed data, falling back to 0', { postId, mode });
        }
      }
      if (__DEV__) {
        console.log('[DetailFeed] opening', { mode, postId, initialIndex, firstItemId: data[initialIndex]?.id });
      }
      setDetailFeed({ mode, data, initialIndex });
      setDetailMounted(true);
      slideAnim.setValue(0);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: ANIM_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
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
        setDetailMounted(false);
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
      if (tab === 'search') return;
      const tabId = tab as TabId;

      if (tabId === 'para-ti') {
        openDetailFeed('foryou');
        setActiveTab(tabId);
        return;
      }

      // Switching to siguiendo / mas-votadas: close detail if open
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
    () => getDataForMode(tabToFeedMode(activeTab)),
    [activeTab],
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
      />
    ),
    [feedItemHeight, handleAuthorPress, handleClanPress],
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

  return (
    <View style={styles.container}>
      {/* TOP BAR — always static */}
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        onClanPress={() => router.push('/profile')}
      />

      {/* CONTENT AREA — exact height = one feed item, so paging snaps perfectly */}
      <View style={[styles.contentArea, { height: feedItemHeight }]}>
        {/* List panel */}
        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateX: listTranslateX }] },
          ]}
        >
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
        </Animated.View>

        {/* Detail feed panel */}
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
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              getItemLayout={getFeedItemLayout}
              initialScrollIndex={detailFeed?.initialIndex ?? 0}
              style={styles.panelInner}
            />
          </Animated.View>
        ) : null}
      </View>

      {/* BOTTOM BAR — always static */}
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

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={mockConversations}
        onConversationPress={() => {}}
        searchQuery={searchQuery}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
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
