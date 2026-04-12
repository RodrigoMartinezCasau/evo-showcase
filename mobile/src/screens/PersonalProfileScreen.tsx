import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { getPersonalProfile } from '@evoconn/data/mockPersonalProfile';
import { AppTopBar, BottomCommunityTabs } from '@evoconn/components';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import {
  PersonalFollowRow,
  PersonalIdentityHeader,
  PersonalInsigniaPhrase,
  PersonalRankProgression,
  PersonalPhilosophyPanel,
  PersonalRecentPostsSlider,
} from '@evoconn/components/personalProfile';
import type { CommunityPost } from '@evoconn/types';

export default function PersonalProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const [bottomTab] = useState<'siguiendo' | 'mas-votadas' | 'para-ti' | 'search'>('para-ti');

  const profile = getPersonalProfile();
  const profileWithClan = { ...profile, clanId: activeClan };

  const topBarHeight = 60 + insets.top;
  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;
  const contentHeight = screenH - topBarHeight - bottomBarHeight;

  const handlePostPress = useCallback(
    (post: CommunityPost) => {
      router.push({ pathname: '/post/[id]', params: { id: post.id } });
    },
    [router],
  );

  const handleBottomTabChange = useCallback(
    () => { router.replace('/(tabs)'); },
    [router],
  );

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => {}} onClanPress={() => {}} />

      <View style={[styles.profileWrap, { height: contentHeight }]}>
        <ReflectionBackground clan={profileWithClan.clanId}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <PersonalFollowRow
              userId={profileWithClan.id}
              username={profileWithClan.username}
              clanId={profileWithClan.clanId}
              followersCount={profileWithClan.followersCount}
              followingCount={profileWithClan.followingCount}
              totalReflections={profileWithClan.totalReflections}
              totalQuotes={profileWithClan.totalQuotes}
            />
            <PersonalIdentityHeader
              username={profileWithClan.username}
              clanId={profileWithClan.clanId}
              rank={profileWithClan.rank}
            />
            <PersonalInsigniaPhrase phrase={profileWithClan.insigniaPhrase} />
            <PersonalRankProgression rank={profileWithClan.rank} />
            <PersonalPhilosophyPanel percentages={profileWithClan.philosophyPercentages} />
            <PersonalRecentPostsSlider posts={profileWithClan.recentPosts} onPostPress={handlePostPress} />
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </ReflectionBackground>
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
        <BottomCommunityTabs activeTab={bottomTab} onTabChange={handleBottomTabChange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  scroll: { flex: 1 },
  profileWrap: {
    overflow: 'hidden',
  },
  content: {
    paddingTop: 24,
    paddingBottom: 48,
    gap: 20,
  },
  bottomSpacer: {
    height: 20,
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
