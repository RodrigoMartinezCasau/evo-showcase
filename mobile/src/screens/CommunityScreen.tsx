import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
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

type TabId = 'siguiendo' | 'mas-votadas' | 'para-ti' | 'search';

export default function CommunityScreen() {
  const router = useRouter();
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
      <BottomCommunityTabs
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabId)}
      />
      <FlatList
        data={mockFeedPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        style={styles.listStyle}
      />
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
  list: { paddingBottom: 24 },
  listStyle: { flex: 1 },
});
