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
import { useDeferredRender } from '@evoconn/hooks/useDeferredRender';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import { getMainColumnHeightForFloatingBottomBar } from '@evoconn/constants/appShellLayout';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { useFeedAudio } from '@evoconn/hooks/useFeedAudio';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import type { CommunityPost } from '@evoconn/types';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import { evoconnColors } from '@evoconn/theme/colors';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import {
  COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE,
  COMMUNITY_DETAIL_FLATLIST_WINDOW_SIZE_ANDROID,
  COMMUNITY_DETAIL_MAX_TO_RENDER_PER_BATCH_ANDROID,
  COMMUNITY_DETAIL_PREFETCH_POSTS,
  COMMUNITY_DETAIL_PREFETCH_POSTS_ANDROID,
  COMMUNITY_DETAIL_UPDATE_CELLS_PERIOD_ANDROID,
} from '@evoconn/constants/communityDetailFeed';
import { fetchPostsByUser, isRealUserId } from '@evoconn/services/supabaseSocial';
import { enrichPostsAuthorAvatar } from '@evoconn/utils/enrichPostsAuthorAvatar';
import { otherProfileCache, formatProfileUsername } from '@evoconn/state/otherProfileCache';
import { supabase } from '../../mobile/lib/supabase';
import { useAuth } from '../../mobile/lib/AuthContext';

function applyProfileUsernameToPosts(
  posts: CommunityPost[],
  username: string | null | undefined,
): CommunityPost[] {
  if (!username || username === '?') return posts;
  return posts.map((p) => ({
    ...p,
    author: { ...p.author, username },
  }));
}

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
  const params = useLocalSearchParams<{ postId?: string; userId?: string; username?: string }>();
  const postId = typeof params.postId === 'string' ? params.postId : undefined;
  const paramUserId = typeof params.userId === 'string' ? params.userId : undefined;
  const paramUsername = typeof params.username === 'string' ? params.username : undefined;
  const { activeUserId, ensurePostViewCounts, recordPostView } = useSimulation();
  const { posts: myProfilePosts } = usePersonalProfile();
  const { session, profile: authProfile } = useAuth();

  /** Mismo id que el perfil personal (SimulationContext), no mockCurrentUser.id vacío en cuentas reales. */
  const selfUserId =
    (session?.user?.id && isRealUserId(session.user.id) ? session.user.id : null) ??
    (activeUserId || mockCurrentUser.id);
  const targetUserId = paramUserId ?? selfUserId;
  const viewingOtherUser = targetUserId !== selfUserId;
  const needsRemoteFetch = isRealUserId(targetUserId) && viewingOtherUser;

  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { height: screenH } = useWindowDimensions();
  const { posts: allPosts } = useFeedStore();
  const { thoughts } = useThoughts();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const ready = useDeferredRender();
  const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);
  const [remotePosts, setRemotePosts] = useState<CommunityPost[] | null>(null);
  const [remoteAuthorAvatar, setRemoteAuthorAvatar] = useState<string | undefined>();
  const [remoteAuthorUsername, setRemoteAuthorUsername] = useState<string | null>(null);

  const authorUsernameFallback = useMemo(() => {
    if (remoteAuthorUsername) return remoteAuthorUsername;
    if (paramUsername?.trim()) return formatProfileUsername(paramUsername);
    const cached = otherProfileCache.get(targetUserId)?.profile?.username;
    if (cached && cached !== '?') return cached;
    return null;
  }, [remoteAuthorUsername, paramUsername, targetUserId]);

  const handleReadingModeChange = useCallback((active: boolean) => {
    setFeedScrollEnabled(!active);
  }, []);

  useEffect(() => {
    if (!needsRemoteFetch) {
      setRemotePosts(null);
      setRemoteAuthorAvatar(undefined);
      setRemoteAuthorUsername(null);
      return;
    }
    let cancelled = false;
    setRemotePosts(null);
    setRemoteAuthorUsername(null);
    const seedUsername = paramUsername?.trim()
      ? formatProfileUsername(paramUsername)
      : otherProfileCache.get(targetUserId)?.profile?.username ?? null;
    Promise.all([
      supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', targetUserId)
        .maybeSingle(),
      fetchPostsByUser(targetUserId),
    ])
      .then(([{ data }, simPosts]) => {
        if (cancelled) return;
        const resolvedUsername = data?.username
          ? formatProfileUsername(data.username)
          : seedUsername;
        const authorAvatar =
          (data as { avatar_url?: string | null } | null)?.avatar_url?.trim() || undefined;
        setRemoteAuthorAvatar(authorAvatar);
        if (resolvedUsername) setRemoteAuthorUsername(resolvedUsername);
        const mapped: CommunityPost[] = simPosts.map((p) => ({
          id: p.id,
          type: p.type,
          author: {
            id: p.authorId,
            username:
              resolvedUsername ??
              (p.authorUsername && p.authorUsername.length < 36
                ? formatProfileUsername(p.authorUsername)
                : '?'),
            clanId: p.authorClanId ?? null,
            rank: p.authorRank ?? 'aprendiz',
            avatarUri: authorAvatar,
          },
          title: p.title,
          body: p.body,
          quoteAuthor: p.quoteAuthor,
          audioTrackId: p.audioTrackId ?? null,
          audioVolume: p.audioVolume ?? null,
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
  }, [needsRemoteFetch, targetUserId, paramUsername]);

  const data = useMemo(() => {
    const profileAvatar = needsRemoteFetch
      ? remoteAuthorAvatar
      : authProfile?.avatar_url?.trim() || mockCurrentUser.avatarUri;

    if (needsRemoteFetch) {
      if (remotePosts === null) return null;
      const sorted = sortMyPostsNewestFirst(remotePosts);
      return pinPostFirst(
        applyProfileUsernameToPosts(
          enrichPostsAuthorAvatar(sorted, targetUserId, profileAvatar),
          authorUsernameFallback,
        ),
        postId,
      );
    }
    // Misma fuente que el preview del perfil (simPosts), no solo el feed global.
    const ownPosts =
      myProfilePosts.length > 0
        ? myProfilePosts
        : sortMyPostsNewestFirst(allPosts.filter((p) => p.author.id === targetUserId));
    const sorted = sortMyPostsNewestFirst(ownPosts);
    return pinPostFirst(
      applyProfileUsernameToPosts(
        enrichPostsAuthorAvatar(sorted, targetUserId, profileAvatar),
        authProfile?.username ? formatProfileUsername(authProfile.username) : null,
      ),
      postId,
    );
  }, [
    allPosts,
    myProfilePosts,
    postId,
    targetUserId,
    needsRemoteFetch,
    remotePosts,
    remoteAuthorAvatar,
    authProfile?.username,
    authorUsernameFallback,
  ]);

  const postIdsKey = useMemo(() => (data ?? []).map((p) => p.id).join(','), [data]);
  useEffect(() => {
    if (postIdsKey) ensurePostViewCounts(postIdsKey.split(','));
  }, [postIdsKey, ensurePostViewCounts]);

  const initialIndex = 0;

  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.navigate({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  const handleAuthorPress = useCallback(
    (userId: string) => {
      if (userId === selfUserId) {
        navigateUnlessCurrent(pathname, '/my-profile');
      } else {
        navigateUnlessCurrent(pathname, `/profile/${userId}`);
      }
    },
    [pathname, selfUserId],
  );

  const handleClanPress = useCallback(
    (clanId: string) => {
      const href = `/clan/${String(clanId).trim().toLowerCase()}`;
      navigateUnlessCurrent(pathname, href);
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

  const feedAudio = useFeedAudio();
  const feedAudioRef = useRef(feedAudio);
  feedAudioRef.current = feedAudio;
  const recordPostViewRef = useRef(recordPostView);
  recordPostViewRef.current = recordPostView;

  const verticalFeedVisiblePostIdRef = useRef<string | null>(null);
  const verticalFeedViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onVerticalFeedViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item?: CommunityPost }> }) => {
      const post = viewableItems[0]?.item;
      if (!post?.id) return;
      const prev = verticalFeedVisiblePostIdRef.current;
      verticalFeedVisiblePostIdRef.current = post.id;
      if (prev !== null && prev !== post.id) {
        Keyboard.dismiss();
      }
      recordPostViewRef.current(post.id);
      // Audio adjunto del post visible (volumen elegido al publicar).
      feedAudioRef.current.playForPost(post);
    },
  ).current;

  // Arrancar el audio del post inicial (onViewableItemsChanged no siempre
  // dispara para el primer item ya visible en el montaje).
  const initialAudioPlayedRef = useRef(false);
  useEffect(() => {
    if (initialAudioPlayedRef.current) return;
    if (!data || data.length === 0) return;
    const post = data[Math.min(initialIndex, data.length - 1)];
    if (post) {
      initialAudioPlayedRef.current = true;
      recordPostViewRef.current(post.id);
      feedAudioRef.current.playForPost(post);
    }
  }, [data, initialIndex]);

  // Detener el audio al salir del visor (desmontar la pantalla).
  useEffect(() => () => feedAudioRef.current.stop(), []);

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={styles.screenTitle}>ÚLTIMAS PUBLICACIONES</Text>
          {authorUsernameFallback ? (
            <Text style={styles.screenUsername}>{authorUsernameFallback}</Text>
          ) : null}
        </View>
      </View>

      <View style={{ height: listPanelHeight, overflow: 'hidden' }}>
        {!ready ? (
          <ClanLoadingDot />
        ) : data === null ? (
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
  headerTextCol: {
    flex: 1,
    gap: 2,
  },
  screenTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  screenUsername: {
    color: evoconnColors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
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
