/**
 * Tras publicar frase/reflexión: feed vertical propio (mismo formato que Para ti),
 * con shell idéntico a Notificaciones (top bar, subcabecera atrás + título, barra inferior).
 * Desde perfil ("ver más"): mismo layout filtrado por `userId` (sim vía feed; usuarios reales vía API).
 */
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Platform,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
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
  COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE_ANDROID,
  COMMUNITY_DETAIL_MAX_TO_RENDER_PER_BATCH_ANDROID,
  COMMUNITY_DETAIL_PREFETCH_POSTS,
  COMMUNITY_DETAIL_PREFETCH_POSTS_ANDROID,
  COMMUNITY_DETAIL_UPDATE_CELLS_PERIOD_ANDROID,
} from '@evoconn/constants/communityDetailFeed';
import { fetchPostsByUser, isRealUserId } from '@evoconn/services/supabaseSocial';
import { supabase } from '../../mobile/lib/supabase';

const BG = '#0b0b0f';

function sortMyPostsNewestFirst(posts: CommunityPost[]): CommunityPost[] {
  return [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function pinPostFirst(posts: CommunityPost[], postId: string | undefined): CommunityPost[] {
  if (!postId) return posts;
  const idx = posts.findIndex((p) => p.id === postId);
  if (idx <= 0) return posts;
  const copy = [...posts];
  const [target] = copy.splice(idx, 1);
  copy.unshift(target);
  return copy;
}

export default function LatestPostsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ postId?: string; userId?: string }>();
  const postId = typeof params.postId === 'string' ? params.postId : undefined;
  const paramUserId = typeof params.userId === 'string' ? params.userId : undefined;
  const targetUserId = paramUserId ?? mockCurrentUser.id;
  const viewingOtherUser = targetUserId !== mockCurrentUser.id;
  const needsRemoteFetch = isRealUserId(targetUserId) && viewingOtherUser;

  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { height: screenH } = useWindowDimensions();
  const { posts: allPosts } = useFeedStore();
  const { thoughts } = useThoughts();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);
  const [remotePosts, setRemotePosts] = useState<CommunityPost[] | null>(null);

  const handleReadingModeChange = useCallback((active: boolean) => {
    setFeedScrollEnabled(!active);
  }, []);

  useEffect(() => {
    if (!needsRemoteFetch) {
      setRemotePosts(null);
      return;
    }
    let cancelled = false;
    setRemotePosts(null);
    Promise.all([
      supabase.from('profiles').select('username').eq('id', targetUserId).maybeSingle(),
      fetchPostsByUser(targetUserId),
    ])
      .then(([{ data }, simPosts]) => {
        if (cancelled) return;
        const resolvedUsername = data?.username ? '@' + data.username.toUpperCase() : null;
        const mapped: CommunityPost[] = simPosts.map((p) => ({
          id: p.id,
          type: p.type,
          author: {
            id: p.authorId,
            username:
              resolvedUsername ??
              (p.authorUsername && p.authorUsername.length < 36 ? p.authorUsername : '?'),
            clanId: p.authorClanId ?? null,
            rank: p.authorRank ?? 'aprendiz',
          },
          title: p.title,
          body: p.body,
          quoteAuthor: p.quoteAuthor,
          voteStats: {
            up: p.upvoterIds.length,
            down: p.downvoterIds.length,
            save: p.saverIds.length,
          },
          createdAt: p.createdAt,
        }));
        setRemotePosts(mapped);
      })
      .catch(() => {
        if (!cancelled) setRemotePosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [needsRemoteFetch, targetUserId]);

  const data = useMemo(() => {
    if (needsRemoteFetch) {
      if (remotePosts === null) return null;
      return pinPostFirst(sortMyPostsNewestFirst(remotePosts), postId);
    }
    const fromFeed = sortMyPostsNewestFirst(
      allPosts.filter((p) => p.author.id === targetUserId),
    );
    return pinPostFirst(fromFeed, postId);
  }, [allPosts, postId, targetUserId, needsRemoteFetch, remotePosts]);

  const initialIndex = 0;

  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.navigate({ pathname: '/(tabs)', params: { tab } });
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
    getMainColumnHeightForFloatingBottomBar(
      screenH,
      insets.top,
      insets.bottom,
      safeFrame.height,
    ) - BOTTOM_BAR_LAYOUT.FLOATING_BAR_STACK_SUBHEADER_HEIGHT;

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

  const verticalFeedVisiblePostIdRef = useRef<string | null>(null);
  const verticalFeedViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onVerticalFeedViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item?: CommunityPost }> }) => {
      const id = viewableItems[0]?.item?.id;
      if (!id) return;
      const prev = verticalFeedVisiblePostIdRef.current;
      verticalFeedVisiblePostIdRef.current = id;
      if (prev !== null && prev !== id) {
        Keyboard.dismiss();
      }
    },
  ).current;

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
        {data === null ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="rgba(255,255,255,0.35)" />
          </View>
        ) : data.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={44} color="rgba(255,255,255,0.18)" />
            <Text style={styles.emptyText}>
              {viewingOtherUser ? 'Este usuario no tiene publicaciones' : 'Aún no tienes publicaciones'}
            </Text>
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
            initialNumToRender={Platform.OS === 'android' ? COMMUNITY_DETAIL_PREFETCH_POSTS_ANDROID : COMMUNITY_DETAIL_PREFETCH_POSTS}
            maxToRenderPerBatch={Platform.OS === 'android' ? COMMUNITY_DETAIL_MAX_TO_RENDER_PER_BATCH_ANDROID : COMMUNITY_DETAIL_PREFETCH_POSTS}
            updateCellsBatchingPeriod={Platform.OS === 'android' ? COMMUNITY_DETAIL_UPDATE_CELLS_PERIOD_ANDROID : 50}
            windowSize={Platform.OS === 'android' ? COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE_ANDROID : COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE}
            removeClippedSubviews
            viewabilityConfig={verticalFeedViewabilityConfig}
            onViewableItemsChanged={onVerticalFeedViewableItemsChanged}
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
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
