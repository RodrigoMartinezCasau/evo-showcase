import React, { useCallback, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import type { TabId } from '@evoconn/components/BottomCommunityTabs';
import { useThoughts } from '@evoconn/hooks/useThoughts';
import {
  BOTTOM_BAR_LAYOUT,
  getBottomBarScrollContentPaddingBottom,
  getMainColumnHeightForFloatingBottomBar,
} from '@evoconn/constants/bottomBarLayout';
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

  const bodyHeight = getMainColumnHeightForFloatingBottomBar(screenH, insets.top, insets.bottom);

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
      />

      <View style={[styles.content, { height: bodyHeight }]}>
        <ClanDisplay
          clanId={clanId}
          bottomPadding={getBottomBarScrollContentPaddingBottom(insets.bottom)}
        />
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
        <BottomCommunityTabs activeTab={null} onTabChange={handleBottomTabChange} />
      </View>

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
    flex: 1,
    overflow: 'hidden',
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
