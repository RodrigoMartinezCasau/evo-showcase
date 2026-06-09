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
import { useLocalSearchParams, useRouter, usePathname, useFocusEffect } from 'expo-router';
import { navigateUnlessCurrent } from '@evoconn/utils/navigationDuplicateGuard';
import { requestCommunityTab } from '@evoconn/utils/communityPostDeepLink';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import type { CommunityPost } from '@evoconn/types';
import { ReflectionDetailItem } from '@evoconn/components/ReflectionDetailItem';
import { AppTopBar, AppShellBottomTabsWrap, SidebarDrawer, BottomCommunityTabs } from '@evoconn/components';
import { ClanLoadingDot } from '@evoconn/components/shared/ClanLoadingDot';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useFeedStore } from '@evoconn/hooks/useFeedStore';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { useFeedAudio } from '@evoconn/hooks/useFeedAudio';
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
import { useGlobalFollowingVotedFeed } from '@evoconn/hooks/useGlobalFollowingVotedFeed';
import { useBlockedUsers } from '@evoconn/hooks/BlockedUsersContext';
import {
  sortFollowingPosts,
  parseFollowingSortParam,
} from '@evoconn/constants/followingFeedSort';
import { sanitizeRouteId } from '@evoconn/utils/sanitizeRouteId';
import { useVoiceAssistantScreenContextOwner } from '@evoconn/hooks/VoiceAssistantScreenContext';
import { syncVoiceAssistantCommunityPost } from '@evoconn/utils/voiceAssistantScreenContext';

type FeedMode = 'following' | 'foryou';

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Tope de tarjetas del feed "Para ti" (igual que en CommunityScreen): el visor
 * a pantalla completa acumula bitmaps pesados (fondo + badge SVG) al escrollar;
 * sin tope, una sesión larga provoca OOM en gama baja.
 */
const PARATI_FEED_MAX = 100;

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
      const pool =
        followingSort === 'recientes'
          ? allPosts.filter((p) => ids.has(p.author.id))
          : allPosts;
      return sortFollowingPosts(pool, followingSort);
    }
    case 'foryou': {
      const deck = shuffled(allPosts);
      return deck.length > PARATI_FEED_MAX ? deck.slice(0, PARATI_FEED_MAX) : deck;
    }
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
  const postId = sanitizeRouteId(typeof params.postId === 'string' ? params.postId : undefined);
  const followingSortParam = params.followingSort;

  const { followingSet } = useFollowState();
  const { blockedIds } = useBlockedUsers();
  const { thoughts } = useThoughts();
  const { posts: allPosts, getPostById } = useFeedStore();
  const { ingestPostsByIds } = useSimulation();
  const followingSort = parseFollowingSortParam(followingSortParam);
  const { posts: globalVotedFeedPosts } = useGlobalFollowingVotedFeed(
    followingSort,
    allPosts,
    blockedIds,
  );
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [targetPostPending, setTargetPostPending] = React.useState(false);
  const [targetPostMissing, setTargetPostMissing] = React.useState(false);
  const drawerOpenProgress = useRef(new Animated.Value(0)).current;
  const gestureCommittingRef = useRef(false);
  const activeTab = modeToTab(mode) as 'siguiendo' | 'para-ti' | 'search';

  useEffect(() => {
    if (!postId) {
      setTargetPostPending(false);
      setTargetPostMissing(false);
      return;
    }
    if (getPostById(postId)) {
      setTargetPostPending(false);
      setTargetPostMissing(false);
      return;
    }
    let cancelled = false;
    setTargetPostPending(true);
    setTargetPostMissing(false);
    void ingestPostsByIds([postId]).then((ok) => {
      if (cancelled) return;
      setTargetPostPending(false);
      if (!ok) setTargetPostMissing(true);
    });
    return () => {
      cancelled = true;
    };
  }, [postId, getPostById, ingestPostsByIds]);

  const awaitingTargetPost = Boolean(postId) && (targetPostPending || (!getPostById(postId) && !targetPostMissing));

  useEffect(() => {
    if (!targetPostMissing) return;
    const t = setTimeout(() => router.back(), 400);
    return () => clearTimeout(t);
  }, [targetPostMissing, router]);

  // Post objetivo siempre en índice 0; el resto del deck puede barajarse.
  const data = useMemo(() => {
    if (postId && !getPostById(postId)) return [] as CommunityPost[];
    let base: CommunityPost[];
    if (mode === 'following' && followingSort !== 'recientes') {
      base = globalVotedFeedPosts;
    } else {
      base = getDataForMode(mode, allPosts, followingSet, followingSortParam);
    }
    if (!postId) return base;

    const target = getPostById(postId) ?? base.find((p) => p.id === postId);
    if (!target) return [] as CommunityPost[];

    const rest = base.filter((p) => p.id !== postId);
    return [target, ...rest];
  }, [
    mode,
    allPosts,
    followingSet,
    postId,
    followingSortParam,
    followingSort,
    globalVotedFeedPosts,
    getPostById,
  ]);

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

  const feedAudio = useFeedAudio();
  const feedAudioRef = useRef(feedAudio);
  feedAudioRef.current = feedAudio;
  const screenFocusedRef = useRef(false);
  const vaScreen = useVoiceAssistantScreenContextOwner();
  const vaScreenRef = useRef(vaScreen);
  vaScreenRef.current = vaScreen;

  useFocusEffect(
    useCallback(() => {
      screenFocusedRef.current = true;
      return () => {
        screenFocusedRef.current = false;
        feedAudioRef.current.stop();
        vaScreenRef.current.clearScreenContext(vaScreenRef.current.ownerId);
      };
    }, []),
  );

  const playAudioForPost = useCallback((post: CommunityPost | undefined) => {
    if (!screenFocusedRef.current || !post?.id) return;
    feedAudioRef.current.playForPost(post);
  }, []);

  const syncVisiblePostContext = useCallback((post: CommunityPost | undefined) => {
    syncVoiceAssistantCommunityPost(vaScreenRef.current, post, 'visor de publicaciones');
  }, []);

  const detailPagerVisiblePostIdRef = useRef<string | null>(null);
  const detailPagerViewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const playAudioForPostRef = useRef(playAudioForPost);
  playAudioForPostRef.current = playAudioForPost;
  const syncVisiblePostContextRef = useRef(syncVisiblePostContext);
  syncVisiblePostContextRef.current = syncVisiblePostContext;
  const onDetailPagerViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item?: CommunityPost }> }) => {
      const post = viewableItems[0]?.item;
      if (!post?.id) return;
      const prev = detailPagerVisiblePostIdRef.current;
      detailPagerVisiblePostIdRef.current = post.id;
      if (prev !== null && prev !== post.id) {
        Keyboard.dismiss();
      }
      syncVisiblePostContextRef.current(post);
      // Audio adjunto del post visible (volumen elegido al publicar).
      playAudioForPostRef.current(post);
    },
  ).current;

  // Arrancar el audio del post inicial (onViewableItemsChanged no siempre
  // dispara para el primer item ya visible en el montaje).
  const initialAudioPlayedRef = useRef(false);
  useEffect(() => {
    if (initialAudioPlayedRef.current) return;
    if (data.length === 0) return;
    const post = data[Math.min(initialIndex, data.length - 1)];
    if (post) {
      initialAudioPlayedRef.current = true;
      syncVisiblePostContext(post);
      playAudioForPost(post);
    }
  }, [data, initialIndex, playAudioForPost, syncVisiblePostContext]);

  // Respaldo por desmontaje (p. ej. pop del stack); el foco ya para el audio al salir.
  useEffect(() => () => feedAudioRef.current.stop(), []);

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

      {awaitingTargetPost || targetPostMissing ? (
        <View style={styles.loadingWrap}>
          <ClanLoadingDot />
        </View>
      ) : (
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
      )}

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
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
