import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getOtherUserProfileOrFallback } from '@evoconn/data/mockOtherUsers';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { OtherProfileFollowRow } from './OtherProfileFollowRow';
import { UserIdentityHeader } from './UserIdentityHeader';
import { UserInsigniaPhrase } from './UserInsigniaPhrase';
import { PhilosophyPercentagesPanel } from './PhilosophyPercentagesPanel';
import { UserTotalsStats } from './UserTotalsStats';
import { RecentPostsSlider } from './RecentPostsSlider';
import type { CommunityPost } from '@evoconn/types';

type Props = {
  authorId: string;
  contentHeight: number;
};

export const ProfileRevealPanel = React.memo(function ProfileRevealPanel({ authorId, contentHeight }: Props) {
  const router = useRouter();
  const profile = getOtherUserProfileOrFallback(authorId);

  const handlePostPress = useCallback(
    (post: CommunityPost) => {
      router.push({ pathname: '/post/[id]', params: { id: post.id } });
    },
    [router],
  );

  return (
    <View style={[styles.container, { height: contentHeight }]}>
      <ReflectionBackground clan={profile.clanId}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <OtherProfileFollowRow
            userId={profile.id}
            clanId={profile.clanId}
            followersCount={profile.followersCount}
            followingCount={profile.followingCount}
          />
          <UserIdentityHeader username={profile.username} clanId={profile.clanId} rank={profile.rank} />
          <UserInsigniaPhrase phrase={profile.insigniaPhrase} />
          <PhilosophyPercentagesPanel percentages={profile.philosophyPercentages} />
          <UserTotalsStats totalReflections={profile.totalReflections} totalQuotes={profile.totalQuotes} />
          <RecentPostsSlider posts={profile.recentPosts} onPostPress={handlePostPress} />
          <View style={styles.spacer} />
        </ScrollView>
      </ReflectionBackground>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  scroll: { flex: 1 },
  content: { paddingTop: 24, paddingBottom: 48, gap: 20 },
  spacer: { height: 20 },
});
