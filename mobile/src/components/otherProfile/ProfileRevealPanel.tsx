import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PROFILE_IDENTITY_SECTION_GAP,
  PROFILE_INSIGNIA_CARD_MIN_HEIGHT,
} from '@evoconn/constants/personalProfileLayout';
import { getProfileRankFromPercentages } from '@evoconn/utils/getRankFromPct';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getOtherUserProfileOrFallback } from '@evoconn/data/mockOtherUsers';
import { isPublishedSimPostType } from '@evoconn/data/simulation/simulatedNetwork';
import { useSimulation } from '@evoconn/hooks/SimulationContext';
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { OtherProfileFollowRow } from './OtherProfileFollowRow';
import { UserIdentityHeader } from './UserIdentityHeader';
import { UserInsigniaPhrase } from './UserInsigniaPhrase';
import { PhilosophyPercentagesPanel } from './PhilosophyPercentagesPanel';
import { UserTotalsStats } from './UserTotalsStats';
import { RecentPostsSlider } from './RecentPostsSlider';
import type { CommunityPost } from '@evoconn/types';
import { navigateToCommunityPost } from '@evoconn/utils/notificationNavigation';
import { fetchProfilesBatch, isRealUserId } from '@evoconn/services/supabaseSocial';

type Props = {
  authorId: string;
  contentHeight: number;
};

export const ProfileRevealPanel = React.memo(function ProfileRevealPanel({ authorId, contentHeight }: Props) {
  const router = useRouter();
  const profile = getOtherUserProfileOrFallback(authorId);
  const { posts: allSimPosts, users: simUsers } = useSimulation();
  const [remoteAvatarUri, setRemoteAvatarUri] = useState<string | null>(null);
  const [identityCompanionBelowHeight, setIdentityCompanionBelowHeight] = useState(
    PROFILE_IDENTITY_SECTION_GAP + PROFILE_INSIGNIA_CARD_MIN_HEIGHT,
  );

  useEffect(() => {
    if (!isRealUserId(authorId)) {
      setRemoteAvatarUri(null);
      return;
    }
    let cancelled = false;
    void fetchProfilesBatch([authorId]).then((rows) => {
      if (cancelled) return;
      setRemoteAvatarUri(rows[0]?.avatarUri?.trim() || null);
    });
    return () => {
      cancelled = true;
    };
  }, [authorId]);

  const displayAvatarUri =
    profile.avatarUri?.trim() || remoteAvatarUri?.trim() || undefined;

  const displayRank = getProfileRankFromPercentages(
    profile.clanId,
    profile.philosophyPercentages,
    profile.rank,
  );

  // Build live posts for this user so the panel always reflects real published content.
  const livePosts = useMemo<CommunityPost[]>(
    () =>
      allSimPosts
        .filter((p) => p.authorId === authorId && isPublishedSimPostType(p.type))
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
      navigateToCommunityPost(router, post.id);
    },
    [router],
  );

  const handleSeeMoreRecentPosts = useCallback(() => {
    router.push({ pathname: '/latest-posts', params: { userId: authorId } });
  }, [router, authorId]);

  const handleInsigniaLayoutHeight = useCallback((height: number) => {
    setIdentityCompanionBelowHeight(PROFILE_IDENTITY_SECTION_GAP + height);
  }, []);

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
            postsCount={liveReflectionCount + liveQuoteCount}
            avatarUri={displayAvatarUri}
          />
          <View style={styles.identityBlock}>
            <UserIdentityHeader
              userId={profile.id}
              username={profile.username}
              clanId={profile.clanId}
              rank={displayRank}
              avatarUri={displayAvatarUri}
              companionBelowHeight={identityCompanionBelowHeight}
              onShieldPress={
                profile.clanId
                  ? () => router.push(`/clan/${String(profile.clanId).trim().toLowerCase()}`)
                  : undefined
              }
            />
            <UserInsigniaPhrase
              phrase={profile.insigniaPhrase}
              clanId={profile.clanId}
              onLayoutHeight={handleInsigniaLayoutHeight}
            />
          </View>
          <PhilosophyPercentagesPanel percentages={profile.philosophyPercentages} />
          <UserTotalsStats totalReflections={liveReflectionCount} totalQuotes={liveQuoteCount} />
          <RecentPostsSlider
            posts={livePosts}
            onPostPress={handlePostPress}
            onSeeMorePress={handleSeeMoreRecentPosts}
          />
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
  identityBlock: {},
  spacer: { height: 20 },
});
