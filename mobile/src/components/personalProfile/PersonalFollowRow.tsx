import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  TOP_ROW_PADDING_HORIZONTAL,
  TOP_ROW_MIN_HEIGHT,
  POSTS_COUNTER_LAYOUT_WIDTH,
  POSTS_COUNTER_LAYOUT_HEIGHT,
  POSTS_COUNTER_OFFSET_X,
  POSTS_COUNTER_OFFSET_Y,
  POSTS_COUNTER_SCALE,
  FOLLOW_STATS_LAYOUT_WIDTH,
  FOLLOW_STATS_LAYOUT_HEIGHT,
  FOLLOW_STATS_OFFSET_X,
  FOLLOW_STATS_OFFSET_Y,
  FOLLOW_STATS_SCALE,
} from '@evoconn/constants/personalProfileLayout';
import { PersonalPostsCounter } from './PersonalPostsCounter';
import { PersonalFollowStats } from './PersonalFollowStats';
import { PersonalSettingsButton } from './PersonalSettingsButton';

type Props = {
  userId: string;
  username: string;
  clanId: string | null | undefined;
  followersCount: number;
  followingCount: number;
  /** Live count derived from the user's actual published posts — must equal the posts display count. */
  totalPosts: number;
  onPostsPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
};

export const PersonalFollowRow = React.memo(function PersonalFollowRow({
  followersCount,
  followingCount,
  totalPosts,
  onPostsPress,
  onFollowersPress,
  onFollowingPress,
}: Props) {
  return (
    <View
      style={[
        styles.row,
        { paddingHorizontal: TOP_ROW_PADDING_HORIZONTAL, minHeight: TOP_ROW_MIN_HEIGHT },
      ]}
    >
      <View
        style={[
          styles.postsSlot,
          {
            width: POSTS_COUNTER_LAYOUT_WIDTH,
            height: POSTS_COUNTER_LAYOUT_HEIGHT,
            marginTop: -POSTS_COUNTER_LAYOUT_HEIGHT / 2,
            transform: [
              { translateX: POSTS_COUNTER_OFFSET_X },
              { translateY: POSTS_COUNTER_OFFSET_Y },
              { scale: POSTS_COUNTER_SCALE },
            ],
          },
        ]}
      >
        <PersonalPostsCounter
          totalPosts={totalPosts}
          onPress={onPostsPress}
        />
      </View>
      <View
        style={[
          styles.statsSlot,
          {
            width: FOLLOW_STATS_LAYOUT_WIDTH,
            height: FOLLOW_STATS_LAYOUT_HEIGHT,
            marginTop: -FOLLOW_STATS_LAYOUT_HEIGHT / 2,
            transform: [
              { translateX: FOLLOW_STATS_OFFSET_X },
              { translateY: FOLLOW_STATS_OFFSET_Y },
              { scale: FOLLOW_STATS_SCALE },
            ],
          },
        ]}
      >
        <PersonalFollowStats
          followersCount={followersCount}
          followingCount={followingCount}
          onFollowersPress={onFollowersPress}
          onFollowingPress={onFollowingPress}
        />
      </View>
      <View style={styles.settingsSlot}>
        <PersonalSettingsButton />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    position: 'relative',
    overflow: 'visible',
  },
  postsSlot: {
    position: 'absolute',
    left: 0,
    top: '50%',
    zIndex: 2,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  statsSlot: {
    position: 'absolute',
    right: 32,
    top: '50%',
    zIndex: 2,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  settingsSlot: {
    position: 'absolute',
    right: 0,
    top: '50%',
    zIndex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
});
