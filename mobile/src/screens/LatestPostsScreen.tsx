/**
 * Tras publicar frase/reflexión: feed vertical propio (mismo formato que Para ti),
 * con shell idéntico a Notificaciones (top bar, subcabecera atrás + título, barra inferior).
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import { getMainColumnHeightForFloatingBottomBar } from '@evoconn/constants/appShellLayout';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import type { CommunityPost } from '@evoconn/types';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import { evoconnColors } from '@evoconn/theme/colors';
import { pushUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import {
  COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE,
  COMMUNITY_DETAIL_PREFETCH_POSTS,
} from '@evoconn/constants/communityDetailFeed';

const BG = '#0b0b0f';

function sortMyPostsNewestFirst(posts: CommunityPost[]): CommunityPost[] {
  return [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export default function LatestPostsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ postId?: string }>();
  const postId = typeof params.postId === 'string' ? params.postId : undefined;
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { posts: allPosts } = useFeedStore();
  const { thoughts } = useThoughts();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);

  const handleReadingModeChange = useCallback((active: boolean) => {
    setFeedScrollEnabled(!active);
  }, []);

  const data = useMemo(() => {
    const mine = sortMyPostsNewestFirst(
      allPosts.filter((p) => p.author.id === mockCurrentUser.id),
    );
    if (!postId) return mine;
    const idx = mine.findIndex((p) => p.id === postId);
    if (idx <= 0) return mine;
    const copy = [...mine];
    const [target] = copy.splice(idx, 1);
    copy.unshift(target);
    return copy;
  }, [allPosts, postId]);

  const initialIndex = 0;

  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.replace({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  const handleAuthorPress = useCallback(
    (userId: string) => {
      if (userId === mockCurrentUser.id) {
        pushUnlessCurrent(pathname, '/my-profile');
      } else {
        router.push({ pathname: '/profile/[id]', params: { id: userId } });
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

  const listPanelHeight =
    getMainColumnHeightForFloatingBottomBar(screenH, insets.top, insets.bottom) -
    BOTTOM_BAR_LAYOUT.FLOATING_BAR_STACK_SUBHEADER_HEIGHT;

  const itemHeight = listPanelHeight;

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

  const keyExtractor = useCallback((item: CommunityPost) => item.id, []);

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>ÚLTIMAS PUBLICACIONES</Text>
      </View>

      <View style={{ height: listPanelHeight, overflow: 'hidden' }}>
        {data.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={44} color="rgba(255,255,255,0.18)" />
            <Text style={styles.emptyText}>Aún no tienes publicaciones</Text>
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            pagingEnabled
            nestedScrollEnabled
            scrollEnabled={feedScrollEnabled}
            snapToInterval={itemHeight}
            decelerationRate="fast"
            snapToAlignment="start"
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialIndex}
            initialNumToRender={COMMUNITY_DETAIL_PREFETCH_POSTS}
            maxToRenderPerBatch={COMMUNITY_DETAIL_PREFETCH_POSTS}
            windowSize={COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE}
            removeClippedSubviews
          />
        )}
      </View>

      <AppShellBottomTabsWrap
        backgroundColor={BG}
        borderTopWidth={StyleSheet.hairlineWidth}
        borderTopColor="rgba(255,255,255,0.08)"
      >
        <BottomCommunityTabs activeTab={null} onTabChange={handleTabChange} />
      </AppShellBottomTabsWrap>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) => {
          setSidebarOpen(false);
          const t = thoughts.find((x) => x.id === id);
          if (t?.type === 'phrase') {
            router.push({ pathname: '/phrase', params: { phraseId: id } });
          } else {
            router.push({ pathname: '/reflection', params: { thoughtId: id } });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    marginRight: 8,
  },
  screenTitle: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 12,
    color: evoconnColors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
});
