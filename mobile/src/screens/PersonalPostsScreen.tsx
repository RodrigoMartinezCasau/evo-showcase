/**
 * PersonalPostsScreen — full 2-column grid of the user's own posts.
 * Opens when the user taps the "Publicaciones" counter in the personal profile.
 *
 * Layout: AppTopBar + clan ReflectionBackground + FlatList 2-col + BottomCommunityTabs.
 * Uses PersonalProfileContext for live posts, hide, and delete.
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
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
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

export default function PersonalPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const { thoughts } = useThoughts();

  const { posts, isHidden, toggleHidePost, deletePost } = usePersonalProfile();

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabId>('feed');

  // ─── Detail feed overlay ──────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(0)).current;
  const contentHeightRef = useRef(0);
  const [detailFeed, setDetailFeed] = React.useState<{
    data: CommunityPost[];
    initialIndex: number;
  } | null>(null);

  const openDetailFeed = useCallback(
    (post: CommunityPost) => {
      const idx = posts.findIndex(p => p.id === post.id);
      setDetailFeed({ data: posts, initialIndex: idx >= 0 ? idx : 0 });
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
    [posts, slideAnim],
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
    (action: 'hide' | 'delete', postId: string) => {
      if (action === 'hide') toggleHidePost(postId);
      else deletePost(postId);
    },
    [toggleHidePost, deletePost],
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      if (tab === 'feed') router.replace('/(tabs)');
    },
    [router],
  );

  // ─── Layout ───────────────────────────────────────────────────────
  const topBarHeight   = 60 + insets.top;
  const bottomBarH     =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;
  const contentHeight  = screenH - topBarHeight - bottomBarH;

  // ─── Column widths ─────────────────────────────────────────────────
  const H_PADDING  = 16;
  const colWidth   = Math.floor(
    ((screenW - H_PADDING * 2 - PERSONAL_POSTS_COLUMN_GAP) / 2) * PERSONAL_POSTS_CARD_SCALE,
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PersonalRecentPostCard
        post={item}
        cardWidth={colWidth}
        onPress={openDetailFeed}
        onMenuAction={handleMenuAction}
        isHidden={isHidden(item.id)}
        noMarginRight
        gridStatsScale={PERSONAL_POSTS_GRID_STATS_SCALE}
      />
    ),
    [colWidth, openDetailFeed, handleMenuAction, isHidden],
  );

  const ListEmpty = (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyText}>Sin publicaciones aún</Text>
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
            data={posts}
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
        <BottomCommunityTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </View>

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
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
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
