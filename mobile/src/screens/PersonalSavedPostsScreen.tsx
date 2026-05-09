/**
 * PersonalSavedPostsScreen — full 2-column grid of the user's saved posts.
 * Opens when the user taps the "Guardados" block in the personal profile.
 *
 * Structurally identical to PersonalPostsScreen:
 *   AppTopBar + clan ReflectionBackground + FlatList 2-col + BottomCommunityTabs
 *
 * Data comes from PersonalProfileContext (savedPosts / unsavePost) so removing
 * a post here is immediately reflected everywhere else.
 */
import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import { getAppShellScrollableBodyHeight } from '@evoconn/constants/appShellLayout';
import {
  PERSONAL_POSTS_CARD_SCALE,
  PERSONAL_POSTS_COLUMN_GAP,
  PERSONAL_POSTS_ROW_GAP,
  PERSONAL_POSTS_GRID_STATS_SCALE,
} from '@evoconn/constants/personalProfileLayout';
import { PersonalRecentPostCard } from '@evoconn/components/personalProfile/PersonalRecentPostCard';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import type { CommunityPost } from '@evoconn/types';

const ANIM_DURATION = 200;

export default function PersonalSavedPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const { thoughts } = useThoughts();

  const { savedPosts, unsavePost } = usePersonalProfile();

  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // ─── Detail feed overlay ──────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(0)).current;
  const contentHeightRef = useRef(0);
  const [detailFeed, setDetailFeed] = React.useState<{
    data: CommunityPost[];
    initialIndex: number;
  } | null>(null);

  const openDetailFeed = useCallback(
    (post: CommunityPost) => {
      const idx = savedPosts.findIndex(p => p.id === post.id);
      setDetailFeed({ data: savedPosts, initialIndex: idx >= 0 ? idx : 0 });
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
    [savedPosts, slideAnim],
  );

  const closeDetailFeed = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: ANIM_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDetailFeed(null);
    });
  }, [slideAnim]);

  const handleMenuAction = useCallback(
    (action: 'hide' | 'delete' | 'unsave', postId: string) => {
      if (action === 'unsave') unsavePost(postId);
    },
    [unsavePost],
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.replace({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  // ─── Layout ───────────────────────────────────────────────────────
  const contentHeight = getAppShellScrollableBodyHeight(screenH, insets.top, insets.bottom);

  // ─── Column widths ─────────────────────────────────────────────────
  const H_PADDING = 16;
  const colWidth = Math.floor(
    ((screenW - H_PADDING * 2 - PERSONAL_POSTS_COLUMN_GAP) / 2) * PERSONAL_POSTS_CARD_SCALE,
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PersonalRecentPostCard
        post={item}
        cardWidth={colWidth}
        onPress={openDetailFeed}
        onMenuAction={handleMenuAction}
        isHidden={false}
        noMarginRight
        gridStatsScale={PERSONAL_POSTS_GRID_STATS_SCALE}
        menuMode="saved"
      />
    ),
    [colWidth, openDetailFeed, handleMenuAction],
  );

  const ListEmpty = (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyText}>Aún no has guardado publicaciones</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} />

      <View
        style={[styles.contentWrap, { height: contentHeight }]}
        onLayout={e => { contentHeightRef.current = e.nativeEvent.layout.height; }}
      >
        <ReflectionBackground clan={activeClan}>
          <FlatList
            data={savedPosts}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={{ gap: PERSONAL_POSTS_COLUMN_GAP }}
            ItemSeparatorComponent={() => <View style={{ height: PERSONAL_POSTS_ROW_GAP }} />}
            ListEmptyComponent={ListEmpty}
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: H_PADDING, paddingBottom: 24 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        </ReflectionBackground>

        {detailFeed !== null && (
          <ProfileDetailPanel
            data={detailFeed.data}
            initialIndex={detailFeed.initialIndex}
            itemHeight={contentHeightRef.current}
            slideAnim={slideAnim}
            screenW={screenW}
            onClose={closeDetailFeed}
            onAuthorPress={() => closeDetailFeed()}
            onClanPress={(clanId) =>
              router.push({ pathname: '/clan/[id]', params: { id: clanId } })
            }
          />
        )}
      </View>

      <AppShellBottomTabsWrap>
        <BottomCommunityTabs activeTab={null} onTabChange={handleTabChange} />
      </AppShellBottomTabsWrap>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(id) => {
          setSidebarOpen(false);
          router.push({ pathname: '/reflection', params: { thoughtId: id } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: evoconnColors.background,
  },
  contentWrap: {
    overflow: 'hidden',
  },
  listContent: {
    paddingTop: 16,
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
  },
});
