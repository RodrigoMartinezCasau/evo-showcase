/**
 * PersonalPostsScreen — full 2-column grid of the user's own posts.
 * Opens when the user taps the "Publicaciones" counter or "ver más" in the personal profile.
 *
 * Layout: AppTopBar + clan ReflectionBackground + FlatList 2-col + BottomCommunityTabs.
 * Tap a card → visor vertical (/latest-posts), mismo formato que Para ti.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, useSafeAreaFrame } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { getAppShellScrollableBodyHeight } from '@evoconn/constants/appShellLayout';
import {
  PERSONAL_POSTS_CARD_SCALE,
  PERSONAL_POSTS_COLUMN_GAP,
  PERSONAL_POSTS_ROW_GAP,
  PERSONAL_POSTS_GRID_STATS_SCALE,
} from '@evoconn/constants/personalProfileLayout';
import { PersonalRecentPostCard } from '@evoconn/components/personalProfile/PersonalRecentPostCard';
import { PersonalPostsTotalStats } from '@evoconn/components/personalProfile/PersonalPostsTotalStats';
import { usePersonalProfile } from '@evoconn/hooks/PersonalProfileContext';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { isRealUserId } from '@evoconn/services/supabaseSocial';
import { useAuth } from '../../mobile/lib/AuthContext';
import type { CommunityPost } from '@evoconn/types';

export default function PersonalPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const safeFrame = useSafeAreaFrame();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const { thoughts } = useThoughts();
  const { session } = useAuth();
  const { recordPostView } = useSimulation();

  const { posts, isHidden, toggleHidePost, deletePost } = usePersonalProfile();

  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const profileUserId =
    (session?.user?.id && isRealUserId(session.user.id) ? session.user.id : null) ??
    mockCurrentUser.id;

  const openPostInVerticalFeed = useCallback(
    (post: CommunityPost) => {
      recordPostView(post.id);
      router.push({
        pathname: '/latest-posts',
        params: { postId: post.id, userId: profileUserId },
      });
    },
    [router, profileUserId, recordPostView],
  );

  const handleMenuAction = useCallback(
    (action: 'hide' | 'delete', postId: string) => {
      if (action === 'hide') toggleHidePost(postId);
      else deletePost(postId);
    },
    [toggleHidePost, deletePost],
  );

  const handleTabChange = useCallback(
    (tab: TabId) => {
      router.navigate({ pathname: '/(tabs)', params: { tab } });
    },
    [router],
  );

  const contentHeight = getAppShellScrollableBodyHeight(
    screenH,
    insets.top,
    insets.bottom,
    safeFrame.height,
  );

  const H_PADDING = 16;
  const colWidth = Math.floor(
    ((screenW - H_PADDING * 2 - PERSONAL_POSTS_COLUMN_GAP) / 2) * PERSONAL_POSTS_CARD_SCALE,
  );

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PersonalRecentPostCard
        post={item}
        cardWidth={colWidth}
        onPress={openPostInVerticalFeed}
        onMenuAction={handleMenuAction}
        isHidden={isHidden(item.id)}
        noMarginRight
        gridStatsScale={PERSONAL_POSTS_GRID_STATS_SCALE}
      />
    ),
    [colWidth, openPostInVerticalFeed, handleMenuAction, isHidden],
  );

  const ListHeader = <PersonalPostsTotalStats posts={posts} />;

  const ListEmpty = (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyText}>Sin publicaciones aún</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => setSidebarOpen(true)} />

      <View style={[styles.contentWrap, { height: contentHeight }]}>
        <ReflectionBackground clan={activeClan}>
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={{ gap: PERSONAL_POSTS_COLUMN_GAP }}
            ItemSeparatorComponent={() => <View style={{ height: PERSONAL_POSTS_ROW_GAP }} />}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmpty}
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: H_PADDING, paddingBottom: 24 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        </ReflectionBackground>
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
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
});
