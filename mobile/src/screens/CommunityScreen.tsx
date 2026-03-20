import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
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

type TabId = 'siguiendo' | 'mas-votadas' | 'para-ti' | 'search';

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('para-ti');
  const [searchQuery, setSearchQuery] = useState('');

  const handlePostPress = useCallback(
    (post: CommunityPost) => router.push({ pathname: '/post/[id]', params: { id: post.id } }),
    [router]
  );
  const handleAuthorPress = useCallback(
    (userId: string) => router.push({ pathname: '/profile/[id]', params: { id: userId } }),
    [router]
  );
  const handleClanPress = useCallback(
    (clanId: string) => router.push({ pathname: '/clan/[id]', params: { id: clanId } }),
    [router]
  );

  const renderItem = ({ item }: { item: CommunityPost }): React.ReactElement => (
    <CommunityPostCard
      post={item}
      onPress={() => handlePostPress(item)}
      onAuthorPress={() => handleAuthorPress(item.author.id)}
      onClanPress={() => handleClanPress(item.author.clanId)}
    />
  );

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        onClanPress={() => router.push('/profile')}
      />
      <FlatList
        data={mockFeedPosts}
        renderItem={renderItem}
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
        style={styles.listStyle}
      />
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
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabId)}
        />
      </View>
      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={mockConversations}
        onConversationPress={(id) => {}}
        searchQuery={searchQuery}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  list: { paddingTop: 8 },
  listStyle: { flex: 1 },
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
