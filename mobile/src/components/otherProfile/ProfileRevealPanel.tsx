import React, { useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getOtherUserProfileOrFallback } from '@evoconn/data/mockOtherUsers';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
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
  const { posts: allSimPosts, users: simUsers } = useSimulation();

  // Build live posts for this user so the panel always reflects real published content.
  const livePosts = useMemo<CommunityPost[]>(
    () =>
      allSimPosts
        .filter((p) => p.authorId === authorId)
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0))
        .map((p): CommunityPost => {
          const author = simUsers[p.authorId];
          return {
            id: p.id,
            type: p.type,
            author: author
              ? { id: author.id, username: author.username, clanId: author.clanId, rank: author.rank }
              : { id: p.authorId, username: '?', clanId: null, rank: 'aprendiz' },
            title: p.title,
            body: p.body,
            quoteAuthor: p.quoteAuthor,
            voteStats: {
              up: p.upvoterIds.length,
              down: p.downvoterIds.length,
              save: p.saverIds.length,
            },
            createdAt: p.createdAt,
          };
        }),
    [allSimPosts, authorId, simUsers],
  );

  const liveReflectionCount = useMemo(
    () => livePosts.filter((p) => p.type === 'reflection').length,
    [livePosts],
  );
  const liveQuoteCount = useMemo(
    () => livePosts.filter((p) => p.type === 'phrase').length,
    [livePosts],
  );

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
            username={profile.username}
            clanId={profile.clanId}
            followersCount={profile.followersCount}
            followingCount={profile.followingCount}
          />
          <UserIdentityHeader username={profile.username} clanId={profile.clanId} rank={profile.rank} />
          <UserInsigniaPhrase phrase={profile.insigniaPhrase} />
          <PhilosophyPercentagesPanel percentages={profile.philosophyPercentages} />
          <UserTotalsStats totalReflections={liveReflectionCount} totalQuotes={liveQuoteCount} />
          <RecentPostsSlider posts={livePosts} onPostPress={handlePostPress} />
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
