import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { CommunityPost } from '@evoconn/types';
import type { Rank } from '@evoconn/types';
type PhilosophyPctEntry = { clanId: string; label: string; pct: number };
import { ReflectionBackground } from '@evoconn/components/ReflectionBackground';
import { UserTotalsStats } from '@evoconn/components/otherProfile/UserTotalsStats';
import { PersonalFollowRow } from './PersonalFollowRow';
import { PersonalIdentityHeader } from './PersonalIdentityHeader';
import { PersonalInsigniaPhrase } from './PersonalInsigniaPhrase';
import { PersonalRankProgression } from './PersonalRankProgression';
import { PersonalPhilosophyPanel } from './PersonalPhilosophyPanel';
import { PersonalRecentPostsSlider } from './PersonalRecentPostsSlider';
import {
  PROFILE_SHARE_CAPTURE_PADDING_TOP,
  PROFILE_SHARE_CAPTURE_PADDING_BOTTOM,
  PROFILE_SHARE_CAPTURE_PADDING_HORIZONTAL,
  BOTTOM_BLOCKS_MARGIN_TOP,
  PERSONAL_BOTTOM_BLOCKS_SPACING_TOP,
} from '@evoconn/constants/personalProfileLayout';
import { REFLECTION_BACKGROUND_LAYOUT } from '@evoconn/constants/reflectionBackgroundLayout';

export type ProfileShareCaptureData = {
  width: number;
  userId: string;
  username: string;
  clanId: string | null;
  rank: Rank;
  avatarUri?: string | null;
  insigniaPhrase: string;
  followersCount: number;
  followingCount: number;
  totalPosts: number;
  totalReflections: number;
  totalQuotes: number;
  rankReflectionCount: number;
  rankPhraseCount: number;
  philosophyPercentages: PhilosophyPctEntry[];
  posts: CommunityPost[];
};

type Props = {
  data: ProfileShareCaptureData;
  onLayout?: (height: number) => void;
};

const CONTENT_GAP = 12;

/**
 * Layout del perfil personal para captura PNG: igual que en pantalla,
 * con contadores de reflexiones/frases en lugar de los 3 bloques inferiores.
 */
export const ProfileShareCaptureCard = React.memo(function ProfileShareCaptureCard({
  data,
  onLayout,
}: Props) {
  return (
    <View
      style={[styles.outer, { width: data.width, borderRadius: REFLECTION_BACKGROUND_LAYOUT.borderRadius }]}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.height)}
      collapsable={false}
    >
      <ReflectionBackground clan={data.clanId} containerStyle={styles.bgRoot}>
        <View
          style={[
            styles.inner,
            {
              paddingTop: PROFILE_SHARE_CAPTURE_PADDING_TOP,
              paddingBottom: PROFILE_SHARE_CAPTURE_PADDING_BOTTOM,
              paddingHorizontal: PROFILE_SHARE_CAPTURE_PADDING_HORIZONTAL,
            },
          ]}
        >
          <PersonalFollowRow
            userId={data.userId}
            username={data.username}
            clanId={data.clanId}
            followersCount={data.followersCount}
            followingCount={data.followingCount}
            totalPosts={data.totalPosts}
            hideMoreMenu
          />
          <View style={styles.gap} />
          <PersonalIdentityHeader
            userId={data.userId}
            username={data.username}
            clanId={data.clanId}
            rank={data.rank}
            avatarUri={data.avatarUri}
            hideShareButton
          />
          <View style={styles.gap} />
          <PersonalInsigniaPhrase phrase={data.insigniaPhrase} />
          <View style={styles.gap} />
          <PersonalRankProgression
            rank={data.rank}
            clanId={data.clanId}
            totalReflections={data.rankReflectionCount}
            totalPhrases={data.rankPhraseCount}
          />
          <View style={styles.gap} />
          <PersonalPhilosophyPanel
            percentages={data.philosophyPercentages}
            clanId={data.clanId}
            allowLockedAccess
          />
          <View style={styles.gap} />
          <PersonalRecentPostsSlider
            posts={data.posts}
            onPostPress={() => {}}
          />
          <View
            style={{
              marginTop: BOTTOM_BLOCKS_MARGIN_TOP + PERSONAL_BOTTOM_BLOCKS_SPACING_TOP,
            }}
          >
            <UserTotalsStats
              totalReflections={data.totalReflections}
              totalQuotes={data.totalQuotes}
            />
          </View>
        </View>
      </ReflectionBackground>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    backgroundColor: '#0b0b0f',
  },
  bgRoot: {
    flex: 0,
  },
  inner: {
    position: 'relative',
    zIndex: 1,
  },
  gap: {
    height: CONTENT_GAP,
  },
});
