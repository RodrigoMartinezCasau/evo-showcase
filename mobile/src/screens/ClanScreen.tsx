import React, { useCallback, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTopBar, AppShellBottomTabsWrap, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import {
  getClanPhrasesScrollPaddingBottom,
  getClanPhrasesShellBodyHeight,
} from '@evoconn/constants/appShellLayout';
import { evoconnColors } from '@evoconn/theme/colors';
import { ClanDisplay } from '@evoconn/components/clan/ClanDisplay';

export default function ClanScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { thoughts } = useThoughts();

  const clanId = id ?? 'estoico';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleBottomTabChange = useCallback((tab: TabId) => {
    router.replace({ pathname: '/(tabs)', params: { tab } });
  }, [router]);

  const bodyHeight = getClanPhrasesShellBodyHeight(screenH, insets.top, insets.bottom);

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
      />

      <View style={[styles.content, { height: bodyHeight }]}>
        <ClanDisplay
          clanId={clanId}
          bottomPadding={getClanPhrasesScrollPaddingBottom(insets.bottom)}
        />
      </View>

      <AppShellBottomTabsWrap>
        <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />
      </AppShellBottomTabsWrap>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={thoughts}
        onConversationPress={(sid) => {
          setSidebarOpen(false);
          router.push({ pathname: '/reflection', params: { thoughtId: sid } });
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
  content: {
    overflow: 'hidden',
    flexGrow: 0,
  },
});
