import React, { useCallback, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evoconnColors } from '@evoconn/theme/colors';
import { mockCurrentUser, mockUserStats } from '@evoconn/data/mockUser';
import { getOtherUserProfileOrFallback } from '@evoconn/data/mockOtherUsers';
import { AppTopBar, RankBadge, ClanBanner, BottomCommunityTabs } from '@evoconn/components';
import { getClanCardColor } from '@evoconn/theme/theme';
import { useActiveClan } from '@evoconn/debug/DebugClanContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { BOTTOM_BAR_LAYOUT } from '@evoconn/constants/bottomBarLayout';
import {
  OtherProfileFollowRow,
  UserIdentityHeader,
  UserInsigniaPhrase,
  PhilosophyPercentagesPanel,
  UserTotalsStats,
  RecentPostsSlider,
} from '@evoconn/components/otherProfile';
import { ProfileDetailPanel } from '@evoconn/components/ProfileDetailPanel';
import type { CommunityPost } from '@evoconn/types';

const ANIM_DURATION = 200;

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const isOwn = !id || id === mockCurrentUser.id;

  if (isOwn) {
    return <OwnProfileView />;
  }

  return <OtherUserProfileView userId={id} router={router} />;
}

function OwnProfileView() {
  const activeClan = useActiveClan(mockCurrentUser.clanId);
  const user = { ...mockCurrentUser, clanId: activeClan };
  const stats = mockUserStats;
  const clanColor = getClanCardColor(user.clanId);

  return (
    <View style={styles.container}>
      <AppTopBar onMenuPress={() => {}} onClanPress={() => {}} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.username}>{user.username}</Text>
          <View style={styles.badges}>
            {user.clanId ? (
              <ClanBanner clanId={user.clanId} shortLabel={user.clanId.toUpperCase()} />
            ) : (
              <Text style={styles.unassigned}>??</Text>
            )}
            <RankBadge rank={user.rank} />
          </View>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.dailyUsesLeft}</Text>
            <Text style={styles.statLabel}>Usos hoy</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Racha</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.unlockedPhrases}/{stats.unlockedPhrasesTotal}</Text>
            <Text style={styles.statLabel}>Frases</Text>
          </View>
        </View>
        <View style={styles.quote}>
          <Text style={styles.quoteLabel}>Cita</Text>
          <Text style={styles.quoteText}>"La vida es lo que pasa mientras diseñas tu reflexión."</Text>
        </View>
        <View style={[styles.parchment, { borderColor: clanColor }]}>
          <Text style={styles.parchmentTitle}>
            {user.clanId ? `Clan ${user.clanId}` : 'Sin clan'}
          </Text>
          <Text style={styles.parchmentBody}>Contenido del clan y filosofía.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function OtherUserProfileView({ userId, router }: { userId: string; router: ReturnType<typeof useRouter> }) {
  const profile = getOtherUserProfileOrFallback(userId);
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [bottomTab] = useState<'siguiendo' | 'mas-votadas' | 'para-ti' | 'search'>('para-ti');

  const topBarHeight = 60 + insets.top;
  const bottomBarHeight =
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_HEIGHT +
    insets.bottom +
    BOTTOM_BAR_LAYOUT.BOTTOM_BAR_SAFE_AREA_COMPENSATION +
    20;
  const contentHeight = screenH - topBarHeight - bottomBarHeight;

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

  const handlePostPress = useCallback(
    (post: CommunityPost) => {
      openDetailFeed(profile.recentPosts, post.id);
    },
    [openDetailFeed, profile.recentPosts],
  );

  const handleDetailAuthorPress = useCallback(
    (authorId: string) => {
      if (authorId === mockCurrentUser.id) {
        router.push('/my-profile');
      } else if (authorId === profile.id) {
        // Already viewing this user's profile — close the panel
        closeDetailFeed();
      } else {
        router.push({ pathname: '/profile/[id]', params: { id: authorId } });
      }
    },
    [closeDetailFeed, profile.id, router],
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
      <AppTopBar onMenuPress={() => {}} onClanPress={() => {}} />

      <View style={[styles.otherProfileWrap, { height: contentHeight }]}>
        <ReflectionBackground clan={profile.clanId}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.otherContent}
            showsVerticalScrollIndicator={false}
          >
            <OtherProfileFollowRow
              userId={profile.id}
              username={profile.username}
              clanId={profile.clanId}
              followersCount={profile.followersCount}
              followingCount={profile.followingCount}
            />
            <UserIdentityHeader
              username={profile.username}
              clanId={profile.clanId}
              rank={profile.rank}
            />
            <UserInsigniaPhrase phrase={profile.insigniaPhrase} />
            <PhilosophyPercentagesPanel percentages={profile.philosophyPercentages} />
            <UserTotalsStats
              totalReflections={profile.totalReflections}
              totalQuotes={profile.totalQuotes}
            />
            <RecentPostsSlider posts={profile.recentPosts} onPostPress={handlePostPress} />
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </ReflectionBackground>

        {/* Expanded post viewer — slides in over profile content */}
        {detailFeed !== null && (
          <ProfileDetailPanel
            data={detailFeed.data}
            initialIndex={detailFeed.initialIndex}
            itemHeight={contentHeight}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: evoconnColors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  header: { marginBottom: 20 },
  username: { color: evoconnColors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unassigned: { color: evoconnColors.text, fontWeight: '800', fontSize: 16 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, paddingVertical: 16, backgroundColor: evoconnColors.card, borderRadius: 12 },
  stat: { alignItems: 'center' },
  statValue: { color: evoconnColors.neonGreen, fontSize: 20, fontWeight: '700' },
  statLabel: { color: evoconnColors.muted, fontSize: 12, marginTop: 4 },
  quote: { marginBottom: 24 },
  quoteLabel: { color: evoconnColors.muted, fontSize: 12, marginBottom: 4 },
  quoteText: { color: evoconnColors.text, fontStyle: 'italic', fontSize: 14 },
  parchment: { borderWidth: 2, padding: 16, borderRadius: 12 },
  parchmentTitle: { color: evoconnColors.text, fontWeight: '700', marginBottom: 8 },
  parchmentBody: { color: evoconnColors.muted, fontSize: 14 },
  otherProfileWrap: {
    overflow: 'hidden',
  },
  otherContent: {
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
