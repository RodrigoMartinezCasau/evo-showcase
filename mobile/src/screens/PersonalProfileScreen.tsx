import React, { useCallback, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser } from '@evoconn/data/mockUser';
import { getPersonalProfile } from '@evoconn/data/mockPersonalProfile';
import { AppTopBar, BottomCommunityTabs, SidebarDrawer } from '@evoconn/components';
import { useThoughts } from '@evoconn/hooks/useThoughts';
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
  PersonalBottomBlocks,
} from '@evoconn/components/personalProfile';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import type { CommunityPost } from '@evoconn/types';

const ANIM_DURATION = 200;

export default function PersonalProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const [bottomTab] = useState<'siguiendo' | 'mas-votadas' | 'para-ti' | 'search'>('para-ti');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { thoughts } = useThoughts();

  const profile = getPersonalProfile();
  const profileWithClan = { ...profile, clanId: activeClan };

  // Bottom bar height — used for scroll padding and detail panel item height.
  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;

  // Measured height of the profile content area (set via onLayout once stable).
  // Only used by ProfileDetailPanel — the profile area itself uses flex: 1.
  const contentHeightRef = useRef(0);
  const onProfileWrapLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      contentHeightRef.current = e.nativeEvent.layout.height;
    },
    [],
  );

  // ─── Expanded post detail panel ────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [detailFeed, setDetailFeed] = useState<{
    data: CommunityPost[];
    initialIndex: number;
  } | null>(null);

  const openDetailFeed = useCallback(
    (posts: CommunityPost[], postId: string) => {
      const idx = posts.findIndex((p) => p.id === postId);
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
    [slideAnim],
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

  const handleRecentPostPress = useCallback(
    (post: CommunityPost) => {
      openDetailFeed(profile.recentPosts, post.id);
    },
    [openDetailFeed, profile.recentPosts],
  );

  const handleSavedPostPress = useCallback(
    (post: CommunityPost) => {
      openDetailFeed(profile.savedPosts, post.id);
    },
    [openDetailFeed, profile.savedPosts],
  );

  const handleDetailAuthorPress = useCallback(
    (userId: string) => {
      if (userId === mockCurrentUser.id) {
        // Already on personal profile — just close the panel
        closeDetailFeed();
      } else {
        router.push({ pathname: '/profile/[id]', params: { id: userId } });
      }
    },
    [closeDetailFeed, router],
  );

  const handleDetailClanPress = useCallback(
    (clanId: string) => {
      router.push({ pathname: '/clan/[id]', params: { id: clanId } });
    },
    [router],
  );

  const handleBottomTabChange = useCallback(() => {
    if (detailFeed) {
      closeDetailFeed();
      return;
    }
    router.replace('/(tabs)');
  }, [detailFeed, closeDetailFeed, router]);

  return (
    <View style={styles.container}>
      <AppTopBar
        onMenuPress={() => setSidebarOpen(true)}
        onClanPress={() => {/* already on personal profile */}}
      />

      <View style={styles.profileWrap} onLayout={onProfileWrapLayout}>
        <ReflectionBackground clan={profileWithClan.clanId}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, { paddingBottom: bottomBarHeight + 28 }]}
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
            <View style={styles.contentGap} />
            <PersonalIdentityHeader
              username={profileWithClan.username}
              clanId={profileWithClan.clanId}
              rank={profileWithClan.rank}
            />
            <View style={styles.contentGap} />
            <PersonalInsigniaPhrase phrase={profileWithClan.insigniaPhrase} />
            <View style={styles.contentGap} />
            <PersonalRankProgression rank={profileWithClan.rank} />
            <View style={styles.contentGap} />
            <PersonalPhilosophyPanel percentages={profileWithClan.philosophyPercentages} />
            <View style={styles.contentGap} />
            <PersonalRecentPostsSlider posts={profileWithClan.recentPosts} onPostPress={handleRecentPostPress} />
            <View style={styles.contentGap} />
            <PersonalBottomBlocks
              clanId={profileWithClan.clanId}
              friends={profileWithClan.friends}
              savedPosts={profileWithClan.savedPosts}
              onSavedPostPress={handleSavedPostPress}
            />
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </ReflectionBackground>

        {/* Expanded post viewer — slides in over profile content */}
        {detailFeed !== null && (
          <ProfileDetailPanel
            data={detailFeed.data}
            initialIndex={detailFeed.initialIndex}
            itemHeight={contentHeightRef.current}
            slideAnim={slideAnim}
            screenW={screenW}
            onClose={closeDetailFeed}
            onAuthorPress={handleDetailAuthorPress}
            onClanPress={handleDetailClanPress}
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
        <BottomCommunityTabs activeTab={bottomTab} onTabChange={handleBottomTabChange} />
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
  container: { flex: 1, backgroundColor: evoconnColors.background },
  scroll: { flex: 1 },
  profileWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    paddingTop: 24,
  },
  contentGap: {
    height: 20,
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
