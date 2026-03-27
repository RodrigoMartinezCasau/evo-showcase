import React, { useRef, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockFeedPosts } from '@evoconn/data/mockCommunity';
import type { CommunityPost } from '@evoconn/types';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import { AppTopBar, SidebarDrawer, BottomCommunityTabs } from '@evoconn/components';
import { mockConversations } from '@evoconn/data/mockConversations';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';

type FeedMode = 'following' | 'top' | 'foryou';

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

function modeToTab(mode: FeedMode): string {
  switch (mode) {
    case 'following':
      return 'siguiendo';
    case 'top':
      return 'mas-votadas';
    case 'foryou':
      return 'para-ti';
  }
}

export default function DetailFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const params = useLocalSearchParams<{ mode?: string; initialIndex?: string }>();

  const mode = (params.mode ?? 'foryou') as FeedMode;
  const initialIndex = Math.max(0, parseInt(params.initialIndex ?? '0', 10) || 0);

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const activeTab = modeToTab(mode) as 'siguiendo' | 'mas-votadas' | 'para-ti' | 'search';

  const data = useMemo(() => getDataForMode(mode), [mode]);

  const topBarHeight = 60 + insets.top;
  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;
  const itemHeight = screenH - topBarHeight - bottomBarHeight;

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
        onAuthorPress={(userId) =>
          router.push({ pathname: '/profile/[id]', params: { id: userId } })
        }
        onClanPress={(clanId) =>
          router.push({ pathname: '/clan/[id]', params: { id: clanId } })
        }
      />
    ),
    [itemHeight, router],
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      if (tab === 'search') return;
      const newMode: FeedMode =
        tab === 'siguiendo' ? 'following' : tab === 'mas-votadas' ? 'top' : 'foryou';

      if (tab === 'siguiendo' || tab === 'mas-votadas') {
        router.replace('/(tabs)');
        return;
      }
      if (newMode !== mode) {
        router.setParams({ mode: newMode, initialIndex: '0' });
      }
    },
    [mode, router],
  );

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        onClanPress={() => router.push('/profile')}
      />

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={itemHeight}
        decelerationRate="fast"
        snapToAlignment="start"
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex}
        style={styles.list}
      />

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION,
            paddingHorizontal: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HORIZONTAL_PADDING,
            bottom: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BOTTOM_OFFSET,
            borderRadius: BOTTOM_BAR_LAYOUT.BOTTOM_BAR_BORDER_RADIUS,
          },
        ]}
      >
        <BottomCommunityTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </View>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={mockConversations}
        onConversationPress={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  list: { flex: 1 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: evoconnColors.background,
    borderTopWidth: 1,
    borderTopColor: evoconnColors.background,
  },
});
